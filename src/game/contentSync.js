// Pure translation between the country-page shape the app renders and the
// content.countries rows from the M2.3.5 migration. No storage, network, or
// React imports — same discipline as cloudSync.js, so every rule here is
// unit-testable in plain Node.
//
//   page (camelCase)          content.countries (snake_case)
//   ----------------------    ------------------------------
//   areaKm2                →  area_km2
//   relatedGameModes       →  related_game_modes
//   noOutline              →  has_outline   (inverted)
//   hasFullContent         →  (derived — see below)
//
// Both directions live here because both are needed: page→row seeds Postgres
// from the bundled JSON (scripts/seed-content.mjs), row→page renders a fetched
// country. Keeping them adjacent is what makes a round-trip test meaningful.

// Game modes suggested when a row carries none. Mirrors the bundled default in
// data/countryPages.js so a fetched page and a bundled page agree.
const DEFAULT_RELATED_MODES = ["flag", "capital", "shape", "locator"];

// Build the content.countries row for one country. `page` is the shape
// getCountryPage() returns; `difficulty` comes from the base country record,
// which the page shape doesn't carry.
export function countryRowFromPage(page, difficulty = null) {
  return {
    code: page.code,
    name: page.name,
    capital: page.capital ?? null,
    region: page.region ?? null,
    difficulty: difficulty ?? null,
    summary: page.summary ?? null,
    population: page.population ?? null,
    area_km2: page.areaKm2 ?? null,
    lat: page.lat ?? null,
    lng: page.lng ?? null,
    // The bundled flag is negative (noOutline), the column is positive — an
    // absent outline is the exception, so the column defaults to true.
    has_outline: !page.noOutline,
    neighbors: page.neighbors ?? [],
    related_game_modes: page.relatedGameModes ?? DEFAULT_RELATED_MODES,
    facts: page.facts ?? {},
  };
}

// Read a content.countries row back into the page shape. Returns null for a
// missing row so callers can tell "no such country" from "a country with empty
// fields" and fall back to the bundled baseline.
export function pageFromCountryRow(row) {
  if (!row || typeof row !== "object" || !row.code) return null;

  const facts = isPlainObject(row.facts) ? row.facts : {};
  const neighbors = Array.isArray(row.neighbors) ? row.neighbors : [];
  const relatedGameModes = Array.isArray(row.related_game_modes) && row.related_game_modes.length
    ? row.related_game_modes
    : DEFAULT_RELATED_MODES;

  return {
    code: row.code,
    name: row.name,
    capital: row.capital ?? null,
    region: row.region ?? null,
    summary: row.summary ?? null,
    // PostgREST can serialize numeric/bigint as a string; coerce so the UI's
    // arithmetic (compact(), area formatting) never lands on "8515767" as text.
    population: num(row.population),
    areaKm2: num(row.area_km2),
    lat: num(row.lat),
    lng: num(row.lng),
    neighbors,
    relatedGameModes,
    facts: Object.keys(facts).length ? facts : null,
    // Authored depth, not merely "a row exists" — every country gets a row once
    // seeded, so row-existence would report true for all 196. Population, area,
    // and facts are the fields only a hand-authored entry fills in.
    hasFullContent:
      row.population != null || row.area_km2 != null || Object.keys(facts).length > 0,
    // The column is positive, the page flag is negative. A null column (older
    // row, pre-default) is treated as "has an outline" — the common case.
    noOutline: row.has_outline === false,
  };
}

// Coerce a Postgres number that may arrive as a string. Returns null rather
// than NaN so `page.population ? ... : null` checks in the UI stay truthy-safe.
function num(v) {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function isPlainObject(v) {
  return Boolean(v) && typeof v === "object" && !Array.isArray(v);
}
