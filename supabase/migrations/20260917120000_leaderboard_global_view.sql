-- M2.6 step 2 — a narrow public-read leaderboard surface.
--
-- `profiles`/`user_stats` are RLS'd owner-only (M2.1): "a player sees only
-- their own rows," full stop. A leaderboard is inherently cross-user, so it
-- needs a new, narrow read surface rather than widening either table's RLS —
-- that would also expose `settings`, `difficulty_pref`, and every raw round.
--
-- This is the global-XP leaderboard only. The Daily Challenge leaderboard
-- (M2.6 step 5) is its own later view, scoped to `game_results` by
-- `daily_date` — folding it in here would make this view answer two
-- different questions.
--
-- A regular view (not `security_invoker`) runs with its OWNER's privileges
-- for RLS purposes, same as the owner of `profiles`/`user_stats` — so it sees
-- every row, which is the whole point: a leaderboard has to look across
-- users. The narrowness is enforced by the view's column list (nothing but
-- `user_id`, `display_name`, `xp` — no email, no settings) and by the grants
-- below, not by RLS.
create view public.leaderboard_global as
select
  p.id           as user_id,
  p.display_name as display_name,
  s.xp           as xp
from public.profiles p
join public.user_stats s on s.user_id = p.id;

-- ---------------------------------------------------------------------------
-- Privileges. Supabase's default privileges grant SELECT on new `public`
-- relations (views included) to `anon` and `authenticated` — the same trap
-- M2.9 hit with EXECUTE on functions. `revoke ... from public` does not take
-- back a grant already held by a named role, so both are revoked explicitly
-- before granting back exactly what's intended.
--
-- `anon` gets nothing: a leaderboard is a signed-in feature, same reasoning
-- M2.1 used for the rest of the user domain. Only `authenticated` can read it.
-- ---------------------------------------------------------------------------
revoke all on public.leaderboard_global from public, anon, authenticated;
grant select on public.leaderboard_global to authenticated;
