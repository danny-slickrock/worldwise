// Country-page content model (M2.2) — the "why should I care?" hub for a single
// place: a short story, key facts, neighbors, and games to jump into.
//
// As of M2.3.5 this data lives in Postgres too (content.countries), but this
// module didn't become redundant — it now serves both ends of that move. It's
// the *seed source* (scripts/seed-content.mjs pushes it up through
// getCountryPage) and the *offline baseline* the fetch layer falls back to
// (src/data/contentSource.js). Seeding through the same accessor the app reads
// is deliberate: it means Postgres holds exactly what renders offline, instead
// of a second merge rule that could drift from this one.
//
// COUNTRY_PAGES holds hand-authored entries; most countries don't have one yet.
// Always read through getCountryPage(code), which fills gaps from countries.js
// and whyItMatters.js so every country renders a reasonable page today.
import { COUNTRIES } from "./countries";
import { whyItMatters } from "./whyItMatters";
import { COUNTRY_CONTENT } from "./countryContent";

// Game modes worth suggesting from a country page. "daily" is a mixed round,
// not about one country, so it's excluded here (see MODES in game/questions.js).
const DEFAULT_RELATED_MODES = ["flag", "capital", "shape", "locator"];

// Hand-authored overrides, keyed by ISO code. These win over the generated
// content in countryContent.js, field by field, so a human correction never
// needs a re-promotion to take effect.
//
// Brazil's entry used to hold a full hand-written page. The enrichment pass
// supersedes it — including a corrected hook that no longer counts French
// Guiana, a French territory, as one of Brazil's neighbouring countries — so
// only the fields the generated set does not carry remain here. Coordinates are
// the notable one: the Wikidata query does not fetch them yet, so they would be
// lost on promotion.
export const COUNTRY_PAGES = {
  br: {
    lat: -14.235,
    lng: -51.9253,
  },
};

// Pure accessor: merges a hand-authored page (if any) with the base country
// record, so every known country returns a usable page. Returns null only if
// the code isn't in the dataset at all.
export function getCountryPage(code) {
  const country = COUNTRIES.find((c) => c.code === code);
  if (!country) return null;

  // Generated content first, hand-authored overrides on top. Spreading in this
  // order is what makes an override an override; reversing it would let a stale
  // hand-written field quietly shadow reviewed content.
  const generated = COUNTRY_CONTENT[code];
  const overrides = COUNTRY_PAGES[code];
  const page = generated || overrides ? { ...generated, ...overrides } : null;
  return {
    code: country.code,
    name: country.name,
    capital: country.capital,
    region: country.region,
    summary: page?.summary ?? whyItMatters(country),
    population: page?.population ?? null,
    areaKm2: page?.areaKm2 ?? null,
    lat: page?.lat ?? null,
    lng: page?.lng ?? null,
    neighbors: page?.neighbors ?? [],
    relatedGameModes: page?.relatedGameModes ?? DEFAULT_RELATED_MODES,
    facts: page?.facts ?? null,
    hasFullContent: Boolean(page),
    noOutline: Boolean(country.noOutline),
  };
}
