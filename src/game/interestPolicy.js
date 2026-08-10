// M2.3.6 step 2 — pure interest-selection logic. No RN or network imports,
// so test/engine.test.js can exercise it directly under tsx.
import { INTEREST_SLUGS } from "../data/interests";

const VALID_SLUGS = new Set(INTEREST_SLUGS);

export function isValidInterestSlug(slug) {
  return VALID_SLUGS.has(slug);
}

// Drops unknown slugs (an old client may still hold a retired one) and
// dedupes, then orders the result by the catalog's own display order — so
// two selections made in a different click order, or round-tripped through
// storage/cloud, always compare equal.
export function normalizeInterests(selection) {
  if (!Array.isArray(selection)) return [];
  const kept = new Set(selection.filter(isValidInterestSlug));
  return INTEREST_SLUGS.filter((slug) => kept.has(slug));
}
