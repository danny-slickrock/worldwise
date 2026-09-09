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
}) {
  const o = orientation(spin.lng, spin.lat);
  const invRadius = 1 / radius;

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

      const world = viewToWorld(vx, vy, vz, o);
      const [lon, lat] = vecToLonLat(world);
      const si = texelIndex(lon, lat, srcWidth, srcHeight);

      dest[di] = src[si];
      dest[di + 1] = src[si + 1];
      dest[di + 2] = src[si + 2];
      dest[di + 3] = 255;
    }
  }
  return dest;
}
