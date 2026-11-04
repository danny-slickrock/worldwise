// PURE personal bests for the Pro games' stopwatch. No React, no storage.
//
// Every Pro game runs on a stopwatch that counts UP (never a countdown), and
// a player competes against their own best. What "best" means:
//
//   · More correct wins. Naming 40 slowly beats naming 20 quickly; no
//     weighting may ever let speed outrank score.
//   · On equal scores, the FASTER time wins.
//
// A best is only comparable with rounds of the same SHAPE, so it is keyed by
// mode + interaction tier + length: 5 Easy currency questions and 40 Hard ones
// are different contests. (A marathon's length is its whole target set.)
//
// Local-first: bests live in a small map on the device (so the "new best!"
// moment works signed out, offline, and the instant a round ends), and are
// re-derived from game_results' tier/elapsed_ms columns for a signed-in player
// so a new device catches up. The two merge per key, best-of-both.

export const NO_BEST = null;

export function bestKey({ mode, tier, total }) {
  return `${mode}|${tier ?? "easy"}|${Number.isFinite(total) ? total : 0}`;
}

// A result as the policy compares it. Anything malformed is not a result.
export function normalizeResult(raw) {
  if (!raw || typeof raw !== "object") return null;
  const score = Number(raw.score);
  const elapsedMs = Number(raw.elapsedMs);
  if (!Number.isFinite(score) || score < 0) return null;
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) return null;
  const total = Number.isFinite(Number(raw.total)) ? Number(raw.total) : 0;
  return { score, total, elapsedMs: Math.round(elapsedMs), at: raw.at ?? null };
}

// Is `a` better than `b`? (b may be null: anything valid beats no best.)
export function isBetter(a, b) {
  const x = normalizeResult(a);
  if (!x) return false;
  const y = normalizeResult(b);
  if (!y) return true;
  if (x.score !== y.score) return x.score > y.score;
  return x.elapsedMs < y.elapsedMs;
}

// Record a finished round against the bests map. Returns the new map (never
// mutates), whether this was a new best, and what it beat — which is what the
// result screen needs for "New best! 1:12, down from 1:31".
//
// A zero-score round is never a "best": an empty run that happened to be fast
// is not an achievement, and celebrating it would cheapen the real thing.
export function recordResult(bests, key, result) {
  const map = bests && typeof bests === "object" ? bests : {};
  const r = normalizeResult(result);
  const previous = normalizeResult(map[key]) ?? NO_BEST;
  if (!r || r.score === 0 || !isBetter(r, previous)) {
    return { bests: map, newBest: false, previous, best: previous };
  }
  return { bests: { ...map, [key]: r }, newBest: true, previous, best: r };
}

// Merge two bests maps (local + cloud-derived), keeping the better per key.
export function mergeBests(a, b) {
  const out = { ...(a ?? {}) };
  for (const [key, value] of Object.entries(b ?? {})) {
    if (isBetter(value, out[key])) out[key] = normalizeResult(value);
  }
  return out;
}

// Derive bests from game_results rows (only rows that carry a stopwatch time).
export function bestsFromRows(rows) {
  let bests = {};
  for (const row of rows ?? []) {
    if (row?.elapsed_ms == null || !row.mode) continue;
    const key = bestKey({ mode: row.mode, tier: row.tier, total: row.total });
    bests = recordResult(bests, key, {
      score: row.score,
      total: row.total,
      elapsedMs: row.elapsed_ms,
      at: row.played_at ?? null,
    }).bests;
  }
  return bests;
}

// m:ss.t under an hour, h:mm:ss beyond. Tenths matter on a stopwatch you are
// racing — two runs a fraction apart should not read as a tie.
export function formatElapsed(ms) {
  const v = Math.max(0, Math.floor(Number(ms) || 0));
  const tenths = Math.floor(v / 100) % 10;
  const s = Math.floor(v / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${sec}`;
  return `${m}:${sec}.${tenths}`;
}

// The elapsed time of a round, from its own start/end stamps — the one place
// a quiz round's stopwatch is read, kept pure like marathon.elapsedMs.
export function roundElapsed(startedAt, endedAt, now) {
  if (!Number.isFinite(startedAt)) return 0;
  const end = Number.isFinite(endedAt) ? endedAt : now;
  return Math.max(0, end - startedAt);
}
