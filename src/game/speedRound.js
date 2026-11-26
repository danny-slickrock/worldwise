// PURE engine for Speed Round (Phase 1 backlog item, step 1 of its own
// checklist): a free, 60-second mixed sprint, scored by a combo multiplier
// rather than a fixed round's score-out-of-N.
//
// Unlike game/marathon.js's two pro sittings, a Speed Round target isn't a
// bare country code to compare with an injected `isMatch` — flag, capital,
// capitalReverse, shape and the rest each already have their own `correct`
// shape (a code, a name, …), exactly like an ordinary buildRound() question.
// So this file never builds questions itself (that stays questions.js's job,
// in a later step) and never decides what counts as a match — it only owns
// the clock and the combo-scoring state machine, taking a plain "was this
// answer right?" boolean the same way QuizScreen already computes one.
//
// TIME IS A PARAMETER, NEVER READ HERE, for the same reason marathon.js
// insists on it: a Date.now() inside this file would make every test either
// slow or flaky, and a sprint is nothing but a clock plus a score.

import {
  SPEED_ROUND_DURATION_MS,
  SPEED_ROUND_COMBO_STEP,
  SPEED_ROUND_COMBO_MAX,
} from "../constants";

export function startSpeedRun(now = 0) {
  return {
    startedAt: now,
    endedAt: null,
    combo: 0,
    bestCombo: 0,
    correct: 0,
    wrong: 0,
    score: 0,
  };
}

export function isSpeedRunOver(run, now) {
  if (!run) return true;
  if (run.endedAt !== null) return true;
  return now - run.startedAt >= SPEED_ROUND_DURATION_MS;
}

export function remainingSpeedMs(run, now) {
  if (!run) return 0;
  return Math.max(0, run.startedAt + SPEED_ROUND_DURATION_MS - now);
}

export function elapsedSpeedMs(run, now) {
  if (!run) return 0;
  const end = run.endedAt ?? now;
  return Math.min(SPEED_ROUND_DURATION_MS, Math.max(0, end - run.startedAt));
}

// The multiplier a streak of `streak` CONSECUTIVE correct answers currently
// earns: +1x every SPEED_ROUND_COMBO_STEP of them, capped at
// SPEED_ROUND_COMBO_MAX. streak=0 (no combo yet, or just broken) is still 1x
// — a combo multiplies the base point, it never zeroes it out.
export function comboMultiplier(streak) {
  return Math.min(SPEED_ROUND_COMBO_MAX, 1 + Math.floor(streak / SPEED_ROUND_COMBO_STEP));
}

// Record one answer and return the next run state. A wrong answer breaks the
// combo back to zero but never ends the run — in a sprint the clock is the
// only thing that ends it, so a miss has to cost the multiplier, not the game.
// Answering after the clock has run out is a no-op, the same contract
// marathon.js's submitAnswer uses for "over".
export function submitSpeedAnswer(run, correct, now = 0) {
  if (!run || isSpeedRunOver(run, now)) return run;
  if (!correct) return { ...run, combo: 0, wrong: run.wrong + 1 };

  const combo = run.combo + 1;
  return {
    ...run,
    combo,
    bestCombo: Math.max(run.bestCombo, combo),
    correct: run.correct + 1,
    // The multiplier that applies to THIS answer is read from the streak
    // including this answer — so the answer that actually crosses a
    // SPEED_ROUND_COMBO_STEP threshold is the one that earns the new rate,
    // not the one after it.
    score: run.score + comboMultiplier(combo),
  };
}

// Stop the clock. Idempotent, the same reason endRun() in marathon.js is —
// a component that ends a run from both a timer and an unmount cannot double
// close it at two different timestamps.
export function endSpeedRun(run, now = 0) {
  if (!run || run.endedAt !== null) return run;
  return { ...run, endedAt: now };
}

// The result of a sitting, for whatever later step renders it (and,
// eventually, persists it — not this step's job).
export function speedRunSummary(run, now = 0) {
  if (!run) {
    return { score: 0, correct: 0, wrong: 0, bestCombo: 0, elapsedMs: 0, accuracy: 0 };
  }
  const total = run.correct + run.wrong;
  return {
    score: run.score,
    correct: run.correct,
    wrong: run.wrong,
    bestCombo: run.bestCombo,
    elapsedMs: elapsedSpeedMs(run, now),
    accuracy: total > 0 ? run.correct / total : 0,
  };
}
