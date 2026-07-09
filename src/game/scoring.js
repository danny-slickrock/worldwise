import { XP } from "../constants";

// Single source of truth for round XP so UI and logic never drift.
export function computeXp(score) {
  const base = score * XP.perCorrect;
  const bonus = Math.max(0, score - XP.strongBonusThreshold) * XP.strongBonusPerCorrect;
  return base + bonus;
}
