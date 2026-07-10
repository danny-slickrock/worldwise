// Pure progress logic — no React or storage imports, so it stays unit-testable.
// The shape saved to disk and held in App state: cumulative XP, current streak,
// and the best single-round score.

export const DEFAULT_PROGRESS = { xp: 0, streak: 0, bestScore: 0 };

// Coerce anything read back from storage into a valid progress object, so a
// corrupt or partial payload can never crash the app or show NaN.
export function normalizeProgress(raw) {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_PROGRESS };
  const num = (v) =>
    typeof v === "number" && isFinite(v) && v >= 0 ? Math.floor(v) : 0;
  return {
    xp: num(raw.xp),
    streak: num(raw.streak),
    bestScore: num(raw.bestScore),
  };
}

// Fold a finished round into the running totals. (Streak simply counts rounds
// for now; calendar-aware streaks are a later roadmap item.)
export function applyRoundResult(progress, { score, xp }) {
  return {
    xp: progress.xp + xp,
    streak: progress.streak + 1,
    bestScore: Math.max(progress.bestScore, score),
  };
}
