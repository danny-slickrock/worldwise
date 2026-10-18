-- M2.8 step 2 — the one personalization field `profiles` didn't already
-- carry. `difficulty_pref`/`focus_regions` were seeded into `profiles` back
-- in M2.1 as a deliberate seam for this milestone (see
-- docs/phase-2-data-model.md); only a streak-length goal is genuinely new,
-- since Phase 1 never tracked one.
--
-- No grant/RLS change needed: `profiles` already grants full CRUD to
-- `authenticated` and already carries the "own profile" `auth.uid() = id`
-- policy from the M2.1 migration, and a new column on an existing table
-- rides on both automatically.
alter table public.profiles
  add column streak_goal integer
    check (streak_goal is null or streak_goal between 1 and 365);
