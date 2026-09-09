// Each country's terrain class, resolved once at module load from its own
// Factbook-derived climate and landform prose.
//
// This is the join between the pure classifier (game/terrainTint.js) and the
// content the repo already holds (data/countryContent.js). It lives in data/
// rather than game/ for the same reason countryMetrics.js does: it is a derived
// LOOKUP over the bundled dataset, not a rule.
//
// Static data in, static map out. GlobeMap reprojects 8,190 points per frame
// and must never be doing string matching while it does.
import { COUNTRY_CONTENT } from "./countryContent";
import { COUNTRIES } from "./countries";
import { COUNTRY_CENTERS } from "./worldGeo";
import { vecToLngLat } from "../game/globeProjection";
import { classifyTerrain, bandFromLatitude } from "../game/terrainTint";

const byCode = {};

for (const country of COUNTRIES) {
  const facts = COUNTRY_CONTENT[country.code]?.facts ?? {};
  const center = COUNTRY_CENTERS[country.code];
  // A country with no globe polygon has no centre either; latitude then has
  // nothing to fall back to, and classifyTerrain's own default takes over.
  const latitude = center ? vecToLngLat(center)[1] : null;
  byCode[country.code] = classifyTerrain({
    climate: facts.climate,
    geography: facts.physical_geography,
    // The "why it matters" blurb is the third source, and it earns its place:
    // Brazil's climate line says only "mostly tropical", while its summary is
    // the thing that mentions the Amazon.
    summary: COUNTRY_CONTENT[country.code]?.summary,
    latitude,
  });
}

export const COUNTRY_TERRAIN = byCode;

// The terrain class for one country. Falls back to a latitude band for a code
// the dataset doesn't carry, so a caller never has to handle null.
export function terrainClass(code, latitude = null) {
  return byCode[code]?.terrain ?? bandFromLatitude(latitude);
}

// How each class was decided, for the "why is Chile that colour?" question.
// Not used by the app; used by the tests and worth keeping reachable.
export function terrainSource(code) {
  return byCode[code]?.source ?? "latitude";
}
