// Spinning and framing the globe (M2.3.7). PURE — no RN, no React — so
// test/engine.test.js covers it directly, same as mapZoom.js does for the flat
// map. Zoom itself still comes from mapZoom.js (pinchScale/wheelZoom/clampScale
// are plain scalar math and care nothing about the projection); what's here is
// everything that only makes sense on a sphere.
//
// The flat map's pan had an edge to clamp against. A globe doesn't: you can
// spin east forever. So longitude wraps and latitude clamps, and "reset" is a
// specific orientation rather than an origin.
import { lngLatToVec, vecToLngLat } from "./globeProjection";

// Where the globe faces on first paint and on Reset: the Atlantic, tilted
// slightly north. Picked because it puts the most land on screen at once —
// the Americas, Europe and Africa all readable without spinning.
export const DEFAULT_SPIN = { lng: -20, lat: 15 };

// Latitude past the poles doesn't exist; going further would flip the globe
// upside down mid-drag, which reads as a bug rather than as a rotation.
export const MAX_LATITUDE = 85;

// Fold any longitude into (-180, 180], so spinning east past the antimeridian
// keeps counting instead of running off to 5000°.
export function normalizeLng(lng) {
  let l = ((lng + 180) % 360) - 180;
  if (l <= -180) l += 360;
  return l;
}

export const clampLat = (lat) => Math.max(-MAX_LATITUDE, Math.min(MAX_LATITUDE, lat));

export const clampSpin = ({ lng, lat }) => ({ lng: normalizeLng(lng), lat: clampLat(lat) });

// Drag distance -> rotation. Dividing by the globe's on-screen radius is what
// makes the surface track the finger: the same pixel drag rotates less when
// zoomed in, exactly as grabbing a real globe would. 90° per radius dragged is
// the ratio that feels 1:1 near the center of the disc, where the cursor
// usually is.
export function spinFromDrag(startSpin, dx, dy, radius) {
  const perPixel = 90 / Math.max(1, radius);
  return clampSpin({
    // Dragging right spins the globe west, bringing eastern land into view —
    // the direction you get pushing a physical globe away from you.
    lng: startSpin.lng - dx * perPixel,
    lat: startSpin.lat + dy * perPixel,
  });
}

// Signed shortest way around from one longitude to another, so a tween from
// 170°E to 170°W crosses the 20° of Pacific between them instead of taking
// the 340° scenic route back through Greenwich.
export function shortestLngDelta(from, to) {
  return normalizeLng(to - from);
}

export function lerpSpin(from, to, t) {
  return clampSpin({
    lng: from.lng + shortestLngDelta(from.lng, to.lng) * t,
    lat: from.lat + (to.lat - from.lat) * t,
  });
}

// Angle between two unit vectors, in degrees. Clamped before acos because
// accumulated float error can push a dot product a hair past ±1, where acos
// returns NaN and silently poisons every zoom computed from it.
export function angleBetween(a, b) {
  const dot = Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
  return (Math.acos(dot) * 180) / Math.PI;
}

// The direction a group of countries sits in — the normalized mean of their
// center vectors, converted back to lng/lat.
//
// Averaging *vectors* rather than lng/lat values is what makes this immune to
// the antimeridian: the mean of 179°E and 179°W is 180°, not 0°. The flat
// map's regionBounds() had to grow an explicit guard for exactly this after
// Russia's bounding box read as "spans the entire world"; in vector space the
// problem never arises.
export function groupSpin(codes, centers) {
  let x = 0;
  let y = 0;
  let z = 0;
  let n = 0;
  for (const code of codes) {
    const c = centers[code];
    if (!c) continue;
    x += c[0];
    y += c[1];
    z += c[2];
    n++;
  }
  if (!n) return null;
  const len = Math.hypot(x, y, z);
  // A group spread evenly over the whole sphere averages to the center of the
  // earth, which points nowhere. No real region does this, but a caller
  // passing every country would, and a NaN spin is worse than no preset.
  if (len < 1e-9) return null;
  const [lng, lat] = vecToLngLat([x / len, y / len, z / len]);
  return clampSpin({ lng, lat });
}

// How far to zoom so something `radiusDegrees` wide fills the view.
//
// In an orthographic projection the disc's edge is 90° of arc from the center,
// and a point α degrees away lands at sin(α) of the radius. So framing an
// angular radius α means zoom = 1 / sin(α) — the whole globe (α = 90°) at
// zoom 1, tighter groups proportionally closer. `margin` adds breathing room
// so the outermost point isn't flush against the limb.
export function zoomForRadius(radiusDegrees, { margin = 12, min = 1, max = 8 } = {}) {
  if (!radiusDegrees) return min;
  const alpha = Math.min(90, radiusDegrees + margin);
  return Math.max(min, Math.min(max, 1 / Math.sin((alpha * Math.PI) / 180)));
}

// How far to zoom so a group of countries' CENTERS all fit the view —
// e.g. the region pills, which frame how far apart a region's countries sit
// from one another, not any one country's own outline.
export function groupZoom(codes, centers, spin, opts) {
  const center = lngLatToVec(spin.lng, spin.lat);
  let widest = 0;
  for (const code of codes) {
    const c = centers[code];
    if (!c) continue;
    widest = Math.max(widest, angleBetween(center, c));
  }
  return zoomForRadius(widest, opts);
}

// How far a single country's own outline reaches from its center, in
// degrees — unlike groupZoom, which only compares CENTERS against each
// other and would read a lone country as a single point (angle 0) framed at
// max zoom regardless of whether it's Russia or the Vatican. Same angular
// measurement GlobeMap.js's small-country hit-target sizing already uses.
export function countryAngularRadius(rings, center) {
  if (!rings || !center) return 0;
  let widest = 0;
  for (const ring of rings) {
    for (let i = 0; i < ring.length; i += 3) {
      widest = Math.max(widest, angleBetween(center, [ring[i], ring[i + 1], ring[i + 2]]));
    }
  }
  return widest;
}

// Spin momentum (M2.3.7 step 4.4): a drag that's still moving when it's
// released keeps the globe turning and eases to a stop, rather than
// stopping dead where the finger let go. Framed per MOMENTUM_FRAME_MS so
// the same felt deceleration holds regardless of the runtime's actual frame
// rate — a dropped frame decays proportionally more, not less.
export const MOMENTUM_FRICTION = 0.94; // multiplier applied every MOMENTUM_FRAME_MS
export const MOMENTUM_FRAME_MS = 1000 / 60;
export const MOMENTUM_STOP_SPEED = 0.006; // deg/ms; below this the spin is imperceptible

// Screen-pixel drag velocity (px/ms) -> spin velocity (deg/ms), reusing
// spinFromDrag's radius-scaled ratio so a flick at a given zoom keeps
// spinning at the speed it looked like it was going, same as the position
// math already does for an in-progress drag.
export function spinVelocityFromDrag(vx, vy, radius) {
  const perPixel = 90 / Math.max(1, radius);
  return { lng: -vx * perPixel, lat: vy * perPixel };
}

export function decayVelocity(velocity, dt, friction = MOMENTUM_FRICTION) {
  const factor = Math.pow(friction, dt / MOMENTUM_FRAME_MS);
  return { lng: velocity.lng * factor, lat: velocity.lat * factor };
}

export function isMomentumDone(velocity, stopSpeed = MOMENTUM_STOP_SPEED) {
  return Math.abs(velocity.lng) < stopSpeed && Math.abs(velocity.lat) < stopSpeed;
}

export function stepMomentum(spin, velocity, dt) {
  return clampSpin({ lng: spin.lng + velocity.lng * dt, lat: spin.lat + velocity.lat * dt });
}
