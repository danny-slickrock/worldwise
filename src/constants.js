// Central place for tunable game parameters — keep gameplay numbers out of components.
export const ROUND_LENGTH = 8; // questions per single-mode round
export const DAILY_LENGTH = 6; // questions in the Daily Challenge
export const OPTIONS_PER_QUESTION = 4; // total answer choices (1 correct + distractors)

// Difficulty tiers a player can pick before a round. "all" draws from every
// country regardless of tier; the others filter the target pool (see questions.js).
export const DIFFICULTIES = [
  { key: "all", label: "All" },
  { key: "easy", label: "Easy" },
  { key: "medium", label: "Medium" },
  { key: "hard", label: "Hard" },
];
export const DEFAULT_DIFFICULTY = "all";

// XP awarded at the end of a round.
export const XP = {
  perCorrect: 10,
  strongBonusThreshold: 4, // correct answers above this earn a bonus
  strongBonusPerCorrect: 5,
};
