// Major mountain ranges and the sovereign states they cross, for Mountains
// (M2.7 step 7) — the second of the milestone's three FEATURE-based games.
//
// Same data model Rivers (M2.7 step 6.1) settled: keyed by the FEATURE rather
// than by country code, because a range crosses several countries at once
// the same way a river does. `countries.js`/`languages.js`/
// `nationalAnimals.js`/`foodOrigin.js`/`cities.js` are all keyed by COUNTRY —
// one fact per country, because the subject of each of those questions IS a
// country. This file is keyed by RANGE instead, each entry carrying every
// country it crosses — the question this feeds (M2.7 step 7.2) asks "which
// of these countries does the Andes cross?", drawing its correct answer from
// `countries` and its distractors from everyone else.
//
// Deliberately no `foodOrigin.js`-style `primary` claimant: which countries a
// range crosses is an uncontroversial, verifiable geographic fact, not a
// judgment call, so every entry's `countries` are all equally correct
// answers — the engine (step 7.2) picks whichever one it asks about per
// question, exactly like Rivers.
//
// Every range here crosses at least two countries — a single-country range
// (the Urals sit entirely in Russia; the Ethiopian Highlands entirely in
// Ethiopia) has no "which country" question to ask, so those are left out on
// purpose rather than padding the catalog.
//
// Hand-compiled general knowledge, the same spirit as rivers.js and its
// per-country siblings — worth a second pair of eyes before a classroom
// relies on it. Ordered roughly by length/prominence within each continent
// grouping, not alphabetically.
export const MOUNTAIN_RANGES = [
  // ── Africa ──────────────────────────────────────────────
  { name: "Atlas Mountains", countries: ["ma", "dz", "tn"] },
  { name: "Drakensberg", countries: ["za", "ls"] },

  // ── Asia ────────────────────────────────────────────────
  { name: "Himalayas", countries: ["in", "np", "bt", "cn", "pk"] },
  { name: "Hindu Kush", countries: ["af", "pk"] },
  { name: "Tian Shan", countries: ["cn", "kg", "kz", "uz"] },
  { name: "Pamir Mountains", countries: ["tj", "af", "cn", "pk"] },
  { name: "Altai Mountains", countries: ["ru", "cn", "mn", "kz"] },
  { name: "Zagros Mountains", countries: ["ir", "iq"] },

  // ── Europe ──────────────────────────────────────────────
  {
    name: "Alps",
    countries: ["fr", "mc", "it", "ch", "li", "at", "de", "si"],
  },
  { name: "Pyrenees", countries: ["es", "fr", "ad"] },
  {
    name: "Carpathians",
    countries: ["cz", "pl", "sk", "ua", "ro", "hu", "rs"],
  },
  { name: "Caucasus Mountains", countries: ["ru", "ge", "az", "am"] },
  { name: "Dinaric Alps", countries: ["si", "hr", "ba", "me", "al", "rs"] },
  { name: "Balkan Mountains", countries: ["bg", "rs"] },
  { name: "Scandinavian Mountains", countries: ["no", "se"] },
  { name: "Jura Mountains", countries: ["fr", "ch"] },
  { name: "Sudetes", countries: ["cz", "pl", "de"] },

  // ── Americas ────────────────────────────────────────────
  { name: "Andes", countries: ["ve", "co", "ec", "pe", "bo", "cl", "ar"] },
  { name: "Rocky Mountains", countries: ["us", "ca"] },
  { name: "Appalachian Mountains", countries: ["us", "ca"] },
];

export function countriesForRange(name) {
  return MOUNTAIN_RANGES.find((r) => r.name === name)?.countries ?? null;
}

export function rangesThrough(code) {
  return MOUNTAIN_RANGES.filter((r) => r.countries.includes(code)).map((r) => r.name);
}

// Every distinct range NAME in the catalog — same convention
// RIVER_NAMES/CURRENCY_NAMES/LANGUAGE_NAMES/NATIONAL_ANIMAL_NAMES/
// FOOD_NAMES/CITY_NAMES use, kept here rather than recomputed at every call
// site.
export const MOUNTAIN_RANGE_NAMES = MOUNTAIN_RANGES.map((r) => r.name);
