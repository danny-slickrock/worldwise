// Pure translation between the local progress shape and the Postgres rows in
// docs/phase-2-data-model.md. No storage, network, or React imports — same
// discipline as progress.js, so every rule here is unit-testable in plain Node.
//
//   local (camelCase)            user_stats (snake_case)
//   ------------------------     -----------------------
//   xp                        →  xp
//   streak                    →  current_streak
//   longestStreak             →  longest_streak
//   bestScore                 →  best_score
//   freezes                   →  freezes
//   lastPlayedOn              →  last_played_on
import { normalizeProgress } from "./progress";

// Build the user_stats row for a finished round's totals.
export function statsRowFromProgress(userId, progress) {
  const p = normalizeProgress(progress);
  return {
    user_id: userId,
    xp: p.xp,
    current_streak: p.streak,
    longest_streak: p.longestStreak,
    best_score: p.bestScore,
    freezes: p.freezes,
    last_played_on: p.lastPlayedOn,
    updated_at: new Date().toISOString(),
  };
}

// Read a user_stats row back into the local progress shape. Returns null for a
// missing row so callers can tell "no cloud data yet" from "cloud data is zero".
export function progressFromStatsRow(row) {
  if (!row || typeof row !== "object") return null;
  return normalizeProgress({
    xp: row.xp,
    streak: row.current_streak,
    longestStreak: row.longest_streak,
    bestScore: row.best_score,
    freezes: row.freezes,
    lastPlayedOn: row.last_played_on,
  });
}

// Build the append-only game_results row for one finished round. `today` is a
// YYYY-MM-DD key; daily_date is set only for the Daily, which is what the
// partial unique index keys on to enforce one entry per user per day.
export function resultRowFromRound(userId, round, today) {
  const { mode, difficulty = "all", timed = false, score, total, xp } = round;
  return {
    user_id: userId,
    mode,
    difficulty,
    timed: Boolean(timed),
    score,
    total,
    xp_awarded: xp,
    daily_date: mode === "daily" ? (today ?? null) : null,
  };
}

// Reconcile local progress against an existing cloud row on first sign-in.
// Every total takes the max, so a returning player on a new device can't lose
// their higher numbers; lastPlayedOn takes the later day (YYYY-MM-DD sorts
// lexicographically). Deliberately generous — a merge should never cost
// someone progress they earned, even if it occasionally flatters a streak that
// was built on two devices.
export function mergeProgress(local, cloud) {
  const l = normalizeProgress(local);
  if (!cloud) return l;
  const c = normalizeProgress(cloud);
  return {
    xp: Math.max(l.xp, c.xp),
    streak: Math.max(l.streak, c.streak),
    longestStreak: Math.max(l.longestStreak, c.longestStreak),
    bestScore: Math.max(l.bestScore, c.bestScore),
    freezes: Math.max(l.freezes, c.freezes),
    lastPlayedOn: laterDay(l.lastPlayedOn, c.lastPlayedOn),
  };
}

// The later of two YYYY-MM-DD keys, tolerating either being null.
function laterDay(a, b) {
  if (!a) return b;
  if (!b) return a;
  return a > b ? a : b;
}
