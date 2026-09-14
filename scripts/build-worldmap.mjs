// One-off generator: turns Natural Earth country geometry into an embedded,
// pre-projected SVG-path module for every map surface in the app.
//
// Source: Natural Earth 1:110m Admin-0 Countries (public domain, no attribution
//   required). https://github.com/nvkelso/natural-earth-vector
// We project to a plain equirectangular grid (linear lng/lat -> x/y) so the
// paths render in a coordinate space we fully control — no runtime projection,
// and pins/labels can be placed with the same trivial math on web and native.
// The globe inverts this projection back to the sphere at load (data/worldGeo.js),
// so this file is the single source of geometry for the flat map AND the globe.
//
// Run:  node scripts/build-worldmap.mjs <ne_110m_admin_0_countries.geojson> \
//                                       <ne_50m_admin_0_countries.geojson>
// Emits: src/data/worldMap.js
//
// ── What this emits, and why it is four things rather than one ──────────────
//
// The first version emitted one table: the sovereign states Natural Earth has a
// 1:110m polygon for. That is 167 of 196 countries and nothing else, and it left
// the map with two very different kinds of hole.
//
//   COUNTRY_PATHS   167 sovereign states with real 1:110m geometry. Unchanged
//                   from the original output — quiz pools are built off this
//                   table's keys, so what belongs in it is a gameplay decision,
//                   not a cartographic one.
//
//   TERRITORY_PATHS The 8 non-sovereign landmasses with real geometry that were
//                   simply absent: Greenland (the largest island on Earth, a
//                   2,710-unit hole in the North Atlantic), Antarctica, Western
//                   Sahara, Kosovo, Puerto Rico, New Caledonia, the Falklands
//                   and the French Southern Lands. Separate from COUNTRY_PATHS
//                   because they are not countries and must never be quizzed as
//                   though they were; see src/data/territories.js.
//
//   MICRO_PATHS     The 29 UN member states with NO geometry at this scale —
//                   Malta, Singapore, Bahrain, the Maldives, Barbados, Tuvalu,
//                   the Vatican and 22 more. They were invisible and untappable
//                   on both the globe and the flat map. Each is drawn as a point
//                   symbol at its Natural Earth label coordinate, the standard
//                   cartographic treatment for a state too small to draw to
//                   scale. Separate from COUNTRY_PATHS on purpose: a dot carries
//                   position but no shape, so these are map features, not
//                   Country Locator answers.
//
//   MAP_PATHS       All of the above, merged. This is what a map renders.
//
// ── The two holes with no ISO code ──────────────────────────────────────────
//
// Somaliland and Northern Cyprus have polygons in Natural Earth and no ISO
// 3166-1 code (both carry ISO_A2 "-99"). Skipping them left a hole INSIDE
// Somalia and one inside Cyprus, since Natural Earth excludes their area from
// those countries' own polygons. Their land is merged into so/cy, which is what
// the ISO register itself says and what removes the hole without this app
// having to invent a code for a place, or a position on it.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

// --- projection + simplification knobs ---
const SCALE = 2; // px per degree -> 720 x 360 viewBox
const W = 360 * SCALE;
const H = 180 * SCALE;
const EPS = 0.7; // min px gap between kept points (Douglas-Peucker-lite decimation)
const MIN_RING_PX2 = 3; // drop specks smaller than this (but keep each country's largest ring)

// Radius of a micro-state's point symbol, in viewBox units. Sized against the
// smallest real shape on the map rather than picked for looks: Luxembourg's
// 1:110m polygon is 1.4 units across, so a 0.9 radius (1.8 across) makes the
// dot the same order of size as the smallest country actually drawn. Bigger
// would make the Vatican out-measure Luxembourg, which is its own kind of lie.
const MICRO_RADIUS = 0.9;
const MICRO_POINTS_PER_CIRCLE = 12;

// Natural Earth polygons with no ISO code, and the country whose area they are
// carved out of. Keyed on NAME because there is no code to key on — that is the
// whole problem these two present.
const UNCODED_MERGES = { Somaliland: "so", "N. Cyprus": "cy" };

const project = ([lng, lat]) => [(lng + 180) * SCALE, (90 - lat) * SCALE];
const r1 = (n) => Math.round(n * 10) / 10;

// crude signed-area magnitude of a projected ring, for speck filtering
function ringArea(pts) {
  let a = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    a += pts[j][0] * pts[i][1] - pts[i][0] * pts[j][1];
  }
  return Math.abs(a) / 2;
}

// keep a point only if it moved far enough from the last kept one
function decimate(pts) {
  const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const [px, py] = out[out.length - 1];
    const [x, y] = pts[i];
    if (Math.abs(x - px) >= EPS || Math.abs(y - py) >= EPS) out.push(pts[i]);
  }
  return out;
}

function ringToPath(ring) {
  const pts = decimate(ring.map(project));
  if (pts.length < 3) return null;
  return "M" + pts.map(([x, y]) => `${r1(x)} ${r1(y)}`).join("L") + "Z";
}

function geomToPath(geom) {
  const polys =
    geom.type === "Polygon"
      ? [geom.coordinates]
      : geom.type === "MultiPolygon"
        ? geom.coordinates
        : [];
  // rank rings by area so we always keep the mainland even if it's "small"
  const rings = [];
  for (const poly of polys) {
    for (const ring of poly) {
      const projected = ring.map(project);
      rings.push({ ring, area: ringArea(projected) });
    }
  }
  rings.sort((a, b) => b.area - a.area);
  const parts = [];
  rings.forEach((r, i) => {
    if (i > 0 && r.area < MIN_RING_PX2) return; // keep largest; drop tiny extras
    const d = ringToPath(r.ring);
    if (d) parts.push(d);
  });
  return parts.join("");
}

// A point symbol: a small closed circle, written as the same M/L/Z vocabulary
// every other path here uses, so nothing downstream needs to learn a new shape.
// Emitted WITHOUT decimation — at this radius decimate() would eat the circle.
function pointSymbol(x, y, radius = MICRO_RADIUS) {
  const pts = [];
  for (let i = 0; i < MICRO_POINTS_PER_CIRCLE; i++) {
    const a = (i / MICRO_POINTS_PER_CIRCLE) * Math.PI * 2;
    pts.push(`${r1(x + Math.cos(a) * radius)} ${r1(y + Math.sin(a) * radius)}`);
  }
  return "M" + pts.join("L") + "Z";
}

// --- resolve NE feature -> our lowercase alpha-2 code ---
function codeOf(props) {
  const eh = props.ISO_A2_EH;
  const a2 = props.ISO_A2;
  const code = eh && eh !== "-99" ? eh : a2 && a2 !== "-99" ? a2 : null;
  return code ? code.toLowerCase() : null;
}

const src110 = process.argv[2];
const src50 = process.argv[3];
if (!src110 || !src50) {
  console.error(
    "usage: node scripts/build-worldmap.mjs <ne_110m_admin_0_countries.geojson> <ne_50m_admin_0_countries.geojson>"
  );
  process.exit(1);
}

// Which codes are in our datasets? Parsed out of the source rather than
// imported, because both modules reach react-native-free but countries.js
// imports the file this script writes — importing it here would be circular.
const countriesSrc = readFileSync(join(root, "src/data/countries.js"), "utf8");
const known = new Set([...countriesSrc.matchAll(/code:\s*"([a-z]{2})"/g)].map((m) => m[1]));
const territoriesSrc = readFileSync(join(root, "src/data/territories.js"), "utf8");
const territoryCodes = new Set(
  [...territoriesSrc.matchAll(/code:\s*"([a-z]{2})"/g)].map((m) => m[1])
);

const fc = JSON.parse(readFileSync(src110, "utf8"));
const countryPaths = {};
const territoryPaths = {};
const merges = [];
for (const f of fc.features) {
  const code = codeOf(f.properties);

  // The uncoded two, folded into the country they were cut out of.
  if (!code) {
    const into = UNCODED_MERGES[f.properties.NAME];
    if (into) merges.push([into, f.geometry, f.properties.NAME]);
    continue;
  }
  const d = geomToPath(f.geometry);
  if (!d) continue;
  if (known.has(code)) countryPaths[code] = d;
  else if (territoryCodes.has(code)) territoryPaths[code] = d;
}
// Applied after the main pass so the host country's own geometry exists to
// append to, whatever order the features arrive in.
for (const [into, geometry, name] of merges) {
  const d = geomToPath(geometry);
  if (!d) continue;
  if (!countryPaths[into]) {
    console.warn(`  ! ${name} has no host country ${into} to merge into — skipped`);
    continue;
  }
  countryPaths[into] += d;
  console.log(`  merged ${name} into ${into} (no ISO code of its own)`);
}

// --- micro-states: the countries with no geometry at this scale -------------
// 1:50m carries a label coordinate for every one of them, including the ones
// it ships as points rather than polygons. That coordinate is Natural Earth's
// own choice of where to put a country's name, which is exactly the "one point
// that represents this country" this needs.
const fc50 = JSON.parse(readFileSync(src50, "utf8"));
const labelPoints = {};
for (const f of fc50.features) {
  const code = codeOf(f.properties);
  const { LABEL_X, LABEL_Y } = f.properties;
  if (code && typeof LABEL_X === "number" && typeof LABEL_Y === "number") {
    labelPoints[code] = [LABEL_X, LABEL_Y];
  }
}

const microPaths = {};
const microPoints = {};
const unplaced = [];
for (const code of [...known].sort()) {
  if (countryPaths[code]) continue;
  const lngLat = labelPoints[code];
  if (!lngLat) {
    unplaced.push(code);
    continue;
  }
  const [x, y] = project(lngLat).map(r1);
  microPaths[code] = pointSymbol(x, y);
  microPoints[code] = [x, y];
}

// --- emit -------------------------------------------------------------------
const table = (obj) =>
  Object.keys(obj)
    .sort()
    .map((c) => `  ${c}: "${obj[c]}",`)
    .join("\n");
const pointTable = (obj) =>
  Object.keys(obj)
    .sort()
    .map((c) => `  ${c}: [${obj[c][0]}, ${obj[c][1]}],`)
    .join("\n");

const out = `// AUTO-GENERATED by scripts/build-worldmap.mjs — do not edit by hand.
// Natural Earth 1:110m Admin-0 Countries (public domain), projected to a plain
// equirectangular grid: x = (lng + 180) * ${SCALE}, y = (90 - lat) * ${SCALE}.
// Regenerate: node scripts/build-worldmap.mjs <110m geojson> <50m geojson>
//
// ${Object.keys(countryPaths).length} sovereign states with real geometry, ${Object.keys(territoryPaths).length} non-sovereign
// landmasses, and ${Object.keys(microPaths).length} micro-states drawn as point symbols because no
// polygon exists for them at this scale. See the generator for why these are
// three tables rather than one — the short version is that COUNTRY_PATHS' keys
// decide what the Country Locator can ask about, so it holds only the countries
// that have a real shape to find.

export const MAP_W = ${W};
export const MAP_H = ${H};
export const WORLD_VIEWBOX = "0 0 ${W} ${H}";

// code (ISO alpha-2, lowercase) -> SVG path data in the viewBox above.
export const COUNTRY_PATHS = {
${table(countryPaths)}
};

// Non-sovereign landmasses — territories, disputed areas and Antarctica.
// Real geometry, same projection; kept apart from COUNTRY_PATHS so no quiz
// pool can pick one up as a country. See src/data/territories.js.
export const TERRITORY_PATHS = {
${table(territoryPaths)}
};

// Micro-states, as point symbols at their Natural Earth label coordinate.
// A dot carries position but not shape, which is why these are not Locator
// answers — see the generator header.
export const MICRO_PATHS = {
${table(microPaths)}
};

// The same micro-states as bare [x, y] points, for anything that wants to
// place a label or a marker without re-deriving the centre from the circle.
export const MICRO_POINTS = {
${pointTable(microPoints)}
};

// Everything that should be drawn on a map of the world. Map surfaces read
// this; gameplay reads the narrower tables above.
export const MAP_PATHS = { ...COUNTRY_PATHS, ...TERRITORY_PATHS, ...MICRO_PATHS };

// Longitude/latitude -> viewBox coordinates (same projection as the paths).
export const projectLngLat = (lng, lat) => [(lng + 180) * ${SCALE}, (90 - lat) * ${SCALE}];
`;

writeFileSync(join(root, "src/data/worldMap.js"), out);
const total = Object.keys(countryPaths).length + Object.keys(microPaths).length;
console.log(
  `wrote src/data/worldMap.js — ${total}/${known.size} countries on the map ` +
    `(${Object.keys(countryPaths).length} drawn, ${Object.keys(microPaths).length} as points), ` +
    `${Object.keys(territoryPaths).length}/${territoryCodes.size} territories, ${out.length} bytes`
);
if (unplaced.length) {
  console.warn(`  ! no geometry and no label point, so NOT on the map: ${unplaced.join(" ")}`);
}
