// PURE marathon run logic (M2.12 step 7) — the engine behind the two pro
// games: Name Every Country, and Identify All Flags (step 8).
//
// A marathon is not a longer round. A round is a fixed 8 questions with a
// score out of 8; a marathon is a single timed sitting where the question is
// "how many can you get?", which changes three things:
//
//   · The run ends on the CLOCK, not on a question count.
//   · The score is a count, so it is comparable between sittings — which is
//     what makes it leaderboard-friendly (M2.6) rather than just another XP
//     number.
//   · A wrong answer costs time, not a mark out of eight. There is no "6/8"
//     to report, so being wrong has to mean something else or it means nothing.
//
// TIME IS A PARAMETER, NEVER READ HERE. Every function that cares about the
// clock takes `now`. That is what makes a timed game testable at all: the
// suite can run a whole five-minute sitting in a millisecond, and the
// component owns the one real interval. A Date.now() inside this file would
// make every test either slow or flaky.
//
// Two run SHAPES, because the tiers genuinely differ:
//   prompted  the game names a target and you answer it, one at a time
//             (Easy, Medium, Hard — and every tier of step 8's flag game).
//   recall    nothing is named; you produce countries from memory in any
//             order and the run matches each against what is left (Expert).
// They share the clock, the scoring and the end conditions; only how a target
// is chosen differs.

import {
  MARATHON_DURATION_MS,
  MARATHON_POINTS_PER_FIND,
  MARATHON_SPEED_BONUS_MAX,
} from "../constants";

export const RUN_SHAPES = { prompted: "prompted", recall: "recall" };

// Which shape each tier plays in. Expert is the only free-recall tier: its
// whole premise is a blank map and no prompt, which is a different game loop
// rather than a harder version of the same one.
const TIER_SHAPES = {
  easy: RUN_SHAPES.prompted,
  medium: RUN_SHAPES.prompted,
  hard: RUN_SHAPES.prompted,
  expert: RUN_SHAPES.recall,
};

export const runShape = (tier) => TIER_SHAPES[tier] ?? RUN_SHAPES.prompted;

// Start a sitting.
//
// `targets` is the full set in the order they will be asked (the caller
// shuffles — randomness stays outside, the same contract
// buildHigherLowerQuestion uses, so a seeded run stays reproducible).
export function startRun({
  tier = "easy",
  targets = [],
  now = 0,
  durationMs = MARATHON_DURATION_MS,
}) {
  return {
    tier,
    shape: runShape(tier),
    targets: [...targets],
    // Indexes into `targets` for the prompted shape. Recall runs ignore it.
    index: 0,
    found: [],
    missed: [],
    startedAt: now,
    durationMs,
    endedAt: null,
  };
}

export function remainingMs(run, now) {
  if (!run) return 0;
  if (run.endedAt !== null) return Math.max(0, run.startedAt + run.durationMs - run.endedAt);
  return Math.max(0, run.startedAt + run.durationMs - now);
}

export function elapsedMs(run, now) {
  if (!run) return 0;
  const end = run.endedAt ?? now;
  return Math.max(0, Math.min(end - run.startedAt, run.durationMs));
}

// Is the sitting over? Two ways, and both matter:
//   · the clock ran out
//   · there is nothing left to ask — you actually named every country, which
//     is the achievement the game is named after
export function isOver(run, now) {
  if (!run) return true;
  if (run.endedAt !== null) return true;
  if (remainingMs(run, now) <= 0) return true;
  // A prompted run ends when every target has been SHOWN, not when every
  // target has been found. Asking "is anything still unfound?" leaves a run
  // that missed a few questions running forever with nothing left to ask.
  if (run.shape === RUN_SHAPES.prompted) return run.index >= run.targets.length;
  return remaining(run).length === 0;
}

// What is still unnamed. Derived rather than stored, so it cannot drift out of
// step with `found` — the bug that would let a country be scored twice.
export function remaining(run) {
  if (!run) return [];
  const done = new Set(run.found);
  return run.targets.filter((t) => !done.has(t));
}

// The target currently being asked, or null on a recall run (where there is no
// single target by design) and on a finished one.
export function currentTarget(run, now = run?.startedAt ?? 0) {
  if (!run || run.shape === RUN_SHAPES.recall) return null;
  if (isOver(run, now)) return null;
  return run.targets[run.index] ?? null;
}

// Record an answer and return the NEXT run state plus what happened.
//
// `isMatch` is injected rather than imported: a prompted tier compares codes,
// a typed tier goes through answerMatch.js, and the flag game compares
// something else again. Keeping the comparison out of here is what lets step 8
// reuse this file without touching it.
//
// Returns { run, outcome, target }. `outcome` is "correct" | "wrong" |
// "duplicate" | "over" — duplicate is its own state because on a recall run,
// naming a country you already found is a very different event from naming a
// wrong one, and must not be punished as a miss.
export function submitAnswer(run, value, { now = 0, isMatch } = {}) {
  if (!run || isOver(run, now)) return { run, outcome: "over", target: null };

  if (run.shape === RUN_SHAPES.recall) {
    const alreadyFound = run.found.find((code) => isMatch(value, code));
    if (alreadyFound) return { run, outcome: "duplicate", target: alreadyFound };

    const hit = remaining(run).find((code) => isMatch(value, code));
    if (!hit) {
      // A recall miss is recorded but does not consume a target — there was no
      // target. `missed` here is a list of wrong guesses, which is what the
      // results screen needs to say "you tried X, which isn't one".
      return { run: { ...run, missed: [...run.missed, value] }, outcome: "wrong", target: null };
    }
    return { run: { ...run, found: [...run.found, hit] }, outcome: "correct", target: hit };
  }

  const target = currentTarget(run, now);
  if (!target) return { run, outcome: "over", target: null };

  const right = isMatch(value, target);
  const next = {
    ...run,
    index: run.index + 1,
    found: right ? [...run.found, target] : run.found,
    missed: right ? run.missed : [...run.missed, target],
  };
  return { run: next, outcome: right ? "correct" : "wrong", target };
}

// Skip the current target without answering (prompted runs only). It counts as
// missed: in a timed game, skipping is a legitimate strategy and pretending it
// costs nothing would make the score meaningless.
export function skipTarget(run, now = 0) {
  if (!run || run.shape === RUN_SHAPES.recall || isOver(run, now)) return run;
  const target = currentTarget(run, now);
  if (!target) return run;
  return { ...run, index: run.index + 1, missed: [...run.missed, target] };
}

// Stop the clock. Idempotent, so a component that ends a run from both a timer
// and an unmount cannot double-close it at two different timestamps.
export function endRun(run, now = 0) {
  if (!run || run.endedAt !== null) return run;
  return { ...run, endedAt: now };
}

// The result of a sitting.
//
// `found` is the headline and the leaderboard key; `elapsedMs` is the
// tiebreak, which is the only honest way round — naming 40 countries slowly
// beats naming 20 quickly, and no weighting of the two should ever let it be
// otherwise. So the speed bonus is applied ONLY to a completed run, where
// everybody's count is identical and time is the only thing left to compare.
export function marathonScore(run, now = 0) {
  if (!run) return { found: 0, total: 0, missed: 0, elapsedMs: 0, completedAll: false, score: 0 };

  const found = run.found.length;
  const total = run.targets.length;
  const elapsed = elapsedMs(run, now);
  const completedAll = total > 0 && found === total;

  // Proportional to how much of the clock was left, capped. A run that ends on
  // the buzzer earns none of it.
  const speedBonus = completedAll
    ? Math.round(MARATHON_SPEED_BONUS_MAX * (1 - Math.min(1, elapsed / run.durationMs)))
    : 0;

  return {
    found,
    total,
    missed: run.missed.length,
    elapsedMs: elapsed,
    completedAll,
    score: found * MARATHON_POINTS_PER_FIND + speedBonus,
    speedBonus,
  };
}

// How a run is compared to another for a leaderboard: more found wins, and a
// tie is broken by the faster sitting. Returns the usual negative/zero/
// positive so it drops straight into sort().
export function compareRuns(a, b) {
  if (a.found !== b.found) return b.found - a.found;
  return a.elapsedMs - b.elapsedMs;
}
