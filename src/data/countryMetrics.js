// Comparable numbers per country, for Higher or Lower (extra game modes).
//
// A thin accessor over the promoted content in countryContent.js, not a second
// copy of it. Everything here is bundled and synchronous — a round builder runs
// during render and cannot wait on a network call, and the enrichment pass
// already put population, area and land borders in the bundle as the offline
// baseline. Postgres holds the same values; this is the offline half of that
// same data, so the two cannot disagree.
//
// `borderCount` is derived rather than stored: `neighbors` is the coded
// land-border list, which deliberately excludes territories (French Guiana is
// not a country Brazil borders), so its length is the honest count.
import { COUNTRY_CONTENT } from "./countryContent";
import { COUNTRIES } from "./countries";

const NAMES = new Map(COUNTRIES.map((c) => [c.code, c.name]));

// code -> { code, name, population, areaKm2, borderCount }
export const COUNTRY_METRICS = {};
for (const [code, entry] of Object.entries(COUNTRY_CONTENT)) {
  const name = NAMES.get(code);
  if (!name) continue;
  COUNTRY_METRICS[code] = {
    code,
    name,
    population: typeof entry.population === "number" ? entry.population : null,
    areaKm2: typeof entry.areaKm2 === "number" ? entry.areaKm2 : null,
    borderCount: Array.isArray(entry.neighbors) ? entry.neighbors.length : null,
  };
}

// Countries usable for a given metric. A country missing the value is excluded
// rather than defaulted to zero — a fabricated zero would make it the wrong
// answer to a question it should never have been asked.
export function metricPool(field) {
  return Object.values(COUNTRY_METRICS).filter(
    (m) => typeof m[field] === "number" && Number.isFinite(m[field])
  );
}

export function metricValue(code, field) {
  const v = COUNTRY_METRICS[code]?.[field];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}
