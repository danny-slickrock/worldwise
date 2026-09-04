-- M2.9 step 4 — the durable per-user daily cap for the AI knowledge hub.
--
-- The in-memory rate limit shipped in step 3 stops one client hammering one
-- Edge isolate. It is not a cost ceiling: isolates recycle, there are several
-- of them, and nothing survives a restart. This table is the actual ceiling —
-- the thing standing between a curious learner and an unbounded Anthropic bill.
--
-- One row per user per UTC day. Counting requests rather than dollars keeps the
-- cap legible to a person ("25 questions a day"), while the token columns give
-- real spend attribution for the cost work in step 7 without a second table.

create table public.ask_usage (
  user_id       uuid    not null references public.profiles (id) on delete cascade,
  -- UTC, deliberately. A local-midnight reset would need a per-user timezone
  -- and would hand anyone who travels a second allowance for the same day.
  usage_date    date    not null default (now() at time zone 'utc')::date,

  request_count integer not null default 0 check (request_count >= 0),

  -- Attribution, not enforcement. The cap is on requests; these make "what did
  -- this actually cost" answerable per user without adding a second table.
  input_tokens  bigint  not null default 0 check (input_tokens >= 0),
  output_tokens bigint  not null default 0 check (output_tokens >= 0),

  updated_at    timestamptz not null default now(),

  primary key (user_id, usage_date)
);

-- "How much has this user spent this month" is the query step 7 will want, and
-- the primary key already orders by user first, so only the date needs help.
create index ask_usage_date_idx on public.ask_usage (usage_date);

-- ---------------------------------------------------------------------------
-- Privileges. The asymmetry here IS the cap.
--
-- A user may READ their own usage — the UI needs to say "3 questions left
-- today", and hiding it would make the limit feel arbitrary. A user may not
-- write it: an UPDATE grant would let anyone reset their own counter to zero
-- and the cap would be decorative. All writes go through the Edge Function
-- using the service role, which bypasses RLS.
--
-- Stated explicitly rather than relying on ambient defaults — a policy without
-- a grant returns "permission denied" on every query (the M2.1 trap).
-- ---------------------------------------------------------------------------
-- The revoke is not belt-and-braces, it is required. Supabase ships
-- `alter default privileges in schema public grant all on tables to anon,
-- authenticated, ...`, so a table created here arrives with INSERT/UPDATE/
-- DELETE already granted to both roles. Without this revoke, only RLS stands
-- between a user and their own counter — and a single mistaken policy later
-- would silently make the cap optional. Take the privilege away, then grant
-- back exactly what is needed.
revoke all on public.ask_usage from anon, authenticated;

grant select on public.ask_usage to authenticated;
grant all    on public.ask_usage to service_role;
-- anon gets nothing: an anonymous caller has no user_id, so there is no row of
-- theirs to read.

alter table public.ask_usage enable row level security;

-- Read-your-own-row, and nothing else. The absence of insert/update/delete
-- policies is the protection: RLS defaults to deny.
create policy "users read their own ask usage"
  on public.ask_usage
  for select
  to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Atomic increment. Doing this as read-then-write from the Edge Function would
-- race: two concurrent questions both read 24, both write 25, and the user gets
-- a free request every time they double-tap. An upsert with an expression makes
-- the increment atomic in Postgres, where it belongs.
--
-- SECURITY DEFINER because it must write a table the caller cannot, and
-- `search_path = ''` so a caller cannot shadow `public` with their own schema —
-- the standard hardening for a definer function.
--
-- Returns the count AFTER incrementing, so the caller compares against the cap
-- with no second round trip.
-- ---------------------------------------------------------------------------
create function public.bump_ask_usage(
  p_user_id       uuid,
  p_input_tokens  bigint default 0,
  p_output_tokens bigint default 0
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  insert into public.ask_usage (user_id, usage_date, request_count, input_tokens, output_tokens)
  values (p_user_id, (now() at time zone 'utc')::date, 1, p_input_tokens, p_output_tokens)
  on conflict (user_id, usage_date) do update
    set request_count = public.ask_usage.request_count + 1,
        input_tokens  = public.ask_usage.input_tokens  + excluded.input_tokens,
        output_tokens = public.ask_usage.output_tokens + excluded.output_tokens,
        updated_at    = now()
  returning request_count into v_count;

  return v_count;
end;
$$;

-- Only the service role may call it, and locking that down takes more than the
-- obvious REVOKE ... FROM PUBLIC.
--
-- This was caught by testing rather than by reading: an early version revoked
-- from PUBLIC only, and `set role authenticated; select bump_ask_usage(...)`
-- still incremented the counter. Supabase's default privileges grant EXECUTE on
-- new public functions directly to `anon` and `authenticated`, and revoking
-- from PUBLIC does not touch a grant held by a named role.
--
-- It matters more here than for the table, because the function is SECURITY
-- DEFINER — RLS does not constrain it at all. Left open, any signed-in user
-- could pass somebody else's uuid and burn a stranger's daily allowance.
revoke all on function public.bump_ask_usage(uuid, bigint, bigint) from public;
revoke all on function public.bump_ask_usage(uuid, bigint, bigint) from anon, authenticated;
grant execute on function public.bump_ask_usage(uuid, bigint, bigint) to service_role;

-- ---------------------------------------------------------------------------
-- Token attribution, recorded separately from the request increment.
--
-- Why two functions rather than one: the cap has to be *reserved before*
-- generation, or two concurrent questions both read "24 used" and both proceed.
-- But token counts only exist *after* the model responds. So the flow is
-- bump_ask_usage() to claim the slot, generate, then this to attribute the
-- cost. Folding them into one call would mean either racing the cap or
-- charging tokens the request never used.
--
-- A failed generation therefore still costs the user a slot. That asymmetry is
-- deliberate: an unfair extra question is a small harm, exceeding the cost
-- ceiling is the one this whole table exists to prevent.
create function public.record_ask_tokens(
  p_user_id       uuid,
  p_input_tokens  bigint,
  p_output_tokens bigint
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.ask_usage
     set input_tokens  = input_tokens  + coalesce(p_input_tokens, 0),
         output_tokens = output_tokens + coalesce(p_output_tokens, 0),
         updated_at    = now()
   where user_id = p_user_id
     and usage_date = (now() at time zone 'utc')::date;
end;
$$;

-- Same lockdown as bump_ask_usage, and for the same reason: Supabase's default
-- privileges hand EXECUTE to anon and authenticated, and revoking from PUBLIC
-- does not take back a grant held by a named role.
revoke all on function public.record_ask_tokens(uuid, bigint, bigint) from public;
revoke all on function public.record_ask_tokens(uuid, bigint, bigint) from anon, authenticated;
grant execute on function public.record_ask_tokens(uuid, bigint, bigint) to service_role;
