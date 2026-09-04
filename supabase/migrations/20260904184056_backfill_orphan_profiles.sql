-- Backfill: give every pre-existing auth user a profiles + user_stats row.
--
-- Why this exists. public.handle_new_user() fires on INSERT into auth.users, so
-- it only ever serves *new* signups. The user-domain migration
-- (20260715214637) did not actually reach the live project until 2026-09-04 —
-- the remote migration history table was empty and public held no tables — so
-- every auth.users row created before that push exists with no profiles row
-- behind it.
--
-- That is not a cosmetic gap. user_stats, game_results and profile_interests
-- all reference profiles(id), so a missing profiles row makes every cloud write
-- fail with 23503 ("Key is not present in table profiles"). Confirmed in
-- production on 2026-09-04: a finished round POSTed user_stats, got 409, and
-- saveRoundResult() returned early without ever attempting the game_results
-- insert. The player still saw "+55 XP" on screen, because a failed sync is
-- deliberately swallowed so it can't interrupt play — which is exactly why this
-- went unnoticed.
--
-- Idempotent by construction: both inserts are ON CONFLICT DO NOTHING, so this
-- is safe to re-run, safe on a fresh database where auth.users is empty, and
-- safe alongside the trigger (which may have already created a row for anyone
-- who signed up after the push).

-- profiles first — user_stats.user_id references it, so the order matters.
-- The display_name coalesce chain mirrors handle_new_user() exactly, so a
-- backfilled row is indistinguishable from a trigger-created one.
insert into public.profiles (id, display_name)
select u.id,
       coalesce(u.raw_user_meta_data ->> 'display_name',
                u.raw_user_meta_data ->> 'full_name',
                split_part(u.email, '@', 1))
from auth.users u
on conflict (id) do nothing;

-- user_stats takes its column defaults (all zeros, null last_played_on), the
-- same as the trigger. A returning player's real totals are then folded in by
-- migrateLocalToCloud(), which max-merges local against cloud rather than
-- overwriting — so seeding zeros here cannot cost anyone progress.
insert into public.user_stats (user_id)
select id from auth.users
on conflict (user_id) do nothing;
