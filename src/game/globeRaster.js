// Draping a real photograph of the Earth onto the globe.
//
// The globe's countries are SVG paths — vectors projected forward, world point
// to screen point. A raster basemap has to go the OTHER way: for every pixel
// inside the disc, ask which point of the Earth is there, then look that point
// up in an equirectangular texture. That inverse is the whole of this module.
//
// It is the reason an equirectangular source is the only practical one: pixel x
// maps linearly to longitude and pixel y linearly to latitude, so a lookup is
// two multiplies with no search and no interpolation table.
//
// PURE — no canvas, no React, no image loading. It fills a plain byte array,
// which is what makes the hard part (the inverse rotation) testable against a
// four-pixel synthetic texture instead of against a photograph.
import { orientation } from "./globeProjection";

const DEG = 180 / Math.PI;

// The exact inverse of globeProjection.rotate(). That function computes
//   east  =  y·cosL − x·sinL
//   front =  x·cosL + y·sinL
//   view  = [east, cosP·z − sinP·front, sinP·z + cosP·front]
// so recovering the world vector is the same two rotations run backwards.
// Written out rather than expressed as a matrix because it runs once per
// PIXEL — a 768px globe is about 460,000 calls per frame.
export function viewToWorld(vx, vy, vz, o) {
  const z = o.cosP * vy + o.sinP * vz;
  const front = o.cosP * vz - o.sinP * vy;
  const east = vx;
  return [front * o.cosL - east * o.sinL, front * o.sinL + east * o.cosL, z];
}

// World unit vector → longitude/latitude in degrees.
export function vecToLonLat([x, y, z]) {
  // Clamp before asin: accumulated float error can push |z| a hair past 1,
  // and asin(1.0000001) is NaN, which would paint a hole at the sub-viewer
  // point — the one pixel a reader is most likely to be looking at.
  const clamped = z > 1 ? 1 : z < -1 ? -1 : z;
  return [Math.atan2(y, x) * DEG, Math.asin(clamped) * DEG];
}

// lon/lat → floating-point texel coordinates. Split out from texelIndex so the
// smooth sampler can use the fraction the nearest-neighbour one throws away.
//
// Longitude WRAPS rather than clamps: the antimeridian is a seam in the source
// image but not on the Earth, and clamping there would smear the last column of
// the texture across the Pacific.
export function texelCoords(lon, lat, width, height) {
  let u = ((lon + 180) / 360) * width;
  u = ((u % width) + width) % width;
  const v = ((90 - lat) / 180) * (height - 1);
  return [u, v < 0 ? 0 : v > height - 1 ? height - 1 : v];
}

// Bilinear sample. The reason a 4096-wide source is worth its bytes: with
// nearest-neighbour, zooming in shows the texels as hard rectangles and the
// extra resolution buys nothing but smaller rectangles. Costs four texel reads
// instead of one, so it is used for the settled frame and not the draft.
export function sampleSmooth(src, lon, lat, width, height, out) {
  const [u, v] = texelCoords(lon, lat, width, height);
  // texelCoords returns u in EDGE space — floor(u) is "which texel contains
  // this longitude", which is what the nearest-neighbour path wants. Blending
  // needs texel CENTRES, and the centre of texel i sits at u = i + 0.5. Without
  // this shift the smooth frame lands half a texel east of the fast one, so the
  // two disagree and the imagery sits half a texel off the borders drawn on it.
  //
  // v needs no such shift: texelCoords already scales it by (height - 1), which
  // puts it in index space rather than edge space.
  const t = u - 0.5;
  const x0 = Math.floor(t);
  const y0 = Math.floor(v);
  const fx = t - x0;
  const fy = v - y0;
  // x wraps at the seam — including x0 = -1, which is the last column, not an
  // out-of-bounds read; y is already clamped into range.
  const xa = ((x0 % width) + width) % width;
  const x1 = (xa + 1) % width;
  const y1 = y0 + 1 > height - 1 ? height - 1 : y0 + 1;

  const i00 = (y0 * width + xa) * 4;
  const i10 = (y0 * width + x1) * 4;
  const i01 = (y1 * width + xa) * 4;
  const i11 = (y1 * width + x1) * 4;

  const w00 = (1 - fx) * (1 - fy);
  const w10 = fx * (1 - fy);
  const w01 = (1 - fx) * fy;
  const w11 = fx * fy;

  for (let c = 0; c < 3; c++) {
    out[c] = src[i00 + c] * w00 + src[i10 + c] * w10 + src[i01 + c] * w01 + src[i11 + c] * w11;
  }
  return out;
}

// lon/lat → the index of the first byte of that texel in an RGBA buffer.
//
// Longitude wraps rather than clamps: the antimeridian is a seam in the source
// image but not on the Earth, and clamping there would smear the last column of
// the texture across the Pacific.
export function texelIndex(lon, lat, width, height) {
  let u = ((lon + 180) / 360) * width;
  u = ((u % width) + width) % width;
  const v = ((90 - lat) / 180) * (height - 1);
  const px = Math.min(width - 1, Math.max(0, Math.floor(u)));
  const py = Math.min(height - 1, Math.max(0, Math.round(v)));
  return (py * width + px) * 4;
}

// Render one frame of the globe's basemap into `dest` (RGBA, width×height).
//
// The frame is deliberately NOT square. The SVG layer above it fills the whole
// container and lets the sphere overflow the fitted square once zoomed in, so a
// square raster leaves two vertical seams where the photograph stops and the
// borders carry on — visible the moment anyone zooms. The caller passes the
// same centre and radius the SVG is using, in destination pixels, and the two
// layers then agree by construction rather than by coincidence.
//
// `dest` is passed in rather than allocated here so a caller can reuse one
// buffer across frames — allocating a couple of megabytes per drag frame is how
// this kind of loop ends up dominating a GC profile.
//
// Everything outside the sphere's disc is left fully transparent, so the disc's
// edge is the image's edge and no separate clip is needed.
export function renderGlobeRaster({
  dest,
  width,
  height,
  src,
  srcWidth,
  srcHeight,
  spin,
  centerX = width / 2,
  centerY = height / 2,
  radius,
  smooth = false,
}) {
  const o = orientation(spin.lng, spin.lat);
  const { cosP, sinP, cosL, sinL } = o;
  const invRadius = 1 / radius;
  // Everything per-pixel below is viewToWorld → vecToLonLat → texelCoords →
  // sampleSmooth/texelIndex, INLINED. Those helpers stay exported (and tested)
  // as the reference; this loop must agree with them exactly, and a test pins
  // that. Inlining is what pays for bilinear sampling while the globe moves:
  // the helpers return a fresh array per call, and three short-lived arrays
  // per pixel at 200k pixels per frame is ~600k allocations a frame — which
  // costs more than the extra three texel reads bilinear needs.
  const lonScale = srcWidth / 360;
  const vMax = srcHeight - 1;
  const latScale = vMax / 180;
  const rowBytes = srcWidth * 4;

  for (let py = 0; py < height; py++) {
    // View-space y grows up while canvas y grows down.
    const vy = (centerY - py + 0.5) * invRadius;
    const vy2 = vy * vy;
    const rowStart = py * width * 4;

    if (vy2 > 1) {
      // The whole row is off the sphere. Common once zoomed, and skipping the
      // per-pixel work for it is free.
      dest.fill(0, rowStart, rowStart + width * 4);
      continue;
    }
    const halfWidth = Math.sqrt(1 - vy2) * radius;
    // The parts of viewToWorld that depend only on the row.
    const zRow = cosP * vy;
    const frontRow = -sinP * vy;

    for (let px = 0; px < width; px++) {
      const dx = px + 0.5 - centerX;
      const di = rowStart + px * 4;
      if (dx < -halfWidth || dx > halfWidth) {
        dest[di + 3] = 0;
        continue;
      }
      const vx = dx * invRadius;
      const vz2 = 1 - vx * vx - vy2;
      // The limb: vz² can go a hair negative from float error at exactly the
      // edge, which would make vz NaN and sample garbage.
      const vz = vz2 > 0 ? Math.sqrt(vz2) : 0;

      // viewToWorld
      let z = zRow + sinP * vz;
      const front = cosP * vz + frontRow;
      const wx = front * cosL - vx * sinL;
      const wy = front * sinL + vx * cosL;
      // vecToLonLat (clamped: asin(1.0000001) is NaN — a hole at the sub-viewer
      // point, the one pixel a reader is most likely to be looking at)
      if (z > 1) z = 1;
      else if (z < -1) z = -1;
      const lon = Math.atan2(wy, wx) * DEG;
      const lat = Math.asin(z) * DEG;

      // texelCoords — longitude wraps, latitude clamps.
      let u = (lon + 180) * lonScale;
      u = ((u % srcWidth) + srcWidth) % srcWidth;
      let v = (90 - lat) * latScale;
      if (v < 0) v = 0;
      else if (v > vMax) v = vMax;

      if (smooth) {
        // sampleSmooth: shift u to texel centres (see its note), wrap x.
        const t = u - 0.5;
        const x0 = Math.floor(t);
        const y0 = Math.floor(v);
        const fx = t - x0;
        const fy = v - y0;
        const xa = x0 < 0 ? x0 + srcWidth : x0;
        const x1 = xa + 1 === srcWidth ? 0 : xa + 1;
        const r0 = y0 * rowBytes;
        const r1 = (y0 + 1 > vMax ? vMax : y0 + 1) * rowBytes;
        const i00 = r0 + xa * 4;
        const i10 = r0 + x1 * 4;
        const i01 = r1 + xa * 4;
        const i11 = r1 + x1 * 4;
        const w00 = (1 - fx) * (1 - fy);
        const w10 = fx * (1 - fy);
        const w01 = (1 - fx) * fy;
        const w11 = fx * fy;
        dest[di] = src[i00] * w00 + src[i10] * w10 + src[i01] * w01 + src[i11] * w11;
        dest[di + 1] =
          src[i00 + 1] * w00 + src[i10 + 1] * w10 + src[i01 + 1] * w01 + src[i11 + 1] * w11;
        dest[di + 2] =
          src[i00 + 2] * w00 + src[i10 + 2] * w10 + src[i01 + 2] * w01 + src[i11 + 2] * w11;
      } else {
        // texelIndex
        let tx = Math.floor(u);
        if (tx > srcWidth - 1) tx = srcWidth - 1;
        const si = Math.round(v) * rowBytes + tx * 4;
        dest[di] = src[si];
        dest[di + 1] = src[si + 1];
        dest[di + 2] = src[si + 2];
      }
      dest[di + 3] = 255;
    }
  }
  return dest;
}

// The in-motion pixel budget, steered by how long the last motion frame took.
//
// Cost is linear in pixels, so target/measured is the right correction — but
// it is DAMPED (at most -30% / +15% per frame) so one GC pause or a cold first
// frame cannot slam the quality down, and the budget eases back up rather than
// oscillating. A non-positive measurement (a timer too coarse to see the
// frame) counts as "plenty of headroom".
export function adaptMotionBudget(budget, measuredMs, { targetMs, min, max }) {
  const ratio = measuredMs > 0 ? targetMs / measuredMs : Infinity;
  const step = ratio < 0.7 ? 0.7 : ratio > 1.15 ? 1.15 : ratio;
  const next = Math.round(budget * step);
  return next < min ? min : next > max ? max : next;
}

// A mip chain: the source halved repeatedly with a 2x2 box filter, down to
// `minWidth`. Level 0 is the source itself (not copied).
//
// Why: on a phone-sized globe the 4096-wide source puts several texels under
// every screen pixel. Sampling it point-wise both SHIMMERS (each frame lands on
// a different one of those texels) and is slow — the loop is bound by cache
// misses into a 32 MB texture, not by arithmetic. A level whose texel density
// matches the screen fixes both at once.
//
// Registration is unchanged by construction: every level is the whole
// equirectangular Earth, so lon/lat → u/v is the same normalised mapping, and
// a 2x2 box average puts each coarse texel's centre exactly between the four
// fine ones it replaces.
export function buildMipChain(src, width, height, minWidth = 256) {
  const levels = [{ data: src, width, height }];
  let cur = levels[0];
  while (cur.width / 2 >= minWidth && cur.height % 2 === 0 && cur.width % 2 === 0) {
    const w = cur.width / 2;
    const h = cur.height / 2;
    const out = new Uint8ClampedArray(w * h * 4);
    const s = cur.data;
    const row = cur.width * 4;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * 2 * cur.width + x * 2) * 4;
        const o = (y * w + x) * 4;
        for (let c = 0; c < 4; c++) {
          out[o + c] = (s[i + c] + s[i + 4 + c] + s[i + row + c] + s[i + row + 4 + c] + 2) >> 2;
        }
      }
    }
    cur = { data: out, width: w, height: h };
    levels.push(cur);
  }
  return levels;
}

// Which level of a chain to sample for a globe of `radius` destination pixels.
//
// The equator is 2πr pixels long on screen and `width` texels long in a level,
// so pick the coarsest level that still has at least one texel per pixel
// (times `oversample`). Never coarser than that: a texel per pixel is the
// point past which a coarser level reads as soft, which is the bug this
// whole change is about.
export function mipLevelFor(levels, radius, oversample = 1) {
  const need = 2 * Math.PI * radius * oversample;
  let pick = 0;
  for (let i = 1; i < levels.length; i++) {
    if (levels[i].width >= need) pick = i;
    else break;
  }
  return pick;
}
