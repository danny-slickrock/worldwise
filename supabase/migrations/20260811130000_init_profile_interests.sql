-- M2.3.6 step 3 — profile_interests: the learner-interest signal.
--
-- A join table (user_id, interest_slug) rather than a text[] on profiles:
-- interest-weighted retrieval in M2.9 becomes a plain SQL join, and "how many
-- learners care about X" stays one GROUP BY instead of array gymnastics.
--
-- Slugs are validated client-side against src/data/interests.js
-- (INTEREST_SLUGS) before they ever reach here — see src/game/interestPolicy.js
-- normalizeInterests(), which also drops any slug a client still holds after
-- it's retired from the catalog. No FK to a slugs table: the catalog is code,
-- not data, per that module's own comment ("stable slugs ... never a
-- migration or a data backfill").
create table public.profile_interests (
  user_id       uuid not null references public.profiles (id) on delete cascade,
  interest_slug text not null,
  created_at    timestamptz not null default now(),
  primary key (user_id, interest_slug)
);

-- ---------------------------------------------------------------------------
-- Table privileges — see the M2.1 migration's own comment: RLS decides which
-- rows, but never grants the table itself. Same posture as the rest of the
-- user domain: anon gets nothing, every row belongs to a signed-in player.
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on public.profile_interests to authenticated;

-- ---------------------------------------------------------------------------
-- Row-Level Security — a learner sees and edits only their own interests.
-- ---------------------------------------------------------------------------
alter table public.profile_interests enable row level security;

create policy "own interests" on public.profile_interests
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
