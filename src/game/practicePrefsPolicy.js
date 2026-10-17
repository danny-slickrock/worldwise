// M2.8 step 1 — pure practice-preferences logic. No RN or network imports,
// so test/engine.test.js can exercise it directly under tsx.
//
// This is "how you want to practice" — which regions to focus on, which
// difficulty tier, and a streak-length goal — sitting beside (never inside)
// M2.3.6's interests, which stay "what you're curious about". Both reuse
// catalogs that already exist rather than inventing new ones: regions come
// from learningPaths.js's LEARNING_PATH_REGIONS, difficulty from
// constants.js's DIFFICULTIES.
import { LEARNING_PATH_REGIONS } from "../data/learningPaths";
import { DIFFICULTIES, DEFAULT_DIFFICULTY, STREAK_GOAL_MIN, STREAK_GOAL_MAX } from "../constants";

const VALID_REGIONS = new Set(LEARNING_PATH_REGIONS);
const VALID_DIFFICULTIES = new Set(DIFFICULTIES.map((d) => d.key));

export const DEFAULT_PRACTICE_PREFS = {
  focusRegions: [], // empty = no focus, draw from every region (today's behavior)
  difficulty: DEFAULT_DIFFICULTY,
  streakGoal: null, // no goal set
};

export function isValidFocusRegion(region) {
  return VALID_REGIONS.has(region);
}

export function isValidPracticeDifficulty(difficulty) {
  return VALID_DIFFICULTIES.has(difficulty);
}

export function isValidStreakGoal(goal) {
  return (
    typeof goal === "number" &&
    Number.isInteger(goal) &&
    goal >= STREAK_GOAL_MIN &&
    goal <= STREAK_GOAL_MAX
  );
}

// Drops unknown regions (an old client may hold a retired one) and dedupes,
// then orders the result by LEARNING_PATH_REGIONS' own order — so two
// selections made in a different pick order always compare equal, the same
// reasoning normalizeInterests() uses.
function normalizeFocusRegions(regions) {
  if (!Array.isArray(regions)) return [];
  const kept = new Set(regions.filter(isValidFocusRegion));
  return LEARNING_PATH_REGIONS.filter((region) => kept.has(region));
}

// Coerce anything read back from storage/cloud into a valid preferences
// object, so a corrupt payload, a missing field, or a retired region/
// difficulty value can never crash the app — unrecognized input falls back
// to DEFAULT_PRACTICE_PREFS' own field, the same defensive shape
// normalizeProgress()/normalizeInterests() already use.
export function normalizePracticePrefs(raw) {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_PRACTICE_PREFS };
  return {
    focusRegions: normalizeFocusRegions(raw.focusRegions),
    difficulty: isValidPracticeDifficulty(raw.difficulty)
      ? raw.difficulty
      : DEFAULT_PRACTICE_PREFS.difficulty,
    streakGoal: isValidStreakGoal(raw.streakGoal) ? raw.streakGoal : null,
  };
}
