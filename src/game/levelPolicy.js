// M2.5 step 5: the XP leveling curve, surfaced alongside the achievement
// badges. Pure — no React Native or network import, so test/engine.test.js
// can exercise it directly under tsx, same discipline as achievementPolicy.js.
import { LEVEL_XP_BASE, LEVEL_XP_GROWTH } from "../constants";

// Safety cap on the climb loop below. At LEVEL_XP_GROWTH > 1 the per-level
// cost grows fast enough that this is never reached by any realistic XP
// total — it just keeps a corrupt/huge value from looping unbounded.
const MAX_LEVEL = 200;

// Derive a player's level from cumulative XP. Level 1 starts at 0 XP; each
// level's cost is LEVEL_XP_BASE * LEVEL_XP_GROWTH^(level - 2) (level 2 costs
// exactly LEVEL_XP_BASE). Returns the current level, XP banked toward the
// next one, the next level's full cost, and a 0..1 progress ratio for a bar.
export function computeLevel(xp) {
  const totalXp = typeof xp === "number" && isFinite(xp) && xp > 0 ? Math.floor(xp) : 0;

  let level = 1;
  let xpAtLevelStart = 0;
  let cost = LEVEL_XP_BASE;
  while (level < MAX_LEVEL && totalXp >= xpAtLevelStart + cost) {
    xpAtLevelStart += cost;
    level += 1;
    cost = Math.round(cost * LEVEL_XP_GROWTH);
  }

  const xpIntoLevel = totalXp - xpAtLevelStart;
  const xpForNextLevel = cost;
  const progress = xpForNextLevel > 0 ? Math.max(0, Math.min(1, xpIntoLevel / xpForNextLevel)) : 1;

  return { level, xp: totalXp, xpIntoLevel, xpForNextLevel, progress };
}
