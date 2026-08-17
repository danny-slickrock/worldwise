// The globe's geometry (M2.3.7), derived at module load from the same
// data/worldMap.js the flat map has used since Day 4 — not a second dataset.
//
// worldMap.js stores equirectangular *pixels*, but that projection is linear
// (x = (lng+180)*2, y = (90-lat)*2), so it inverts exactly. Recovering the
// sphere from it costs one pass at startup and keeps a single source of truth
// for country geometry: a regenerated worldMap.js updates the flat map and the
// globe together, and they can never disagree about where a border runs.
//
// Everything here is derived, never hand-edited. To change the shapes, rerun
// scripts/build-worldmap.mjs.
import { COUNTRY_PATHS } from "./worldMap";
import { ringsFromPath, countryCenter } from "../game/globeProjection";

// code -> array of rings, each a flat Float64Array of unit vectors [x,y,z,...].
export const COUNTRY_RINGS = {};
// code -> the unit vector the country sits on, for facing checks and for
// aiming a rotation at it.
export const COUNTRY_CENTERS = {};

for (const [code, d] of Object.entries(COUNTRY_PATHS)) {
  const rings = ringsFromPath(d);
  if (!rings.length) continue;
  COUNTRY_RINGS[code] = rings;
  const center = countryCenter(rings);
  if (center) COUNTRY_CENTERS[code] = center;
}

export const GLOBE_COUNTRY_CODES = Object.keys(COUNTRY_RINGS);
