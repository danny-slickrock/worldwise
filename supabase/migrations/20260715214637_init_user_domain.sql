-- M2.1 — User domain: accounts & cloud sync.
-- Implements the User domain from docs/phase-2-data-model.md: profiles,
-- user_stats, game_results — plus RLS owner policies and a signup trigger.
--
-- Content (countries, media) deliberately stays out of Postgres for now; see
-- the "two domains, kept apart" principle in the data-model note.

-- ---------------------------------------------------------------------------
-- profiles — one row per player, keyed to the auth user.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  username        text unique,
  display_name    text,
  avatar_url      text,
  -- personalization (M2.8): default difficulty, regions to focus on
  difficulty_pref text not null default 'all',
  focus_regions   text[] not null default '{}',
  settings        jsonb not null default '{}'::jsonb, -- sound, haptics, etc.
  role            text not null default 'player',     -- seam for Phase 3 (teacher/student)
  created_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- user_stats — denormalized running totals; the direct heir of the local
-- progress object in src/game/progress.js. One row per user, bumped as rounds
-- finish. `freezes` mirrors the streak-freeze bank added in Day A, which
-- post-dates the original data-model sketch.
-- ---------------------------------------------------------------------------
create table public.user_stats (
  user_id        uuid primary key references public.profiles (id) on delete cascade,
  xp             integer not null default 0 check (xp >= 0),             -- was progress.xp
  current_streak integer not null default 0 check (current_streak >= 0), -- was progress.streak
  longest_streak integer not null default 0 check (longest_streak >= 0), -- was progress.longestStreak
  best_score     integer not null default 0 check (best_score >= 0),     -- was progress.bestScore
  freezes        integer not null default 0 check (freezes >= 0),        -- was progress.freezes
  last_played_on date,                                                   -- was progress.lastPlayedOn
  updated_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- game_results — append-only log of finished rounds. Aggregates above derive
-- from this; also the source for leaderboards (M2.6) and teacher analytics
-- (Phase 3).
-- ---------------------------------------------------------------------------
create table public.game_results (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  mode       text not null, -- 'flag' | 'capital' | 'capitalReverse' | 'shape' | 'daily' | 'locator'
  difficulty text not null default 'all',
  timed      boolean not null default false,
  score      integer not null check (score >= 0),
  total      integer not null check (total >= 0),
  xp_awarded integer not null check (xp_awarded >= 0),
  daily_date date, -- set only for mode='daily' (one entry per user per day)
  played_at  timestamptz not null default now()
);

create index game_results_user_played_at_idx
  on public.game_results (user_id, played_at desc);

-- One Daily per user per day. Partial, so ordinary modes are unconstrained.
create unique index game_results_user_daily_idx
  on public.game_results (user_id, daily_date)
  where mode = 'daily';

-- ---------------------------------------------------------------------------
-- Table privileges. RLS decides *which rows* a role may touch, but it never
-- grants access to the table itself — without these the API returns "permission
-- denied" on every query. Tables created here are owned by `postgres`, whose
-- default privileges hand anon/authenticated only TRUNCATE/REFERENCES/TRIGGER,
-- so the CRUD grants must be explicit. Granting them here rather than leaning on
-- ambient defaults also keeps the privilege model readable in one place.
--
-- `anon` is deliberately granted nothing: every row in this domain belongs to a
-- signed-in player. That's belt-and-braces with the `to authenticated` policies.
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on public.profiles     to authenticated;
grant select, insert, update, delete on public.user_stats   to authenticated;
grant select, insert, update, delete on public.game_results to authenticated;
-- game_results.id is an identity column, whose sequence rides on the table's
-- INSERT privilege — no separate sequence grant needed.

-- ---------------------------------------------------------------------------
-- Row-Level Security — "a player sees only their own rows", enforced by the
-- database rather than app code. This is the seam Phase 3 extends to
-- "a teacher sees only their class".
-- ---------------------------------------------------------------------------
alter table public.profiles     enable row level security;
alter table public.user_stats   enable row level security;
alter table public.game_results enable row level security;

create policy "own profile" on public.profiles
  for all to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "own stats" on public.user_stats
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "own results" on public.game_results
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Signup trigger — every new auth user gets a profiles + user_stats row, so the
-- client never has to bootstrap them (and can't race itself into a missing row).
-- security definer: the trigger runs as the owner, past the RLS policies above.
-- search_path is pinned to '' so the body can't be hijacked by a caller's path.
-- ---------------------------------------------------------------------------
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'display_name',
      new.raw_user_meta_data ->> 'full_name',
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;

  insert into public.user_stats (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
