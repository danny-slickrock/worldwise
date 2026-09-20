-- M2.6 step 5.1 — a narrow public-read Daily Challenge leaderboard surface.
--
-- Mirrors step 2's leaderboard_global (20260917120000): profiles/game_results
-- stay owner-only RLS'd (M2.1), so a cross-user read needs its own narrow
-- view rather than widening either table's policy. A plain (non-
-- `security_invoker`) view runs with its OWNER's privileges for RLS
-- purposes, same as leaderboard_global, which is the whole point: a
-- leaderboard has to look across users.
--
-- docs/phase-2-data-model.md's original sketch filters "daily_date =
-- current_date" inside the view. That's the DATABASE server's calendar day
-- (Postgres's `current_date` reads the session's own timezone), while
-- game_results.daily_date is stamped from the PLAYER's own clock
-- (src/game/progress.js's dayKey() — "the player's own clock, which is what
-- a streak should track"). Filtering by the server's `current_date` would
-- show a New Zealand player's Daily leaderboard to someone in Los Angeles
-- for several real hours of mismatch every day, in both directions. So this
-- view exposes `daily_date` as a column instead of filtering on it, and the
-- IO layer (M2.6 step 5.3) filters by the same dayKey() string the client
-- already used to WRITE daily_date — the two sides agree by construction,
-- the same reasoning cloudSync.js's resultRowFromRound() already leans on.
--
-- Narrow the same way leaderboard_global is narrow: the column list carries
-- nothing off `profiles` beyond a display name, and nothing off
-- `game_results` beyond the one comparable number (`score` — every Daily
-- round is DAILY_LENGTH questions for everyone, so it needs no
-- normalization the way a mixed-length round would).
create view public.leaderboard_daily as
select
  p.id           as user_id,
  p.display_name as display_name,
  g.daily_date   as daily_date,
  g.score        as score
from public.game_results g
join public.profiles p on p.id = g.user_id
where g.mode = 'daily';

-- ---------------------------------------------------------------------------
-- Privileges — same trap and same fix as leaderboard_global: Supabase's
-- default privileges grant SELECT on new `public` relations (views
-- included) to `anon` and `authenticated`. `revoke ... from public` does not
-- take back a grant already held by a named role, so both are revoked
-- explicitly before granting back exactly what's intended.
--
-- `anon` gets nothing: a leaderboard is a signed-in feature, same reasoning
-- M2.1 used for the rest of the user domain.
-- ---------------------------------------------------------------------------
revoke all on public.leaderboard_daily from public, anon, authenticated;
grant select on public.leaderboard_daily to authenticated;
