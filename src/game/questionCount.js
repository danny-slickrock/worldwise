// PURE — how many questions a round has. No React, no storage.
//
// The free tier always plays ROUND_LENGTH (10). Pro chooses: any whole number
// from QUESTION_COUNT_MIN upward, or "unlimited". Unlimited is NOT Infinity
// handed to the round builder as a count — several pool helpers fill a short
// pool by repeating it, and "repeat until Infinity" never returns. It is a
// distinct value that buildRound() resolves to "every target in this mode's
// pool once", which is what unlimited means to a player anyway.
import { ROUND_LENGTH, QUESTION_COUNT_MIN, QUESTION_COUNT_STEPS } from "../constants";
import { hasFeature } from "./entitlements";

export const UNLIMITED = "unlimited";
const MAX_STEP = QUESTION_COUNT_STEPS[QUESTION_COUNT_STEPS.length - 1];

// Coerce a stored preference into a valid one. Whole numbers clamp into
// [MIN, MAX_STEP]; "unlimited" survives; anything else is the default.
export function normalizeQuestionCount(raw) {
  if (raw === UNLIMITED) return UNLIMITED;
  const n = typeof raw === "string" && raw.trim() !== "" ? Number(raw) : raw;
  if (typeof n !== "number" || !Number.isFinite(n)) return ROUND_LENGTH;
  const whole = Math.round(n);
  return Math.min(MAX_STEP, Math.max(QUESTION_COUNT_MIN, whole));
}

// The round length a player on `tier` actually gets: their preference if the
// tier unlocks the feature, otherwise the fixed default. Infinity stands for
// unlimited here and ONLY here — buildRound() is the one consumer, and it
// turns Infinity into a finite, mode-specific pool size.
export function roundLengthFor(pref, tier) {
  if (!hasFeature("questionCount", tier)) return ROUND_LENGTH;
  const p = normalizeQuestionCount(pref);
  return p === UNLIMITED ? Infinity : p;
}

// The stepper: walk the ladder, with "unlimited" one step past the top. A
// value between rungs (a hand-edited 7) steps to the next rung in that
// direction rather than jumping somewhere surprising.
export function stepQuestionCount(current, direction) {
  const cur = normalizeQuestionCount(current);
  if (direction > 0) {
    if (cur === UNLIMITED) return UNLIMITED;
    return QUESTION_COUNT_STEPS.find((s) => s > cur) ?? UNLIMITED;
  }
  if (cur === UNLIMITED) return MAX_STEP;
  const lower = [...QUESTION_COUNT_STEPS].reverse().find((s) => s < cur);
  return lower ?? QUESTION_COUNT_MIN;
}

export function describeQuestionCount(value) {
  const v = normalizeQuestionCount(value);
  return v === UNLIMITED ? "Unlimited" : `${v} questions`;
}
