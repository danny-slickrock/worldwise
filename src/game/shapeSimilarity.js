// PURE silhouette comparison (M2.12 step 4) — which countries LOOK like each
// other.
//
// Shape Guesser's Expert tier asks about countries you can actually confuse by
// outline, which means the engine needs an answer to "what does this shape
// resemble?" that is not a hand-written list. A hand-written list is the
// obvious alternative and it is worse in the way that matters: it encodes one
// person's guesses, it goes stale the moment the map is regenerated, and
// nobody ever checks it.
//
// The measure, and why each part of it is there:
//
//   1. Take the country's drawn outline (data/worldMap.js pixels).
//   2. Normalize it into its own bounding box. Without this the comparison is
//      dominated by SIZE — every small country would "resemble" every other
//      small country, which is a fact about area, not about shape.
//   3. Rasterize that box to a small occupancy grid.
//   4. Compare two grids by Jaccard index (shared cells / total covered).
//
// Normalizing away size means Chile and Norway score as similar (both long
// thin diagonals), which is exactly the confusion the Expert tier is about.
// Aspect ratio is folded back in as a penalty, because a square-ish country
// stretched to fill a tall box is not really the same shape as a tall one.
//
// Pure: reads only the bundled path data, no React and no network, so the
// whole thing is driven from test/engine.test.js.

import { COUNTRY_PATHS } from "../data/worldMap";
import { SHAPE_GRID, SHAPE_MIN_SIMILARITY } from "../constants";

// Parse an SVG path of the one shape worldMap.js emits — absolute M/L/Z only
// (verified: the generator writes nothing else) — into an array of rings.
export function ringsOf(d) {
  if (typeof d !== "string" || !d) return [];
  const rings = [];
  let current = null;
  // Split on the commands rather than scanning characters: each chunk is a
  // command letter followed by its coordinate pair.
  const tokens = d.match(/[MLZ][^MLZ]*/g) ?? [];
  for (const token of tokens) {
    const cmd = token[0];
    if (cmd === "Z") {
      if (current && current.length >= 3) rings.push(current);
      current = null;
      continue;
    }
    const nums = token
      .slice(1)
      .trim()
      .split(/[\s,]+/)
      .map(Number);
    if (nums.length < 2 || Number.isNaN(nums[0]) || Number.isNaN(nums[1])) continue;
    if (cmd === "M") {
      if (current && current.length >= 3) rings.push(current);
      current = [[nums[0], nums[1]]];
    } else if (current) {
      current.push([nums[0], nums[1]]);
    }
  }
  if (current && current.length >= 3) rings.push(current);
  return rings;
}

function bounds(rings) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const ring of rings) {
    for (const [x, y] of ring) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

// Standard ray-casting, with the even-odd rule — which is what makes a country
// with a hole in it (an enclave) come out right for free, since the generator
// emits the hole as its own ring.
function insideRings(rings, x, y) {
  let inside = false;
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i];
      const [xj, yj] = ring[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
  }
  return inside;
}

// The country's silhouette as a normalized occupancy grid, plus the aspect
// ratio that normalization threw away.
//
// Cells are sampled at their CENTRES. Sampling at corners puts half the
// samples exactly on the bounding box edge, where a coastline runs, and
// ray-casting on a boundary is a coin flip.
export function shapeSignature(code) {
  const rings = ringsOf(COUNTRY_PATHS[code]);
  if (!rings.length) return null;

  const b = bounds(rings);
  if (!(b.width > 0) || !(b.height > 0)) return null;

  const cells = new Uint8Array(SHAPE_GRID * SHAPE_GRID);
  let filled = 0;
  for (let row = 0; row < SHAPE_GRID; row++) {
    for (let col = 0; col < SHAPE_GRID; col++) {
      const x = b.minX + ((col + 0.5) / SHAPE_GRID) * b.width;
      const y = b.minY + ((row + 0.5) / SHAPE_GRID) * b.height;
      if (insideRings(rings, x, y)) {
        cells[row * SHAPE_GRID + col] = 1;
        filled++;
      }
    }
  }
  // A country too small or thin to register on the grid has no usable
  // signature — better to say so than to compare two empty grids and call
  // them identical.
  if (filled === 0) return null;
  return { code, cells, filled, aspect: b.width / b.height };
}

// Built once, on first use rather than at module load: this is ~167 countries
// times a grid of point-in-polygon tests, and nothing on the startup path
// needs it. Only Shape Expert does.
let SIGNATURES = null;
function signatures() {
  if (SIGNATURES) return SIGNATURES;
  SIGNATURES = {};
  for (const code of Object.keys(COUNTRY_PATHS)) {
    const sig = shapeSignature(code);
    if (sig) SIGNATURES[code] = sig;
  }
  return SIGNATURES;
}

// Jaccard over the occupancy grids, penalised by how differently the two
// outlines are proportioned.
//
// The aspect penalty is what stops normalization from overreaching: without
// it, a country stretched to fill its box matches anything else that fills
// its own box the same way, no matter how differently shaped they really are.
// Using the RATIO of the two aspects (rather than their difference) keeps it
// scale-free, so "twice as wide as tall" vs "four times" is penalised the same
// whichever way round the pair is asked.
export function shapeSimilarity(a, b) {
  const sigs = signatures();
  const sa = typeof a === "string" ? sigs[a] : a;
  const sb = typeof b === "string" ? sigs[b] : b;
  if (!sa || !sb) return 0;
  if (sa.code && sa.code === sb.code) return 1;

  let intersection = 0;
  let union = 0;
  for (let i = 0; i < sa.cells.length; i++) {
    const inA = sa.cells[i];
    const inB = sb.cells[i];
    if (inA && inB) intersection++;
    if (inA || inB) union++;
  }
  const overlap = union === 0 ? 0 : intersection / union;

  const ratio = sa.aspect / sb.aspect;
  const aspectAgreement = Math.min(ratio, 1 / ratio); // 1 when identical, →0 as they diverge
  return overlap * aspectAgreement;
}

// The countries whose outlines most resemble this one, best first.
//
// `pool` restricts the search — Expert draws its lookalikes from the same
// pool the question is drawn from, so a round over obscure countries does not
// offer France as the confusable neighbour.
export function similarShapes(code, pool = null, limit = 3) {
  const sigs = signatures();
  if (!sigs[code]) return [];
  const candidates = pool ?? Object.keys(sigs);
  return candidates
    .filter((other) => other !== code && sigs[other])
    .map((other) => ({ code: other, score: shapeSimilarity(code, other) }))
    .sort((x, y) => y.score - x.score)
    .slice(0, limit);
}

// Does this country have anything genuinely confusable with it?
//
// Expert asks about countries you can actually mistake for something else. A
// country with no lookalike at all — an unmistakable outline — is a poor
// Expert target however obscure it is, because the tier's promise is
// "lookalike shapes", not merely "hard countries".
export function hasLookalike(code, pool = null) {
  const best = similarShapes(code, pool, 1)[0];
  return Boolean(best) && best.score >= SHAPE_MIN_SIMILARITY;
}

// Every country in the pool that has a lookalike, best-confusable first. This
// is what Expert samples its targets from.
export function lookalikePool(pool) {
  const sigs = signatures();
  const usable = pool.filter((code) => sigs[code]);
  return usable
    .map((code) => ({ code, best: similarShapes(code, usable, 1)[0]?.score ?? 0 }))
    .filter((entry) => entry.best >= SHAPE_MIN_SIMILARITY)
    .sort((a, b) => b.best - a.best)
    .map((entry) => entry.code);
}
