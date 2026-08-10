// M2.3.6 step 2 — the interest catalog (pure data: no RN, no network).
//
// Stable slugs are what actually gets persisted (profile_interests, step 3)
// and compared against (interestPolicy.js) — never the display label, so
// relabeling or reordering an interest never needs a migration or a data
// backfill. Order here is display order.
export const INTERESTS = [
  { slug: "economics", label: "Economics", glyph: "⚖" },
  { slug: "history", label: "History", glyph: "❖" },
  { slug: "agriculture", label: "Agriculture", glyph: "❀" },
  { slug: "military", label: "Military", glyph: "⚔" },
  { slug: "tourism", label: "Tourism", glyph: "✈" },
  { slug: "geopolitics", label: "Geopolitics", glyph: "⬡" },
  { slug: "climate", label: "Climate", glyph: "☁" },
  { slug: "culture", label: "Culture", glyph: "◈" },
  { slug: "wildlife", label: "Wildlife", glyph: "☘" },
  { slug: "food", label: "Food", glyph: "☕" },
];

export const INTEREST_SLUGS = INTERESTS.map((i) => i.slug);
