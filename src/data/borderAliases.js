// PURE mapping from CIA World Factbook border-country names to our ISO codes.
//
// The Factbook names countries; content.countries stores two-letter codes, so
// every land border has to be resolved through here. Built from the actual
// names appearing across all 196 fetched countries, not guessed — 168 distinct
// border names, of which 157 matched our dataset directly.
//
// Two rules, and the second is the one that matters:
//
//   An ALIAS is the same place under a different name. The Factbook says
//   "Burma", we say "Myanmar"; it says "Cote d'Ivoire" without the diacritics,
//   we say "Côte d'Ivoire". These resolve to a code.
//
//   A NON-COUNTRY is a territory, dependency, disputed entity or installation.
//   These resolve to NOTHING, deliberately. Worldwise's coded neighbour
//   relations are between sovereign countries in our dataset; writing
//   `frenchGuiana = "fr"` would make Brazil border France, and calling any of
//   these a country in prose is the exact error the pilot review caught.
//   They stay available as display names so prose can still mention them
//   accurately — as territories.
export const BORDER_ALIASES = {
  // Same country, different naming convention.
  burma: "mm",
  "cote d'ivoire": "ci",
  "côte d'ivoire": "ci",
  "ivory coast": "ci",
  "czech republic": "cz",
  macedonia: "mk",
  "the gambia": "gm",
  "democratic republic of the congo": "cd",
  "congo, democratic republic of the": "cd",
  "republic of the congo": "cg",
  "congo, republic of the": "cg",
  "holy see": "va",
  "holy see (vatican city)": "va",
  "vatican city": "va",
  // Abbreviations the Factbook uses inside border lists.
  us: "us",
  usa: "us",
  "united states": "us",
  uk: "gb",
  "great britain": "gb",
  uae: "ae",
  "korea, north": "kp",
  "north korea": "kp",
  "korea, south": "kr",
  "south korea": "kr",
  "east timor": "tl",
  "timor-leste": "tl",
  "cabo verde": "cv",
  "cape verde": "cv",
  eswatini: "sz",
  swaziland: "sz",
  "turkiye": "tr",
  turkey: "tr",
};

// Not countries. Kept as an explicit, named list rather than an unmatched
// residue, so a genuinely new alias shows up as a validation failure instead of
// being silently swallowed as "probably a territory".
//
// Kosovo sits here for a different reason than the rest: it is a recognition
// dispute, and docs/content-response-policy.md says to stay out of those. It is
// absent from our country dataset, so it gets no code, and prose neither asserts
// nor denies its statehood.
export const NON_COUNTRY_BORDERS = new Set([
  "french guiana",
  "gibraltar",
  "gaza strip",
  "west bank",
  "kosovo",
  "us naval base at guantanamo bay",
  "guantanamo bay naval base",
  "greenland",
  "faroe islands",
  "hong kong",
  "macau",
  "western sahara",
]);

// Resolve one Factbook border name.
//
// Returns { code, name, isCountry }. `code` is null for a non-country, which is
// correct rather than a failure — callers filter those out of coded neighbour
// relations while keeping the name available for prose.
export function resolveBorderName(rawName, byName = new Map()) {
  const name = String(rawName ?? "").trim();
  if (!name) return { code: null, name: "", isCountry: false, known: false };

  const key = name.toLowerCase();
  if (NON_COUNTRY_BORDERS.has(key)) return { code: null, name, isCountry: false, known: true };

  const direct = byName.get(key);
  if (direct) return { code: direct, name, isCountry: true, known: true };

  const alias = BORDER_ALIASES[key];
  if (alias) return { code: alias, name, isCountry: true, known: true };

  // Unknown: neither a dataset name, an alias, nor a declared non-country. The
  // validation pass flags this rather than letting it disappear.
  return { code: null, name, isCountry: false, known: false };
}

// Parse the Factbook's "border countries" string into names.
//
// "Argentina 1,263 km; Bolivia 3,403 km" -> ["Argentina", "Bolivia"]
//
// The km figure can carry a decimal ("Zambia 0.15 km") and the field sometimes
// ends with a numbered note marker, both of which an integer-only pattern
// leaves glued to the name — that produced entries like "Zambia 0." on the
// first pass over all 196 countries.
export function parseBorderNames(raw) {
  if (!raw) return [];
  return String(raw)
    .split(";")
    .map((part) =>
      part
        .replace(/\s*[\d,.]+\s*km.*$/i, "")   // "Bolivia 3,403 km" / "Zambia 0.15 km"
        .replace(/\s*\d+\.\s*$/, "")           // trailing note marker: "Italy 3."
        .replace(/\([^)]*\)/g, "")             // parenthetical qualifiers
        .replace(/\s+/g, " ")
        .trim()
    )
    .filter(Boolean);
}
