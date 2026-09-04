// PURE interest-aware re-ranking for RAG retrieval (M2.9 step 3, pulling
// forward the ranking half of step 6). No network, no storage.
//
// Two rules from the roadmap are load-bearing here, and both are easy to
// destroy with an innocent-looking change:
//
//   **Re-rank, never filter.** Interests reorder what surfaces; they never make
//   content unreachable. Someone who picked Tourism can still read about a
//   country's economy. The goal is a better first impression, not a bubble —
//   and for a learning product aimed at students, a filter that quietly hides
//   material is a worse failure than a mediocre ordering.
//
//   **Degrade to general.** Zero interests — the skip path, which the interests
//   prompt treats as a first-class answer — yields the unweighted ordering
//   everyone gets. That path is the default, not an edge case.

// Which chunk sources speak to which interest. Matched as substrings against a
// chunk's `source` ("summary", "geography", "facts.trade"), so a fact key added
// later is picked up without touching this table as long as it uses an obvious
// word. Unknown interests simply match nothing — a retired slug from an old
// client degrades to no boost rather than an error.
export const INTEREST_SOURCE_HINTS = {
  economics: ["trade", "econom", "industry", "export"],
  history: ["history", "histor"],
  agriculture: ["agricultur", "farm", "crop"],
  military: ["military", "defen", "conflict"],
  tourism: ["tourism", "travel", "landmark"],
  geopolitics: ["geography", "border", "politic", "geopolit"],
  climate: ["climate", "environment", "weather"],
  culture: ["culture", "language", "religion", "cultur"],
  wildlife: ["wildlife", "nature", "species", "biodivers"],
  food: ["food", "cuisine", "dish"],
};

// How much a matching chunk's score is nudged. Deliberately small: it should
// break ties and lift a near-miss, not drag an irrelevant chunk above a
// directly-responsive one. A boost large enough to reorder unrelated results
// would make answers worse while looking personalized.
export const INTEREST_BOOST = 0.06;

// Does this chunk speak to any of these interests?
export function matchesInterests(source, interestSlugs = []) {
  const haystack = String(source ?? "").toLowerCase();
  if (!haystack) return false;
  return (interestSlugs ?? []).some((slug) =>
    (INTEREST_SOURCE_HINTS[slug] ?? []).some((hint) => haystack.includes(hint))
  );
}

// Reorder retrieved chunks by interest, without dropping any.
//
// Returns a new array; each chunk gains `adjustedScore` and `interestMatched`
// so a caller can show why something surfaced. Sorting is stable: equal scores
// keep retrieval order, so the same inputs always produce the same answer —
// which matters for the eval set in step 6.
export function rerankByInterests(chunks = [], interestSlugs = [], boost = INTEREST_BOOST) {
  const list = Array.isArray(chunks) ? chunks : [];
  const slugs = Array.isArray(interestSlugs) ? interestSlugs.filter(Boolean) : [];

  // Degrade to general: the unweighted ordering, untouched.
  if (!slugs.length) {
    return list.map((c) => ({ ...c, adjustedScore: c.similarity ?? 0, interestMatched: false }));
  }

  const scored = list.map((chunk, index) => {
    const interestMatched = matchesInterests(chunk.source, slugs);
    return {
      ...chunk,
      index,
      interestMatched,
      adjustedScore: (chunk.similarity ?? 0) + (interestMatched ? boost : 0),
    };
  });

  scored.sort((a, b) =>
    b.adjustedScore === a.adjustedScore ? a.index - b.index : b.adjustedScore - a.adjustedScore
  );

  return scored.map(({ index, ...chunk }) => chunk);
}
