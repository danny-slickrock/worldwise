// Orthographic globe projection (M2.3.7). PURE — no RN, no network, no React —
// so test/engine.test.js exercises every rule here directly under tsx. Same
// discipline as mapZoom.js/mapRegions.js, which this replaces for the globe.
//
// WHY ORTHOGRAPHIC. An orthographic projection *is* what a sphere looks like
// from far away: it's the honest 2D shadow of a 3D globe. That buys the globe
// look while keeping every country a real SVG <Path> — so tap hit-testing,
// theme fills, and crisp vector borders all survive unchanged. Nothing here
// draws; it turns (country ring, orientation) into screen points and hands
// them back.
//
// THE COORDINATE STORY, once, so nothing downstream has to re-derive it:
//   1. data/worldMap.js stores *pre-projected* equirectangular pixels
//      (x = (lng+180)*2, y = (90-lat)*2). That map is linear, so it inverts
//      exactly — see ringsFromPath(). No new map asset was needed for any of
//      this; the sphere was recoverable from what shipped on Day 4.
//   2. Each lng/lat becomes a UNIT 3D VECTOR once, at module load. Rotation is
//      then a handful of multiplies per point per frame, and — the part that
//      actually matters — the great circle between two points is just
//      normalize(lerp(a, b)), which is what makes horizon clipping tractable.
//   3. Per frame, each vector is rotated so the viewer's chosen (lng, lat) faces
//      front. `z > 0` means the point is on the near face. Screen position is
//      simply x and y, scaled — dropping z is exactly what "orthographic" means.

// A point is on the visible hemisphere when it's on the viewer's side of the
// plane through the globe's center. Sitting exactly on the horizon (z === 0)
// counts as hidden, so a limb-grazing point can't emit a zero-length arc.
export const isVisible = (z) => z > 0;

// lng/lat (degrees) -> unit vector. x points at (0°E, 0°N), z at the north pole.
export function lngLatToVec(lng, lat) {
  const l = (lng * Math.PI) / 180;
  const p = (lat * Math.PI) / 180;
  const cp = Math.cos(p);
  return [cp * Math.cos(l), cp * Math.sin(l), Math.sin(p)];
}

// The viewer's orientation, precomputed once per frame rather than per point:
// at 8k points a repeated sin/cos would dominate the whole projection.
export function orientation(lng, lat) {
  const l = (lng * Math.PI) / 180;
  const p = (lat * Math.PI) / 180;
  return { sinL: Math.sin(l), cosL: Math.cos(l), sinP: Math.sin(p), cosP: Math.cos(p) };
}

// Rotate a world-space vector into view space, where +x is screen-right,
// +y is screen-up, and +z points at the viewer.
export function rotate([x, y, z], o) {
  const east = y * o.cosL - x * o.sinL; // component along the rotated equator
  const front = x * o.cosL + y * o.sinL; // component toward the view meridian
  return [east, o.cosP * z - o.sinP * front, o.sinP * z + o.cosP * front];
}

// View space -> screen. SVG's y grows downward while view-space y grows up,
// hence the flip; radius and center come from the caller's layout.
export function toScreen([x, y], { cx, cy, radius }) {
  return [cx + radius * x, cy - radius * y];
}

// The great-circle point where the segment a->b crosses the horizon (z = 0).
// Bisection on normalize(lerp()) rather than a closed form: it's exact enough
// at 14 iterations (~6e-5 of the arc), and it cannot produce a NaN for the
// near-antipodal pairs a closed form has to special-case.
export function horizonCrossing(a, b, o) {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 14; i++) {
    const mid = (lo + hi) / 2;
    const v = rotate(normalize(lerp(a, b, mid)), o);
    if (isVisible(v[2])) lo = mid;
    else hi = mid;
  }
  return rotate(normalize(lerp(a, b, (lo + hi) / 2)), o);
}

function lerp(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function normalize([x, y, z]) {
  const len = Math.hypot(x, y, z) || 1;
  return [x / len, y / len, z / len];
}

// Walk the limb (the globe's silhouette circle) from one horizon point to
// another, so a country straddling the terminator closes along the edge of the
// disc instead of across it. Without this, half of Russia draws a chord
// straight through the Pacific.
//
// Always takes the SHORT way around. That is correct for every real country —
// the widest, Russia, spans well under a hemisphere of limb — and a country
// that genuinely wrapped the long way would need winding-order analysis this
// deliberately doesn't do.
export function limbArc(from, to, view, stepDegrees = 3) {
  const a0 = Math.atan2(from[1], from[0]);
  const a1 = Math.atan2(to[1], to[0]);
  let delta = a1 - a0;
  while (delta > Math.PI) delta -= 2 * Math.PI;
  while (delta < -Math.PI) delta += 2 * Math.PI;

  const steps = Math.max(1, Math.ceil(Math.abs(delta) / ((stepDegrees * Math.PI) / 180)));
  const points = [];
  for (let i = 1; i < steps; i++) {
    const a = a0 + (delta * i) / steps;
    points.push(toScreen([Math.cos(a), Math.sin(a)], view));
  }
  return points;
}

// Project one ring of unit vectors into screen points for the current
// orientation, clipped to the visible hemisphere.
//
// Returns null when the ring is entirely on the far side — the caller skips it,
// which is what makes the back of the globe genuinely empty rather than drawn
// inside-out. A ring that only partly faces us gets its crossings inserted and
// the gap closed along the limb.
export function projectRing(ring, o, view) {
  const n = ring.length / 3;
  if (n < 3) return null;

  const vecs = [];
  let anyVisible = false;
  for (let i = 0; i < n; i++) {
    const v = [ring[i * 3], ring[i * 3 + 1], ring[i * 3 + 2]];
    vecs.push(v);
    if (!anyVisible && isVisible(rotate(v, o)[2])) anyVisible = true;
  }
  if (!anyVisible) return null;

  const viewSpace = vecs.map((v) => rotate(v, o));
  const visible = viewSpace.map((v) => isVisible(v[2]));
  if (visible.every(Boolean)) return viewSpace.map((v) => toScreen(v, view));

  // Start the walk on a visible vertex so the output never opens mid-gap and
  // the first emitted point is a real coastline point, not a limb artifact.
  const start = visible.indexOf(true);
  const out = [];
  let exited = null;

  for (let step = 0; step < n; step++) {
    const i = (start + step) % n;
    const j = (i + 1) % n;

    if (visible[i]) out.push(toScreen(viewSpace[i], view));

    if (visible[i] && !visible[j]) {
      exited = horizonCrossing(vecs[i], vecs[j], o);
      out.push(toScreen(exited, view));
    } else if (!visible[i] && visible[j]) {
      const entered = horizonCrossing(vecs[j], vecs[i], o);
      if (exited) out.push(...limbArc(exited, entered, view));
      out.push(toScreen(entered, view));
      exited = null;
    }
  }

  // The ring left the near face and never came back before wrapping: close the
  // final gap against where the walk began.
  if (exited && out.length) {
    const first = out[0];
    const entry = [(first[0] - view.cx) / view.radius, -(first[1] - view.cy) / view.radius];
    out.push(...limbArc(exited, entry, view));
  }

  return out.length >= 3 ? out : null;
}

const r1 = (n) => Math.round(n * 10) / 10;

// Screen points -> SVG path data. Rounded to 0.1px: at any zoom the globe
// renders sub-pixel detail nobody can see, and the shorter string is markedly
// cheaper to diff and hand across the RN bridge every frame.
export function pointsToPath(points) {
  if (!points || points.length < 3) return null;
  return "M" + points.map(([x, y]) => `${r1(x)} ${r1(y)}`).join("L") + "Z";
}

// Project every ring of one country and join them into a single path string,
// so a country with islands stays one <Path> and therefore one tap target.
export function projectCountry(rings, o, view) {
  const parts = [];
  for (const ring of rings) {
    const path = pointsToPath(projectRing(ring, o, view));
    if (path) parts.push(path);
  }
  return parts.length ? parts.join("") : null;
}

// Parse one equirectangular path string from data/worldMap.js back into rings
// of unit vectors, inverting the Day 4 projection exactly (see the header).
// Flat Float64Arrays, not arrays of triples: this is read 8,190 points at a
// time on every frame of a drag.
export function ringsFromPath(d, { scale = 2 } = {}) {
  const rings = [];
  for (const chunk of d.split("M")) {
    if (!chunk) continue;
    const coords = chunk.replace(/Z\s*$/, "").split("L");
    const ring = new Float64Array(coords.length * 3);
    let n = 0;
    for (const pair of coords) {
      const [xs, ys] = pair.trim().split(/\s+/);
      const x = Number(xs);
      const y = Number(ys);
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      const [vx, vy, vz] = lngLatToVec(x / scale - 180, 90 - y / scale);
      ring[n * 3] = vx;
      ring[n * 3 + 1] = vy;
      ring[n * 3 + 2] = vz;
      n++;
    }
    if (n >= 3) rings.push(ring.subarray(0, n * 3));
  }
  return rings;
}

// The unit vector a country sits on — the normalized mean of its own points.
// Used to decide whether a country faces the viewer (for labels and hit
// targets) and to aim a rotation at it. Mean-of-vectors, not mean-of-lng/lat,
// so it can't be thrown off by the antimeridian — the bug that already cost
// mapRegions.js a debugging pass when Russia's flat bounding box read as
// "spans the entire world."
export function countryCenter(rings) {
  let x = 0;
  let y = 0;
  let z = 0;
  let n = 0;
  for (const ring of rings) {
    for (let i = 0; i < ring.length; i += 3) {
      x += ring[i];
      y += ring[i + 1];
      z += ring[i + 2];
      n++;
    }
  }
  if (!n) return null;
  return normalize([x / n, y / n, z / n]);
}

// lng/lat of a unit vector — the inverse of lngLatToVec, for turning a
// country's or region's center back into a rotation target.
export function vecToLngLat([x, y, z]) {
  return [(Math.atan2(y, x) * 180) / Math.PI, (Math.asin(Math.max(-1, Math.min(1, z))) * 180) / Math.PI];
}

// The graticule (M2.3.7 step 4.2): the lat/lng grid every globe reference
// image has, drawn under the ocean so it reads through open water and
// disappears under land exactly like the flat map's own equirectangular
// lines never got a chance to. Generated once, in world space — this list
// doesn't depend on orientation, so callers compute it a single time and
// reproject it every frame the same way they reproject a country's rings.
//
// Meridians are open half-great-circles, pole to pole. Parallels are full
// circles, but represented as an OPEN polyline whose first and last sample
// coincide (lng -180 and lng 180 are the same point) — that lets
// projectGraticuleLine() treat every line the same way, with no special
// "closed ring" wraparound case to get wrong.
export function graticuleLines(stepDeg = 30, sampleDeg = 5) {
  const lines = [];
  for (let lng = -180; lng < 180; lng += stepDeg) {
    const line = [];
    for (let lat = -90; lat <= 90; lat += sampleDeg) line.push(lngLatToVec(lng, lat));
    lines.push(line);
  }
  for (let lat = -90 + stepDeg; lat < 90; lat += stepDeg) {
    const line = [];
    for (let lng = -180; lng <= 180; lng += sampleDeg) line.push(lngLatToVec(lng, lat));
    lines.push(line);
  }
  return lines;
}

// Project one graticule line (an array of unit vectors, NOT a closed ring)
// into however many visible screen-space polylines it breaks into this
// frame. Unlike projectRing, there is no limb-walk to close a gap with — a
// grid line isn't a filled shape, so it should simply stop at the horizon
// and pick back up wherever it re-enters, exactly like a coastline would if
// it weren't filled.
export function projectGraticuleLine(vecs, o, view) {
  const n = vecs.length;
  const viewSpace = vecs.map((v) => rotate(v, o));
  const visible = viewSpace.map((v) => isVisible(v[2]));

  const lines = [];
  let current = [];
  for (let i = 0; i < n; i++) {
    if (visible[i]) {
      if (current.length === 0 && i > 0 && !visible[i - 1]) {
        current.push(toScreen(horizonCrossing(vecs[i], vecs[i - 1], o), view));
      }
      current.push(toScreen(viewSpace[i], view));
    } else if (current.length) {
      current.push(toScreen(horizonCrossing(vecs[i - 1], vecs[i], o), view));
      lines.push(current);
      current = [];
    }
  }
  if (current.length >= 2) lines.push(current);
  return lines;
}

// Screen points -> an OPEN SVG path (no closing Z) — the graticule's own
// analogue of pointsToPath, since a grid line is stroked, never filled.
export function pointsToPolylinePath(points) {
  if (!points || points.length < 2) return null;
  return "M" + points.map(([x, y]) => `${r1(x)} ${r1(y)}`).join("L");
}
