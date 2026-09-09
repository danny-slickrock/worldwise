// The labelled sections of a country page's `facts`, in reading order.
//
// This is an ALLOWLIST, deliberately, and that predates the icons: `facts`
// arrives as a jsonb blob, so rendering whatever keys happen to be present
// would surface metadata (`_sources`) and every future field the moment it
// landed. It lived inline in CountryPageScreen; it moved here when the sections
// gained glyphs and colours, so the catalog can be tested and so a second
// surface (a learning path, a search result) can label a topic the same way.
//
// Glyphs follow data/interests.js: geometric Unicode, not emoji. Emoji render
// at a different weight per platform and would fight the mono/Archivo voice.
// The colour for each key lives in theme.js's `topicAccents` — catalog here,
// palette there, exactly as MODES (questions.js) and modeAccents (theme.js)
// are split.
export const COUNTRY_TOPICS = [
  { key: "physical_geography", label: "Landscape", glyph: "▲" },
  { key: "climate", label: "Climate", glyph: "☁" },
  { key: "economy", label: "Economy", glyph: "⚖" },
  { key: "people_and_culture", label: "People & culture", glyph: "◈" },
  // Pre-enrichment keys, kept so an older cached page or a hand-authored
  // override still renders rather than silently losing sections.
  { key: "trade", label: "Trade", glyph: "⇄" },
  { key: "culture", label: "Culture", glyph: "❖" },
];

export const COUNTRY_TOPIC_KEYS = COUNTRY_TOPICS.map((t) => t.key);

export function topicFor(key) {
  return COUNTRY_TOPICS.find((t) => t.key === key) ?? null;
}

// The topics a given `facts` object actually has content for, in reading order.
// Pure, so "which sections does this country show?" is answerable without a
// component — and so the empty case (no facts at all) is a tested one rather
// than an accident of rendering.
export function topicsPresent(facts) {
  if (!facts || typeof facts !== "object") return [];
  return COUNTRY_TOPICS.filter((t) => typeof facts[t.key] === "string" && facts[t.key].trim());
}
