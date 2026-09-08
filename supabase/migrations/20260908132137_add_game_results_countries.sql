-- M2.5 step 6 (collectible sets), part 1 — per-country signal capture.
--
-- Collectible sets ("all of South America") need to know which countries a
-- player has answered correctly, and nothing today records that: game_results
-- logs a round's aggregate score/total, never the countries it touched. Every
-- question type carries a `country` (the target for flag/capital/shape/
-- locator/daily, and the metric's winner for Higher or Lower), so the client
-- can log one { code, correct } pair per answered question without any new
-- table — just a column on the round it already writes.
--
-- No RLS/grant changes needed: adding a column to an existing table doesn't
-- touch either, and the "own results" policy + existing CRUD grant already
-- cover it.
alter table public.game_results
  add column countries jsonb not null default '[]'::jsonb;

comment on column public.game_results.countries is
  'Per-question outcomes for this round, as [{ code, correct }, ...]. Powers M2.5 collectible sets.';
