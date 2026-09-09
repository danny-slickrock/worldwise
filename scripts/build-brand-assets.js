// Rasterize the Worldwise mark into the platform icons Expo needs.
//
// Run:  npm run build:brand
//
// WHY THIS EXISTS. The brand kit ships the logo only as PNGs, and its own
// handoff notes flag them: "logo artwork is raster-traced … edges soften above
// ~150px. Commission or produce a true SVG before shipping app icons." An app
// icon is 1024px. So the icons are drawn here, from `src/game/brandMark.js` —
// the SAME geometry `components/CompassMark.js` renders on screen — rather than
// upscaled from a 150px trace.
//
// That shared source is the point. A build script with its own hand-copied
// path is the thing that drifts: the icon on the home screen and the mark
// spinning in the loader would slowly stop being the same shape, and nobody
// would ever see the two side by side to notice.
//
// WHY IT ENCODES ITS OWN PNGs. There is no rasterizer in this repo's
// dependency tree and adding sharp/canvas to draw four small icons would be a
// native build step for every contributor. A PNG is a signature, three chunks
// and a zlib stream, and zlib is in Node's standard library — the whole encoder
// below is about forty lines. The alternative is a 40MB dependency that runs
// once a year.
//
// ANTIALIASING is 4x4 supersampled coverage, accumulated into a mask with MAX
// rather than summed. Max matters: the graticule is a stroked polyline, and
// summing coverage where two segments meet would darken every joint into a
// visible bead.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";
import {
  MARK_VIEWBOX,
  RING_RADIUS,
  APP_ICON,
  starPoints,
  dotRadius,
  ringWidth,
  hasRing,
  hasGraticule,
  graticuleArcs,
  markTone,
} from "../src/game/brandMark.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "assets");

// --- PNG -------------------------------------------------------------------

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i += 1) {
    c ^= buf[i];
    for (let k = 0; k < 8; k += 1) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  // compression 0, filter 0, interlace 0 — the only combination worth using.

  // One filter byte per scanline. Filter 0 (none): these are flat-ish graphics
  // and deflate already finds the runs; a per-line filter search would buy a
  // few kilobytes on a file written once.
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const src = y * width * 4;
    const dst = y * (width * 4 + 1);
    raw[dst] = 0;
    rgba.copy(raw, dst + 1, src, src + width * 4);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// --- Colour ----------------------------------------------------------------

function parseColor(css) {
  const rgba = css.match(/rgba?\(([^)]+)\)/i);
  if (rgba) {
    const parts = rgba[1].split(",").map((n) => parseFloat(n.trim()));
    return { r: parts[0], g: parts[1], b: parts[2], a: parts[3] ?? 1 };
  }
  const hex = css.replace("#", "");
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
    a: 1,
  };
}

// --- Canvas ----------------------------------------------------------------
// Straight (non-premultiplied) RGBA in floats, composited source-over and only
// converted to bytes on the way out. Compositing in 8-bit would quantise every
// one of the four overlapping layers.

function makeCanvas(size, background) {
  const px = size * size;
  const canvas = {
    size,
    r: new Float64Array(px),
    g: new Float64Array(px),
    b: new Float64Array(px),
    a: new Float64Array(px),
  };
  if (background) {
    const c = parseColor(background);
    canvas.r.fill(c.r);
    canvas.g.fill(c.g);
    canvas.b.fill(c.b);
    canvas.a.fill(c.a);
  }
  return canvas;
}

const SS = 4; // subsamples per axis

// Coverage of one shape, as a mask over the whole canvas. `inside(x, y)` is in
// viewBox units; `bbox` limits the work to where the shape can possibly be.
function stamp(mask, size, toPx, bbox, inside) {
  const x0 = Math.max(0, Math.floor(toPx(bbox.x0)));
  const x1 = Math.min(size - 1, Math.ceil(toPx(bbox.x1)));
  const y0 = Math.max(0, Math.floor(toPx(bbox.y0)));
  const y1 = Math.min(size - 1, Math.ceil(toPx(bbox.y1)));
  const step = 1 / SS;

  for (let py = y0; py <= y1; py += 1) {
    for (let px = x0; px <= x1; px += 1) {
      let hits = 0;
      for (let sy = 0; sy < SS; sy += 1) {
        for (let sx = 0; sx < SS; sx += 1) {
          if (inside(px + (sx + 0.5) * step, py + (sy + 0.5) * step)) hits += 1;
        }
      }
      if (!hits) continue;
      const cov = hits / (SS * SS);
      const i = py * size + px;
      // MAX, not +=. Two segments of the same stroke overlapping at a joint
      // must not composite twice.
      if (cov > mask[i]) mask[i] = cov;
    }
  }
}

function composite(canvas, mask, css) {
  const c = parseColor(css);
  for (let i = 0; i < mask.length; i += 1) {
    const cov = mask[i];
    if (!cov) continue;
    const sa = c.a * cov;
    const inv = 1 - sa;
    canvas.r[i] = c.r * sa + canvas.r[i] * canvas.a[i] * inv;
    canvas.g[i] = c.g * sa + canvas.g[i] * canvas.a[i] * inv;
    canvas.b[i] = c.b * sa + canvas.b[i] * canvas.a[i] * inv;
    const out = sa + canvas.a[i] * inv;
    // Un-premultiply back to straight alpha so the next layer composites the
    // same way this one did.
    if (out > 0) {
      canvas.r[i] /= out;
      canvas.g[i] /= out;
      canvas.b[i] /= out;
    }
    canvas.a[i] = out;
  }
}

function toBuffer(canvas) {
  const out = Buffer.alloc(canvas.size * canvas.size * 4);
  for (let i = 0; i < canvas.a.length; i += 1) {
    out[i * 4] = Math.round(Math.max(0, Math.min(255, canvas.r[i])));
    out[i * 4 + 1] = Math.round(Math.max(0, Math.min(255, canvas.g[i])));
    out[i * 4 + 2] = Math.round(Math.max(0, Math.min(255, canvas.b[i])));
    out[i * 4 + 3] = Math.round(Math.max(0, Math.min(255, canvas.a[i] * 255)));
  }
  return out;
}

// --- SVG arc → polyline ----------------------------------------------------
// The graticule is authored as SVG `A` commands because that is what
// react-native-svg draws. Rather than keep a second, "rasterizer-friendly"
// copy of the same curves — which is exactly how two renderings drift apart —
// this parses them and applies the endpoint→centre conversion from the SVG
// spec's implementation notes (F.6.5), then samples.
//
// Only the subset brandMark.js emits is handled: `M x y A rx ry 0 fa fs x y`,
// no rotation. A wider parser would be untested surface.
function arcToPolyline(d, steps = 96) {
  const n = d.match(/-?\d+(?:\.\d+)?/g).map(Number);
  const [x1, y1, rx, ry, , fa, fs, x2, y2] = n;

  const dx = (x1 - x2) / 2;
  const dy = (y1 - y2) / 2;

  // Scale the radii up if they are too small to span the endpoints.
  let RX = rx;
  let RY = ry;
  const lambda = (dx * dx) / (RX * RX) + (dy * dy) / (RY * RY);
  if (lambda > 1) {
    const s = Math.sqrt(lambda);
    RX *= s;
    RY *= s;
  }

  const num = RX * RX * RY * RY - RX * RX * dy * dy - RY * RY * dx * dx;
  const den = RX * RX * dy * dy + RY * RY * dx * dx;
  const coef = (fa !== fs ? 1 : -1) * Math.sqrt(Math.max(0, num / den));
  const cxp = (coef * (RX * dy)) / RY;
  const cyp = (coef * (-RY * dx)) / RX;
  const cx = cxp + (x1 + x2) / 2;
  const cy = cyp + (y1 + y2) / 2;

  const theta = (ux, uy, vx, vy) => {
    const sign = ux * vy - uy * vx < 0 ? -1 : 1;
    const dot = (ux * vx + uy * vy) / (Math.hypot(ux, uy) * Math.hypot(vx, vy));
    return sign * Math.acos(Math.max(-1, Math.min(1, dot)));
  };

  const ux = (dx - cxp) / RX;
  const uy = (dy - cyp) / RY;
  const vx = (-dx - cxp) / RX;
  const vy = (-dy - cyp) / RY;

  const start = theta(1, 0, ux, uy);
  let sweep = theta(ux, uy, vx, vy);
  if (!fs && sweep > 0) sweep -= 2 * Math.PI;
  if (fs && sweep < 0) sweep += 2 * Math.PI;

  const points = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = start + (sweep * i) / steps;
    points.push([cx + RX * Math.cos(t), cy + RY * Math.sin(t)]);
  }
  return points;
}

// --- The mark ---------------------------------------------------------------

function drawMark(canvas, { detail, tone, scale, ground }) {
  const size = canvas.size;
  const inset = (size * (1 - scale)) / 2;
  // viewBox units → device pixels.
  const toPx = (u) => inset + (u / MARK_VIEWBOX) * size * scale;
  const toUnit = (p) => ((p - inset) / (size * scale)) * MARK_VIEWBOX;
  const c = markTone(tone);
  const center = MARK_VIEWBOX / 2;

  const layer = (bbox, inside, css) => {
    const mask = new Float64Array(size * size);
    stamp(mask, size, toPx, bbox, (px, py) => inside(toUnit(px), toUnit(py)));
    composite(canvas, mask, css);
  };

  if (ground) canvas.a.fill(1);

  if (hasRing(detail)) {
    const w = ringWidth(detail) / 2;
    const outer = RING_RADIUS + w + 1;
    layer(
      { x0: center - outer, y0: center - outer, x1: center + outer, y1: center + outer },
      (x, y) => Math.abs(Math.hypot(x - center, y - center) - RING_RADIUS) <= w,
      c.ring
    );
  }

  if (hasGraticule(detail)) {
    // All four arcs into ONE mask, for the same reason stamp() takes a max:
    // the meridians and parallels cross, and compositing each separately would
    // print a darker dot at every intersection.
    const mask = new Float64Array(size * size);
    const half = 1; // strokeWidth 2, matching CompassMark
    for (const d of graticuleArcs()) {
      const pts = arcToPolyline(d);
      for (let i = 1; i < pts.length; i += 1) {
        const [ax, ay] = pts[i - 1];
        const [bx, by] = pts[i];
        const bbox = {
          x0: Math.min(ax, bx) - half - 0.5,
          y0: Math.min(ay, by) - half - 0.5,
          x1: Math.max(ax, bx) + half + 0.5,
          y1: Math.max(ay, by) + half + 0.5,
        };
        stamp(mask, size, toPx, bbox, (px, py) => {
          const x = toUnit(px);
          const y = toUnit(py);
          const vx = bx - ax;
          const vy = by - ay;
          const len2 = vx * vx + vy * vy;
          const t = len2 ? Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / len2)) : 0;
          return Math.hypot(x - (ax + t * vx), y - (ay + t * vy)) <= half;
        });
      }
    }
    composite(canvas, mask, c.graticule);
  }

  const star = starPoints(detail);
  const xs = star.map((p) => p[0]);
  const ys = star.map((p) => p[1]);
  layer(
    { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) },
    (x, y) => {
      // Even-odd crossing test. A star polygon is simple (non-self-
      // intersecting), so even-odd and non-zero agree.
      let inside = false;
      for (let i = 0, j = star.length - 1; i < star.length; j = i, i += 1) {
        const [xi, yi] = star[i];
        const [xj, yj] = star[j];
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
      }
      return inside;
    },
    c.star
  );

  const r = dotRadius(detail);
  layer(
    { x0: center - r - 1, y0: center - r - 1, x1: center + r + 1, y1: center + r + 1 },
    (x, y) => Math.hypot(x - center, y - center) <= r,
    c.dot
  );
}

function write(name, size, opts) {
  const canvas = makeCanvas(size, opts.background ?? null);
  drawMark(canvas, opts);
  const file = path.join(OUT, name);
  fs.writeFileSync(file, encodePng(size, size, toBuffer(canvas)));
  const kb = (fs.statSync(file).size / 1024).toFixed(1);
  console.log(`  ${name.padEnd(22)} ${size}x${size}  ${kb} KB`);
}

// --- Outputs ---------------------------------------------------------------
// Level of detail is chosen from the MARK's rendered height, not the canvas —
// a 48px favicon carries a 36px mark, which is below the kit's graticule floor.

fs.mkdirSync(OUT, { recursive: true });
console.log("Worldwise brand assets → assets/");

// Kit §APP ICON: "parchment knockout mark on --ww-brand, artwork at 74% of
// canvas, platform squircle, no badges, no gradients, no seasonal variants."
// Fully opaque and square: iOS applies its own mask and rejects alpha.
write("icon.png", 1024, {
  background: APP_ICON.ground,
  tone: APP_ICON.tone,
  scale: APP_ICON.artworkScale,
  detail: "detailed",
  ground: true,
});

// Android adaptive: the foreground is masked to a circle at ~66% of the canvas
// and may be parallaxed, so the artwork is scaled INSIDE that safe zone rather
// than to the canvas. The pine ground comes from app.json's backgroundColor.
write("adaptive-icon.png", 1024, {
  tone: APP_ICON.tone,
  scale: APP_ICON.artworkScale * 0.66,
  detail: "detailed",
});

// Splash: transparent, `resizeMode: contain` over the parchment page, so the
// launch reads as the paper arriving with the instrument on it.
write("splash.png", 1024, { tone: "pine", scale: 0.34, detail: "detailed" });

// Favicon. 48 canvas → a 35px mark, below the graticule floor: simplified, per
// the kit's "do not downscale the detailed artwork".
write("favicon.png", 48, {
  background: APP_ICON.ground,
  tone: APP_ICON.tone,
  scale: APP_ICON.artworkScale,
  detail: "simple",
  ground: true,
});

console.log("done");
