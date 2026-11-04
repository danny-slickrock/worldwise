// M2.4 step 2: mastery policy — the pure decision layer over what
// "demonstrates mastery" means, mined entirely from data game_results
// already tracks today.
//
// game_results logs per-round score/total tagged by mode + difficulty
// (cloudSync.js's resultRowFromRound), not per-country accuracy, so a
// learning-path node can't ask "did you get Brazil right" — the finest signal
// available is "how has this player performed at this difficulty tier
// lately". A node's difficulty tier (learningPaths.js, mirroring
// countries.js) stands in for the node itself: perform well enough across a
// tier's rounds, and every node at that tier counts as demonstrated. No new
// per-country stat, no new migration — this is the "mine it from existing
// round history" branch the roadmap allows.
//
// No React Native or network import, so test/engine.test.js can exercise
// this directly under tsx — same discipline as every other pure game/ module.
import { MASTERY_MIN_ROUNDS, MASTERY_ACCURACY } from "../constants";

const DIFFICULTY_ORDER = ["easy", "medium", "hard"];

// Aggregate accuracy per difficulty tier across a player's round history.
// Rounds played at difficulty "all" (every non-Daily mode's default, and the
// Daily itself) mix every tier together, so they're not a signal for any one
// tier and are left out. `results` is the same { mode, difficulty, score,
// total } shape resultRowFromRound builds — callers can pass game_results
// rows or local round records interchangeably.
function tierStats(results) {
  const stats = {};
  for (const tier of DIFFICULTY_ORDER) stats[tier] = { rounds: 0, correct: 0, total: 0 };
  for (const r of results ?? []) {
    const stat = stats[r?.difficulty];
    const total = Number(r?.total) || 0;
    if (!stat || total <= 0) continue;
    stat.rounds += 1;
    stat.correct += Number(r.score) || 0;
    stat.total += total;
  }
  return stats;
}

function isTierMastered(stat) {
  return Boolean(stat) && stat.rounds >= MASTERY_MIN_ROUNDS && stat.correct / stat.total >= MASTERY_ACCURACY;
}

// Node states for one learning path, given a player's round history. A node
// unlocks once every easier tier is mastered (the first tier has no
// prerequisite, so its nodes start unlocked), and becomes mastered once its
// own tier is.
export function computeNodeStates(path, results) {
  if (!path?.nodes) return [];
  const stats = tierStats(results);
  const masteredTier = {};
  for (const tier of DIFFICULTY_ORDER) masteredTier[tier] = isTierMastered(stats[tier]);

  return path.nodes.map((node) => {
    const rank = DIFFICULTY_ORDER.indexOf(node.difficulty);
    const prereqsMet = rank <= 0 || DIFFICULTY_ORDER.slice(0, rank).every((tier) => masteredTier[tier]);
    const state = !prereqsMet ? "locked" : masteredTier[node.difficulty] ? "mastered" : "unlocked";
    return { ...node, state };
  });
}
