// Major rivers and the sovereign states they flow through, for Rivers (M2.7
// step 6) — the first of the milestone's three FEATURE-based games.
//
// M2.7 step 6.1 settles the planning question ROADMAP.md flagged before this
// step started: what IS the answer surface for a feature that isn't one
// country? Multiple choice over NAMES stays the safe default, the same shape
// every other M2.7 mode already uses — but here the thing being named is a
// COUNTRY, and the subject of the question is the river itself. That is the
// genuinely different data model the roadmap called out: `currencies.js`/
// `languages.js`/`nationalAnimals.js`/`foodOrigin.js`/`cities.js` are all
// keyed by COUNTRY code, one fact per country, because the subject of every
// one of those questions IS a country. A river touches several countries at
// once, so this file is keyed by RIVER instead, each entry carrying every
// country it flows through — the question this feeds (M2.7 step 6.2) asks
// "which of these countries does the Nile flow through?", drawing its
// correct answer from `countries` and its distractors from everyone else.
//
// Deliberately NOT a `primary` per-river country the way `foodOrigin.js`
// picks one claimant for a shared dish: which countries a river flows
// through is an uncontroversial, verifiable geographic fact (unlike "origin"
// or "national animal"), so there is no judgment call to make here — every
// entry's `countries` are all equally correct answers, and the engine (step
// 6.2) picks whichever one it asks about per question.
//
// Every river here touches at least two countries — that's the whole reason
// this is a feature-based file rather than a `COUNTRIES`-keyed one. A
// single-country river (the Yangtze, the Mississippi) has no "which country"
// question to ask, so those are left out on purpose rather than padding the
// catalog.
//
// Hand-compiled general knowledge, the same spirit as currencies.js/
// languages.js/nationalAnimals.js/foodOrigin.js/cities.js — worth a second
// pair of eyes before a classroom relies on it. Ordered roughly by length/
// prominence within each continent grouping, not alphabetically.
export const RIVERS = [
  // ── Africa ──────────────────────────────────────────────
  {
    name: "Nile",
    countries: ["eg", "sd", "ss", "ug", "et", "cd", "ke", "rw", "bi", "tz"],
  },
  { name: "Congo River", countries: ["cd", "cg", "cf", "ao", "zm", "tz"] },
  { name: "Niger River", countries: ["gn", "ml", "ne", "bj", "ng"] },
  { name: "Zambezi", countries: ["zm", "ao", "na", "bw", "zw", "mz"] },
  { name: "Senegal River", countries: ["gn", "ml", "mr", "sn"] },
  { name: "Volta River", countries: ["bf", "gh"] },
  { name: "Limpopo River", countries: ["za", "bw", "zw", "mz"] },
  { name: "Okavango River", countries: ["ao", "na", "bw"] },

  // ── Asia ────────────────────────────────────────────────
  { name: "Mekong", countries: ["cn", "mm", "la", "th", "kh", "vn"] },
  { name: "Ganges", countries: ["in", "bd"] },
  { name: "Indus", countries: ["cn", "in", "pk"] },
  { name: "Amur", countries: ["ru", "cn", "mn"] },
  { name: "Euphrates", countries: ["tr", "sy", "iq"] },
  { name: "Tigris", countries: ["tr", "iq", "sy"] },

  // ── Europe ──────────────────────────────────────────────
  {
    name: "Danube",
    countries: ["de", "at", "sk", "hu", "hr", "rs", "bg", "ro", "md", "ua"],
  },
  { name: "Rhine", countries: ["ch", "li", "at", "de", "fr", "nl"] },
  { name: "Elbe", countries: ["cz", "de"] },
  { name: "Oder", countries: ["cz", "pl", "de"] },
  { name: "Dniester", countries: ["ua", "md"] },
  { name: "Meuse", countries: ["fr", "be", "nl"] },

  // ── Americas ────────────────────────────────────────────
  { name: "Amazon", countries: ["br", "pe", "co", "ec", "bo", "ve", "gy", "sr"] },
  { name: "Orinoco", countries: ["ve", "co"] },
  { name: "Paraná", countries: ["br", "py", "ar"] },
  { name: "Rio Grande", countries: ["us", "mx"] },
  { name: "Saint Lawrence River", countries: ["us", "ca"] },
  { name: "Columbia River", countries: ["us", "ca"] },
];

export function countriesForRiver(name) {
  return RIVERS.find((r) => r.name === name)?.countries ?? null;
}

export function riversThrough(code) {
  return RIVERS.filter((r) => r.countries.includes(code)).map((r) => r.name);
}

// Every distinct river NAME in the catalog — same convention
// CURRENCY_NAMES/LANGUAGE_NAMES/NATIONAL_ANIMAL_NAMES/FOOD_NAMES/CITY_NAMES
// use, kept here rather than recomputed at every call site.
export const RIVER_NAMES = RIVERS.map((r) => r.name);
