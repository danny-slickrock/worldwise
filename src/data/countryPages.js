// Country-page content model (M2.2) — the "why should I care?" hub for a single
// place: a short story, key facts, neighbors, and games to jump into. Kept as
// versioned JSON (not Postgres) per docs/phase-2-data-model.md — content only
// earns a database once it must be queried alongside user data.
//
// COUNTRY_PAGES holds hand-authored entries; most countries don't have one yet.
// Always read through getCountryPage(code), which fills gaps from countries.js
// and whyItMatters.js so every country renders a reasonable page today.
import { COUNTRIES } from "./countries";
import { whyItMatters } from "./whyItMatters";

// Game modes worth suggesting from a country page. "daily" is a mixed round,
// not about one country, so it's excluded here (see MODES in game/questions.js).
const DEFAULT_RELATED_MODES = ["flag", "capital", "shape", "locator"];

// Hand-authored entries, keyed by ISO code. Brazil is the hero reference for
// M2.2 — fully fleshed out so the first CountryPage screen has real content to
// be built against. Fill in more countries opportunistically; getCountryPage()
// degrades gracefully for anyone missing here.
export const COUNTRY_PAGES = {
  br: {
    summary:
      "Brazil is the giant of South America — bigger than the contiguous United States minus Alaska, " +
      "and home to more of the Amazon than any other nation. It borders every country on the continent " +
      "except Chile and Ecuador, a reach that makes it a hub for trade, culture, and biodiversity all at " +
      "once. From Rio's Carnival to São Paulo's skyline to the river towns deep in the rainforest, Brazil " +
      "holds more ecological and cultural range than almost anywhere else on Earth.",
    population: 216_422_446,
    areaKm2: 8_515_767,
    lat: -14.235,
    lng: -51.9253,
    neighbors: ["ar", "bo", "co", "gy", "py", "pe", "sr", "uy", "ve"],
    relatedGameModes: ["flag", "capital", "shape", "locator"],
    facts: {
      climate:
        "Mostly tropical, but the south dips into subtropical territory with real seasons and occasional frost.",
      trade:
        "One of the world's largest exporters of soybeans, coffee, and iron ore — agriculture and mining anchor the economy.",
      culture:
        "Portuguese is the only official language, the legacy of colonization, making Brazil the sole Portuguese-speaking giant in a Spanish-speaking continent.",
    },
  },
};

// Pure accessor: merges a hand-authored page (if any) with the base country
// record, so every known country returns a usable page. Returns null only if
// the code isn't in the dataset at all.
export function getCountryPage(code) {
  const country = COUNTRIES.find((c) => c.code === code);
  if (!country) return null;

  const page = COUNTRY_PAGES[code];
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
  };
}
