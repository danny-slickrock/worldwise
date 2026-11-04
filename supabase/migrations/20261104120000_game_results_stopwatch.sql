-- Pro games run on a STOPWATCH with a personal best (game/bestTimePolicy.js).
-- A personal best needs two facts game_results never stored:
--
--   tier        the INTERACTION tier the round was played at (easy/medium/
--               hard/expert, data/difficulties.js). Distinct from `difficulty`,
--               which is the country-POOL filter learning-path mastery reads —
--               a best on Hard must not be compared with one on Easy.
--   elapsed_ms  how long the round or sitting took, start to finish.
--
-- Both nullable: every row written before this, and every free-game round
-- (no stopwatch), simply has none — and a personal best is derived only from
-- rows that do. Rows are otherwise unchanged, so the leaderboard views, which
-- select named columns, are untouched.
--
-- No grant/RLS change: game_results already grants `authenticated` its owner-
-- only insert/select under the "own results" policy from the M2.1 migration,
-- and new columns ride on both automatically.
alter table public.game_results
  add column tier text
    check (tier is null or tier in ('easy', 'medium', 'hard', 'expert')),
  add column elapsed_ms integer
    check (elapsed_ms is null or elapsed_ms >= 0);
