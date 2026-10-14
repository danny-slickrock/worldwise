// The world's oceans and the sovereign states they border, for Oceans
// (M2.7 step 8) — the third and last of the milestone's FEATURE-based games.
//
// Same data model Rivers (step 6.1) and Mountains (step 7.1) settled: keyed
// by the FEATURE rather than by country code, because an ocean borders many
// countries at once the same way a river or a range does. This file is
// keyed by OCEAN, each entry carrying every sovereign state that has a
// coastline on it — the question this feeds (step 8.2) asks "which of these
// countries borders the Pacific Ocean?", drawing its correct answer from
// `countries` and its distractors from everyone else.
//
// Deliberately no `foodOrigin.js`-style `primary` claimant: which countries
// border an ocean is an uncontroversial, verifiable geographic fact, not a
// judgment call, so every entry's `countries` are all equally correct
// answers, exactly like Rivers and Mountains.
//
// The Southern (Antarctic) Ocean is deliberately NOT an entry here. Its only
// landmass is Antarctica, which has no resolved sovereign claim and is not
// one of the 196 states in `countries.js` — so unlike every river or range,
// it has no "which country" question to ask at all, the same reason a
// single-country river or range is left out of its own catalog.
//
// A country's OWN coastline, not its hydrological drainage basin, decides
// membership — so a landlocked-adjacent marginal sea doesn't pull in a
// country that never actually touches the open ocean. Two judgment calls
// worth a second pair of eyes before a classroom relies on this, the same
// "worth a second pair of eyes" note every other hand-compiled file in this
// directory already carries:
//   - A country bordering ONLY an enclosed/connected sea that geographers
//     commonly treat as its own region (the Mediterranean, the Baltic, the
//     Black Sea) is not counted as "Atlantic" here, even though those seas
//     drain into the Atlantic — the same reason nobody calls Switzerland
//     Atlantic for sitting in the Rhine's watershed. A country with BOTH
//     that kind of coastline AND a true open-ocean coastline (e.g. Spain,
//     Morocco, Egypt, Thailand) is counted for the ocean it actually
//     touches.
//   - The Arctic Ocean's list is deliberately short: only the four states
//     whose own mainland (not a dependent territory) reaches it — Russia,
//     Norway, Canada, the United States (via Alaska). Greenland reaches the
//     Arctic too, but Greenland is a territory in `territories.js`, not a
//     sovereign state, so it carries no code here the way Denmark's own
//     mainland coastline (the North Sea) does not reach the Arctic either.
//
// Hand-compiled general knowledge, the same spirit as rivers.js/
// mountains.js and the per-country files before them.
export const OCEANS = [
  {
    name: "Pacific Ocean",
    countries: [
      "ru",
      "jp",
      "kp",
      "kr",
      "cn",
      "tw",
      "ph",
      "vn",
      "th",
      "kh",
      "my",
      "bn",
      "id",
      "sg",
      "pg",
      "au",
      "nz",
      "fj",
      "sb",
      "vu",
      "pw",
      "fm",
      "mh",
      "nr",
      "ki",
      "tv",
      "ws",
      "to",
      "us",
      "ca",
      "mx",
      "gt",
      "sv",
      "hn",
      "ni",
      "cr",
      "pa",
      "co",
      "ec",
      "pe",
      "cl",
    ],
  },
  {
    name: "Atlantic Ocean",
    countries: [
      "pt",
      "es",
      "fr",
      "ie",
      "gb",
      "is",
      "no",
      "dk",
      "de",
      "nl",
      "be",
      "ma",
      "mr",
      "sn",
      "gm",
      "gw",
      "gn",
      "sl",
      "lr",
      "ci",
      "gh",
      "tg",
      "bj",
      "ng",
      "cm",
      "gq",
      "ga",
      "cg",
      "cd",
      "ao",
      "na",
      "za",
      "br",
      "uy",
      "ar",
      "ve",
      "gy",
      "sr",
      "co",
      "mx",
      "bz",
      "gt",
      "hn",
      "ni",
      "cr",
      "pa",
      "cu",
      "jm",
      "ht",
      "do",
      "bs",
      "tt",
      "bb",
      "gd",
      "lc",
      "vc",
      "kn",
      "ag",
      "dm",
      "us",
      "ca",
    ],
  },
  {
    name: "Indian Ocean",
    countries: [
      "eg",
      "sd",
      "er",
      "dj",
      "so",
      "ye",
      "sa",
      "kw",
      "qa",
      "bh",
      "ae",
      "om",
      "ir",
      "iq",
      "ke",
      "tz",
      "mz",
      "za",
      "mg",
      "km",
      "mu",
      "sc",
      "pk",
      "in",
      "bd",
      "lk",
      "mv",
      "mm",
      "th",
      "id",
      "tl",
      "au",
    ],
  },
  {
    name: "Arctic Ocean",
    countries: ["ru", "no", "ca", "us"],
  },
];

export function countriesForOcean(name) {
  return OCEANS.find((o) => o.name === name)?.countries ?? null;
}

export function oceansThrough(code) {
  return OCEANS.filter((o) => o.countries.includes(code)).map((o) => o.name);
}

// Every distinct ocean NAME in the catalog — same convention
// RIVER_NAMES/MOUNTAIN_RANGE_NAMES use, kept here rather than recomputed at
// every call site.
export const OCEAN_NAMES = OCEANS.map((o) => o.name);
