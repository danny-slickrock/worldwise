// M2.5 step 1: achievement policy — the pure decision layer over the badge
// catalog (src/data/achievements.js), mined entirely from data progress.js
// and game_results already track today. No new schema, no new write path —
// see achievements.js's header for what's deliberately out of scope here.
//
// No React Native or network import, so test/engine.test.js can exercise
// this directly under tsx — same discipline as every other pure game/ module.
import { ACHIEVEMENTS } from "../data/achievements";
import { normalizeProgress } from "./progress";

// `results` is the same { mode, difficulty, score, total } shape
// resultRowFromRound builds — callers can pass game_results rows or local
// round records interchangeably (mirrors masteryPolicy.js's own contract).
function computeMetrics(progress, results) {
  const p = normalizeProgress(progress);
  const rows = Array.isArray(results) ? results : [];
  const roundsPlayed = rows.length;
  const perfectRounds = rows.filter((r) => {
    const total = Number(r?.total) || 0;
    return total > 0 && Number(r.score) === total;
  }).length;
  const modesPlayed = new Set(rows.map((r) => r?.mode).filter(Boolean)).size;
  return { longestStreak: p.longestStreak, roundsPlayed, perfectRounds, modesPlayed };
}

// One entry per catalog achievement, in catalog order, each carrying its
// current metric value, whether it's unlocked, and a 0..1 progress ratio for
// a locked badge's progress bar (already 1 once unlocked).
export function computeAchievements(progress, results) {
  const metrics = computeMetrics(progress, results);
  return ACHIEVEMENTS.map((achievement) => {
    const value = metrics[achievement.metric] ?? 0;
    const unlocked = value >= achievement.threshold;
    const progressRatio = unlocked ? 1 : Math.max(0, Math.min(1, value / achievement.threshold));
    return { ...achievement, value, unlocked, progress: progressRatio };
  });
}
