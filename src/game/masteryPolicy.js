// PURE learning-path mastery — an earned-progress INDICATOR, never a gate.
//
// Learning paths used to be a ladder: a region's medium countries stayed
// LOCKED until its easy tier was mastered, and hard until medium. That made a
// path a permission system, and it put most of the world behind a wall for a
// new player — the opposite of what a geography product is for. So there is
// no locked state any more. Every country in every path is open and playable
// from the first visit; what this module decides is only how far along you
// are with each one, so the path reads as encouragement and orientation.
//
// Three states, per COUNTRY (not per difficulty tier, as before — rounds now
// capture per-country right/wrong in game_results.countries, so the coarse
// "how did you do at this tier lately" proxy is no longer needed):
//
//   new         never asked about this country yet
//   inProgress  asked, but not yet answered reliably
//   mastered    answered right at least MASTERY_MIN_CORRECT times, at an
//               accuracy of at least MASTERY_ACCURACY
//
// Pure (no RN, no network), so test/engine.test.js drives it directly.
import { MASTERY_MIN_CORRECT, MASTERY_ACCURACY } from "../constants";
import { countryStats } from "./reviewPolicy";

export const NODE_STATES = ["new", "inProgress", "mastered"];

// One country's state and a 0..1 fill toward mastery, from its stats.
export function nodeMastery(stat) {
  if (!stat || !stat.seen) return { state: "new", progress: 0 };
  const accuracy = stat.right / stat.seen;
  if (stat.right >= MASTERY_MIN_CORRECT && accuracy >= MASTERY_ACCURACY) {
    return { state: "mastered", progress: 1 };
  }
  // Progress fills with correct answers, damped by accuracy, so a country you
  // keep getting wrong does not look nearly done. Never shows full while not
  // mastered — "almost" must look different from "done".
  const fill =
    Math.min(1, stat.right / MASTERY_MIN_CORRECT) * Math.min(1, accuracy / MASTERY_ACCURACY);
  return { state: "inProgress", progress: Math.max(0.08, Math.min(0.92, fill)) };
}

// Every node of a path with its state. `results` is game_results rows (or
// anything with a `countries` [{ code, correct }] capture). No history at all
// — a brand-new or signed-out player — means every node is "new", and every
// one is still open.
export function computeNodeStates(path, results) {
  if (!path?.nodes) return [];
  const stats = countryStats(results ?? []);
  return path.nodes.map((node) => ({ ...node, ...nodeMastery(stats.get(node.code)) }));
}

// The region's headline numbers for the progress card.
export function pathProgress(nodes) {
  const counts = { new: 0, inProgress: 0, mastered: 0 };
  for (const n of nodes ?? []) counts[n.state] = (counts[n.state] ?? 0) + 1;
  const total = (nodes ?? []).length;
  return {
    ...counts,
    total,
    explored: counts.inProgress + counts.mastered,
    ratio: total ? counts.mastered / total : 0,
  };
}
