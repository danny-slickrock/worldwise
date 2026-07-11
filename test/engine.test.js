// Pure-logic tests for the quiz engine. Run with: npm test  (uses tsx)
// No React Native imports here, so it runs fast in plain Node via tsx.
import { COUNTRIES } from "../src/data/countries";
import { buildRound, buildDaily } from "../src/game/questions";
import { computeXp } from "../src/game/scoring";
import { applyRoundResult, normalizeProgress, DEFAULT_PROGRESS } from "../src/game/progress";
import { OPTIONS_PER_QUESTION, DIFFICULTIES, ROUND_LENGTH } from "../src/constants";

let fails = 0;
const check = (cond, msg) => {
  if (cond) {
    console.log("  ✓", msg);
  } else {
    console.log("  ✗", msg);
    fails++;
  }
};

console.log("Dataset");
const codes = new Set(COUNTRIES.map((c) => c.code));
check(codes.size === COUNTRIES.length, "country codes are unique");
check(
  COUNTRIES.every((c) => c.code && c.name && c.capital && c.region),
  "every country has code, name, capital, region"
);
check(COUNTRIES.length >= 40, `dataset has >= 40 countries (${COUNTRIES.length})`);
check(COUNTRIES.length === 196, `dataset has all 196 countries (${COUNTRIES.length})`);

const validTiers = new Set(["easy", "medium", "hard"]);
check(
  COUNTRIES.every((c) => validTiers.has(c.difficulty)),
  "every country has a valid difficulty tier (easy/medium/hard)"
);
for (const tier of ["easy", "medium", "hard"]) {
  const n = COUNTRIES.filter((c) => c.difficulty === tier).length;
  check(n >= ROUND_LENGTH, `"${tier}" tier has enough countries for a full round (${n})`);
}

console.log("Rounds");
for (const mode of ["flag", "capital", "shape"]) {
  const round = buildRound(mode);
  check(round.length === 8, `${mode}: default round length is 8`);
  for (const q of round) {
    check(q.options.length === OPTIONS_PER_QUESTION, `${mode}: ${OPTIONS_PER_QUESTION} options`);
    check(new Set(q.options).size === q.options.length, `${mode}: options are unique`);
    check(q.options.includes(q.correct), `${mode}: correct answer is among options`);
    break; // one representative question per mode keeps output readable
  }
}

console.log("Difficulty");
for (const { key } of DIFFICULTIES) {
  for (const mode of ["flag", "capital", "shape"]) {
    const round = buildRound(mode, key);
    check(round.length === ROUND_LENGTH, `${mode}/${key}: round length is ${ROUND_LENGTH}`);
    if (key !== "all") {
      check(
        round.every((q) => q.country.difficulty === key),
        `${mode}/${key}: every question targets a "${key}" country`
      );
    }
  }
}

// Shape questions must only ever target countries that have a map outline.
// Sample many rounds so a stray outline-less pick can't slip through by luck.
let shapeBad = 0;
for (let i = 0; i < 200; i++) {
  for (const q of buildRound("shape")) if (q.country.noOutline) shapeBad++;
}
check(shapeBad === 0, "shape rounds never target a country without an outline");

// The Daily can assign a shape slot to an outline-less country; when it does,
// it must fall back to a non-shape type rather than render a broken outline.
let dailyShapeBad = 0;
for (let day = 1; day <= 28; day++) {
  for (const q of buildDaily(6, new Date(2026, 0, day))) {
    if (q.type === "shape" && q.country.noOutline) dailyShapeBad++;
  }
}
check(dailyShapeBad === 0, "daily never renders a shape for an outline-less country");

console.log("Daily challenge");
const d = new Date(2026, 6, 8);
const a = buildDaily(6, d).map((q) => q.country.code + ":" + q.correct).join("|");
const b = buildDaily(6, d).map((q) => q.country.code + ":" + q.correct).join("|");
check(a === b, "daily challenge is deterministic for a fixed date");
check(buildDaily(6, d).length === 6, "daily has 6 questions");

console.log("Progress");
check(
  applyRoundResult({ xp: 10, streak: 1, bestScore: 5 }, { score: 7, xp: 80 }).xp === 90,
  "applyRoundResult accumulates xp"
);
check(
  applyRoundResult({ xp: 0, streak: 2, bestScore: 8 }, { score: 3, xp: 0 }).streak === 3,
  "applyRoundResult increments streak each round"
);
check(
  applyRoundResult({ xp: 0, streak: 0, bestScore: 8 }, { score: 3, xp: 0 }).bestScore === 8,
  "applyRoundResult keeps the higher best score"
);
check(
  applyRoundResult({ xp: 0, streak: 0, bestScore: 2 }, { score: 6, xp: 0 }).bestScore === 6,
  "applyRoundResult raises best score to a new high"
);
check(
  normalizeProgress(null).xp === 0 && normalizeProgress(undefined).streak === 0,
  "normalizeProgress falls back to defaults for missing data"
);
check(
  normalizeProgress({ xp: -5, streak: "x", bestScore: 3.9 }).bestScore === 3 &&
    normalizeProgress({ xp: -5 }).xp === 0,
  "normalizeProgress coerces bad/negative values"
);
check(
  DEFAULT_PROGRESS.xp === 0 && DEFAULT_PROGRESS.streak === 0 && DEFAULT_PROGRESS.bestScore === 0,
  "DEFAULT_PROGRESS starts at zero"
);

console.log("Scoring");
check(computeXp(0) === 0, "0 correct => 0 XP");
check(computeXp(4) === 40, "4 correct => 40 XP (no bonus)");
check(computeXp(8) === 80 + 20, "8 correct => 100 XP (with strong-round bonus)");

console.log(fails ? `\nFAILED (${fails})` : "\nAll engine tests passed ✓");
process.exit(fails ? 1 : 0);
