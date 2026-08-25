// M2.4 step 1: the learning-path content model. A path walks one region
// broad-to-specific — the region as a whole, then its countries ordered
// easiest → hardest — so working through it teaches general-to-specific,
// the mastery direction the milestone describes (hemisphere → continent →
// region → country runs the same way: start broad, narrow as mastery grows).
//
// Entirely derived from countries.js's existing `region` + `difficulty`
// fields, so all five paths land at once instead of one hand-authored hero
// like M2.2's Brazil — there's no new content to write here, just an
// ordering rule over what already exists.
//
// No React Native or network import, so test/engine.test.js can exercise
// this directly under tsx — same discipline as every other data/ module.
import { COUNTRIES } from "./countries";

// The same five regions countries.js/countryIndex.js/mapRegions.js already
// group countries into. Each of those hardcodes its own copy rather than
// sharing one export, so this follows that existing pattern instead of
// introducing a new data/ → game/ dependency.
export const LEARNING_PATH_REGIONS = ["Africa", "Americas", "Asia", "Europe", "Oceania"];

const DIFFICULTY_RANK = { easy: 0, medium: 1, hard: 2 };

function nodesForRegion(region) {
  return COUNTRIES.filter((c) => c.region === region)
    .map((c) => ({ code: c.code, name: c.name, difficulty: c.difficulty }))
    .sort((a, b) => {
      const rank = DIFFICULTY_RANK[a.difficulty] - DIFFICULTY_RANK[b.difficulty];
      return rank !== 0 ? rank : a.name.localeCompare(b.name);
    });
}

// One path per region, in LEARNING_PATH_REGIONS' own order, built once at
// module load — cheap over 196 countries and never changes at runtime, the
// same pattern ExploreMap uses for its precomputed hit targets.
export const LEARNING_PATHS = LEARNING_PATH_REGIONS.map((region) => ({
  id: region.toLowerCase(),
  region,
  nodes: nodesForRegion(region),
}));

// Pure accessor, mirroring getCountryPage(code)'s null-for-unknown contract.
export function getLearningPath(id) {
  return LEARNING_PATHS.find((p) => p.id === id) ?? null;
}
