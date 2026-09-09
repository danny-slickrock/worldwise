// PURE geometry for the Worldwise compass mark.
//
// The brand kit ships the mark only as raster PNGs, and says so in its own
// handoff notes: "logo artwork is raster-traced … edges soften above ~150px.
// Commission or produce a true SVG before shipping app icons and marketing."
// This is that SVG — expressed as numbers rather than as markup, for the same
// reason mediaPolicy.js is pure: TWO consumers need it and only one of them is
// React.
//
//   · src/components/CompassMark.js draws it with react-native-svg, on web,
//     iOS and Android, at any size, in any of the brand's three tones.
//   · scripts/build-brand-assets.mjs rasterizes it in plain Node to produce
//     the app icon, the adaptive icon, the favicon and the splash artwork.
//
// One source, so the icon on a home screen and the mark spinning in a loader
// are provably the same shape. A hand-copied path in a build script is exactly
// the kind of thing that drifts a half-pixel and is never noticed.
//
// ---------------------------------------------------------------------------
// LEVEL OF DETAIL IS A BRAND RULE, NOT AN OPTIMISATION
//
// Kit §LOGO: "Minimum sizes: lockup 28px mark height; icon 16px. Below 32px
// use the simplified compass (star + ring + centre dot) — do not downscale the
// detailed artwork." So the mark does not scale — it SWAPS, and each level is
// drawn with proportions that survive at its own size: the smaller the render,
// the fatter the star's waist and the larger the centre dot, because a 7-unit
// waist at 16px is a third of a pixel and disappears.
//
// Everything below is in a 0-100 square, the kit's own viewBox.

export const MARK_VIEWBOX = 100;

// Kit §LOGO minimum: an icon is never rendered below this.
export const MARK_MIN_SIZE = 16;

// The two thresholds the level of detail turns on, in rendered CSS pixels.
//
// 32 is the kit's own number, verbatim: "Below 32px use the simplified compass
// (star + ring + centre dot)". So `simple` KEEPS THE RING — dropping it is a
// different mark, not a smaller one, and getting that backwards is exactly what
// made the desktop rail's 28px lockup render as a bare star.
//
// 20 is ours. The kit stops at "icon minimum 16px" without saying what the mark
// looks like there, and its own 16px sample answers by example: no ring. At
// 20px the ring is a 1px circle 14px across sitting a pixel and a half from the
// star's tips, and it fills in to a grey smudge. Below that the mark is the
// star and the pivot.
export const MARK_SIMPLE_FLOOR = 20; // below: star + dot only
export const MARK_DETAILED_FLOOR = 32; // below: the kit's simplified compass

export const MARK_DETAILS = ["micro", "simple", "detailed"];

// Rendered size → which artwork to draw.
export function markDetail(size) {
  if (!(size > 0)) return "detailed";
  if (size < MARK_SIMPLE_FLOOR) return "micro";
  if (size < MARK_DETAILED_FLOOR) return "simple";
  return "detailed";
}

// The four-point star. Points run N, NE-waist, E, SE-waist, S, SW-waist, W,
// NW-waist — a star polygon, so the waist values are what set how needle-like
// the points read.
//
// `detailed` is the guide's own 26px sample verbatim (waist 43/57, tips at
// 2/98); the smaller levels widen the waist and push the tips to the very edge
// so the silhouette holds when it is 16 pixels across.
const STAR = {
  detailed: [
    [50, 2],
    [57, 43],
    [98, 50],
    [57, 57],
    [50, 98],
    [43, 57],
    [2, 50],
    [43, 43],
  ],
  simple: [
    [50, 1],
    [58, 42],
    [99, 50],
    [58, 58],
    [50, 99],
    [42, 58],
    [1, 50],
    [42, 42],
  ],
  micro: [
    [50, 0],
    [60, 40],
    [100, 50],
    [60, 60],
    [50, 100],
    [40, 60],
    [0, 50],
    [40, 40],
  ],
};

export function starPoints(detail = "detailed") {
  return STAR[detail] ?? STAR.detailed;
}

// The centre pivot. It grows as the artwork shrinks: at micro the star's waist
// has all but closed, and the dot is what keeps the mark from reading as a
// plain plus sign.
const DOT_RADIUS = { detailed: 8, simple: 9, micro: 12 };

export function dotRadius(detail = "detailed") {
  return DOT_RADIUS[detail] ?? DOT_RADIUS.detailed;
}

// The globe the star sits inside. Absent at micro — a 1px ring at 16px is grey
// mush, which is precisely why the kit forbids downscaling the full artwork.
export const RING_RADIUS = 36;
const RING_WIDTH = { detailed: 4, simple: 5, micro: 0 };

export function ringWidth(detail = "detailed") {
  return RING_WIDTH[detail] ?? RING_WIDTH.detailed;
}

export function hasRing(detail = "detailed") {
  return ringWidth(detail) > 0;
}

export function hasGraticule(detail = "detailed") {
  return detail === "detailed";
}

// --- The graticule ---------------------------------------------------------
// The crossed arcs inside the ring. These are a real orthographic graticule
// rather than decorative squiggles, which is why they are computed: a meridian
// at longitude λ projects to an ellipse of semi-axis R·sin λ, and a parallel at
// latitude φ to one of semi-axis R·cos φ sitting at y = 50 - R·sin φ.
//
// The same projection the globe itself uses (game/globeProjection.js), applied
// to a logo — the mark is a small orthographic Earth, and it costs nothing to
// make that true rather than approximate.
const MERIDIAN_LON = 30; // degrees either side of centre
const PARALLEL_LAT = 32; // degrees either side of the equator
const PARALLEL_TILT = 0.26; // how far the globe is tipped toward the reader

const rad = (deg) => (deg * Math.PI) / 180;
const round = (n) => Math.round(n * 100) / 100;

// Each arc is returned as an SVG path `d` string. Both consumers want a path:
// react-native-svg draws it directly, and the rasterizer flattens it.
export function graticuleArcs() {
  const r = RING_RADIUS;
  const c = MARK_VIEWBOX / 2;
  const arcs = [];

  // Two meridians — the same ellipse, swept both ways, so they mirror exactly.
  const mrx = round(r * Math.sin(rad(MERIDIAN_LON)));
  const top = round(c - r);
  const bottom = round(c + r);
  arcs.push(`M ${c} ${top} A ${mrx} ${r} 0 0 0 ${c} ${bottom}`);
  arcs.push(`M ${c} ${top} A ${mrx} ${r} 0 0 1 ${c} ${bottom}`);

  // Two parallels, north and south of the equator. Both curve the same way —
  // a globe tipped forward, not a pair of opposed smiles.
  for (const lat of [PARALLEL_LAT, -PARALLEL_LAT]) {
    const prx = round(r * Math.cos(rad(lat)));
    const y = round(c - r * Math.sin(rad(lat)));
    const pry = round(prx * PARALLEL_TILT);
    arcs.push(`M ${round(c - prx)} ${y} A ${prx} ${pry} 0 0 0 ${round(c + prx)} ${y}`);
  }

  return arcs;
}

// --- Tones -----------------------------------------------------------------
// Three sanctioned colourways, straight from the kit's asset list:
//
//   pine   — the primary positive mark, for parchment and cream grounds
//   cream  — the parchment knockout, for pine/nightwood grounds and the app icon
//   brass  — for nightwood grounds where the mark should read as gilt
//
// Held here rather than in theme.js because they are a fixed relationship
// between four parts of one piece of artwork, not four independently reusable
// tokens — and because the Node rasterizer cannot import theme.js's RN-adjacent
// neighbours. The hex values match theme.js's tokens exactly; a test asserts it.
export const MARK_TONES = {
  pine: {
    star: "#21403C", // brand
    ring: "#2E7A72", // accent — lakewater, the globe is water
    graticule: "rgba(46,122,114,0.55)",
    dot: "#B0602C", // ember — the lantern at the pivot
  },
  cream: {
    star: "#F4EBD9", // onFill
    ring: "#8FC4B4", // accentLight
    graticule: "rgba(143,196,180,0.6)",
    dot: "#D8A44A", // brass
  },
  brass: {
    star: "#D8A44A",
    ring: "rgba(216,164,74,0.55)",
    graticule: "rgba(216,164,74,0.35)",
    dot: "#16292A", // nightwood — a dark pivot in a gilt instrument
  },
};

export const DEFAULT_TONE = "pine";

// A tone name, or a single colour flattened across every part. The flat form
// exists for the places the mark has to sit quietly inside surrounding type —
// an inline glyph in a caption — where four brand colours would shout.
//
// A string is only accepted AS A COLOUR when it looks like one. Treating every
// unrecognised string as a colour is the tempting one-liner and it fails
// silently: `tone="crem"` would hand SVG a fill it cannot parse, and the mark
// would simply not be there. A misspelled tone falls back to pine instead —
// wrong colour, still a mark.
const COLOR_LIKE = /^(#|rgba?\(|hsla?\()/i;

export function markTone(tone = DEFAULT_TONE) {
  if (typeof tone !== "string") return MARK_TONES[DEFAULT_TONE];
  if (MARK_TONES[tone]) return MARK_TONES[tone];
  if (COLOR_LIKE.test(tone)) return { star: tone, ring: tone, graticule: tone, dot: tone };
  return MARK_TONES[DEFAULT_TONE];
}

// Kit §LOGO: "Clear space around the lockup: 0.5x the mark height."
export const CLEAR_SPACE_RATIO = 0.5;

export function clearSpace(size) {
  return Math.round(size * CLEAR_SPACE_RATIO);
}

// Kit §APP ICON: "parchment knockout mark on --ww-brand, artwork at 74% of
// canvas, platform squircle, no badges, no gradients, no seasonal variants."
export const APP_ICON = { ground: "#21403C", tone: "cream", artworkScale: 0.74 };
