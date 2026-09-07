// PURE logic for the Country Locator on the globe (M2.3.7 step 2). No React,
// no SVG — the round's geometry decisions, so they can be tested without a
// renderer.
//
// The roadmap parked this step on a product call: a globe hides half the world,
// so a locator round has to decide where the globe starts. The answer chosen is
// **frame all the candidates** — open oriented so every choice is on the near
// face at once. It does not reveal the answer, because all four are visible;
// it keeps the actual skill, which is telling neighbours apart; and it spares
// a timed round the spin-and-hunt tax that a random orientation would add.
//
// That decision has a prerequisite the flat map never needed. Distractors used
// to be sampled from the whole world, so "Where is Paraguay?" could offer
// Japan and Norway — and no orientation of a sphere shows those together. So
// candidates are now drawn from the answer's geographic neighbourhood, which
// makes the framing possible and, independently, makes the question a real
// test: Paraguay against Bolivia and Uruguay asks something; Paraguay against
// Norway asks only which continent.
import { angleBetween, groupSpin, groupZoom, clampSpin, DEFAULT_SPIN } from "./globeMotion";
// The canonical lng/lat -> unit vector. Imported rather than re-derived: a
// hand-rolled copy here put latitude on the wrong axis, and the resulting
// visibility test rejected sets that were obviously adjacent (Belize with
// Guatemala and Honduras). One implementation, one convention.
import { lngLatToVec } from "./globeProjection";

// How far a distractor may sit from the answer. Wide enough that a round is
// not always the same three neighbours, tight enough that one orientation can
// hold them all: a hemisphere is 90°, and candidates spread beyond ~55° from
// their own midpoint start sliding toward the limb where they foreshorten into
// slivers.
export const MAX_CANDIDATE_SPREAD_DEG = 55;

// Candidates are sampled from the nearest this-many countries rather than the
// nearest three, so repeated rounds on the same answer vary.
export const CANDIDATE_NEIGHBOURHOOD = 12;

// Keep the globe reading as a globe. Without a ceiling, four small neighbours
// would zoom until the sphere's curvature vanished and the surface read as a
// flat map again — losing the thing this step exists to add.
// Raised from 3.2: a tight European cluster needs the extra separation before
// its members become distinguishable shapes rather than a single blob.
export const LOCATOR_MAX_ZOOM = 4.2;
export const LOCATOR_ZOOM_MARGIN = 26;

// Countries nearest `code`, nearest first, excluding itself and anything
// beyond `maxDeg`. The distance cap is the part that matters: without it the
// "nearest 12" to Australia still reaches Cambodia, and the resulting round
// cannot be framed on one face.
export function nearestCodes(
  code,
  centers,
  pool,
  limit = CANDIDATE_NEIGHBOURHOOD,
  maxDeg = MAX_CANDIDATE_SPREAD_DEG
) {
  const origin = centers[code];
  if (!origin) return [];
  const scored = [];
  for (const other of pool) {
    if (other === code) continue;
    const c = centers[other];
    if (!c) continue;
    const d = angleBetween(origin, c);
    if (d > maxDeg) continue;
    scored.push([other, d]);
  }
  scored.sort((a, b) => a[1] - b[1]);
  return scored.slice(0, limit).map(([c]) => c);
}

// Widening steps for isolated countries. Iceland, New Zealand and the Pacific
// island states have almost nobody inside the preferred radius, and a round
// still needs four candidates. Each step stays inside what one face can hold —
// allVisible() allows 82° from the centre, and a group all within 80° of the
// answer keeps its own midpoint comfortably closer than that.
export const CANDIDATE_SPREAD_STEPS = [MAX_CANDIDATE_SPREAD_DEG, 70, 80];

// Choose the round's candidate codes: the answer plus `count` neighbours.
//
// `pick` is injected so the caller owns randomness — the daily round is seeded
// and must stay deterministic, and a test needs to know what it will get.
//
// Widens the radius rather than falling back to the whole world. The earlier
// version fell straight through to a global sample, which produced rounds like
// Australia / New Zealand / Cambodia / Papua New Guinea — four countries no
// orientation of a sphere can show together. An exhaustive check over every
// locator country is what surfaced it.
export function pickCandidateCodes(code, centers, pool, count, pick) {
  for (const maxDeg of CANDIDATE_SPREAD_STEPS) {
    const near = nearestCodes(code, centers, pool, CANDIDATE_NEIGHBOURHOOD, maxDeg);
    if (near.length >= count) return [code, ...pick(near, count)];
  }

  // Nothing within even the widest step: take the genuinely nearest countries
  // whatever their distance, so the round is still playable. locatorView()
  // then falls back to centring on the answer alone.
  const nearest = nearestCodes(code, centers, pool, count, 180);
  const have = new Set([code, ...nearest]);
  const rest = pool.filter((c) => !have.has(c) && centers[c]);
  return [code, ...nearest, ...pick(rest, Math.max(0, count - nearest.length))];
}

// Where the globe should sit so every candidate is visible.
//
// Returns null when no orientation can hold them — which pickCandidateCodes
// makes unlikely but not impossible, since its fallback can reach across the
// world. A null tells the caller to leave the globe where it is rather than
// spin somewhere that still hides a choice.
export function framingFor(codes, centers) {
  const spin = groupSpin(codes, centers);
  if (!spin) return null;

  // Verify rather than assume. groupSpin returns the midpoint of the group; if
  // the group straddles more than a hemisphere, that midpoint still leaves
  // some of them on the far side.
  const centerVec = centers[codes.find((c) => centers[c])];
  if (!centerVec) return null;
  const zoom = Math.min(
    LOCATOR_MAX_ZOOM,
    groupZoom(codes, centers, spin, { margin: LOCATOR_ZOOM_MARGIN, min: 1, max: LOCATOR_MAX_ZOOM })
  );
  return { spin: clampSpin(spin), zoom };
}

// Is every candidate on the near face at this orientation? The projection's own
// isVisible() is the authority at render time; this is the cheap angular test
// the round setup uses to decide whether framing succeeded.
export function allVisible(codes, centers, spin, limitDeg = 82) {
  const origin = lngLatToVec(spin.lng, spin.lat);
  return codes.every((code) => {
    const c = centers[code];
    return c ? angleBetween(origin, c) <= limitDeg : false;
  });
}

// The framing to use for a round, with a safe fallback. Never returns null, so
// a caller always has something to render.
export function locatorView(codes, centers) {
  const framed = framingFor(codes, centers);
  if (framed && allVisible(codes, centers, framed.spin)) return framed;
  // Couldn't hold them all: centre on the answer alone and stay zoomed out, so
  // at least the country being asked about is on screen and the player can spin
  // for the rest.
  const answerOnly = framingFor(codes.slice(0, 1), centers);
  return answerOnly ?? { spin: { ...DEFAULT_SPIN }, zoom: 1 };
}

// What a country should look like on the locator globe.
//
// Returns a semantic name, never a colour: this module stays free of theme
// imports so the pure test suite can drive it, and the component maps names to
// tokens — the same split ragPrompt.js uses for answer tone.
export function locatorFillState(code, { choices = [], correctCode, pickedCode, answered } = {}) {
  const isCandidate = choices.some((c) => (c.code ?? c) === code);
  if (!isCandidate) return "inert";
  if (!answered) return "candidate";
  if (code === correctCode) return "correct";
  if (code === pickedCode) return "wrong";
  // An unpicked, incorrect candidate. Dimmed back to a plain candidate rather
  // than marked wrong: only the choice actually made deserves that.
  return "candidate";
}

// Shrink a tap target so it can never overlap a neighbouring candidate's.
//
// The enlarged hit circles that make tiny countries tappable become a
// correctness bug when the candidates are tiny AND adjacent: Austria, Slovenia,
// Slovakia and Hungary project a few pixels apart, so two 29-unit circles
// overlap and whichever is drawn last captures a tap meant for the other. The
// player would tap the right country and be told they were wrong.
//
// Half the distance to the nearest other candidate is the largest radius that
// cannot overlap. `centers` are this frame's PROJECTED 2D points, so this is
// recomputed as the globe turns.
export function nonOverlappingRadius(center, otherCenters, max) {
  if (!center) return 0;
  let nearest = Infinity;
  for (const other of otherCenters) {
    if (!other || other === center) continue;
    const d = Math.hypot(other[0] - center[0], other[1] - center[1]);
    if (d > 0) nearest = Math.min(nearest, d);
  }
  if (!Number.isFinite(nearest)) return max;
  return Math.max(1, Math.min(max, nearest / 2));
}

// Is a country still too small to see at this zoom?
//
// Angular size is fixed, but apparent size is not: a 3° country at zoom 4 reads
// like a 12° one and needs no marker ring. Ringing it anyway clutters a
// zoomed-in cluster with overlapping circles that hide the very shapes they are
// meant to point at.
export function needsMarker(angularDegrees, zoom, threshold = MARKER_VISIBILITY_DEG) {
  return angularDegrees * zoom < threshold;
}

// Apparent angular size below which a country is effectively invisible.
export const MARKER_VISIBILITY_DEG = 2.4;
