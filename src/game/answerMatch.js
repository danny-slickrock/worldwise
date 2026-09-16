// PURE typed-answer matching (M2.12 step 3).
//
// Three states, never two: `match` (right), `close` (right enough — a typo),
// and `miss`. The middle state is the whole reason this file exists: a typing
// game that rejects "Kyrgystan" for "Kyrgyzstan" is testing spelling, not
// geography, and this app is not a spelling bee.
//
// THE CONSTRAINT THAT SETS THE THRESHOLD, and the thing not to loosen:
// several real country names sit ONE edit apart.
//
//     iceland / ireland   1 edit
//     iran    / iraq      1 edit
//     gambia  / zambia    1 edit
//
// Those are different countries, on different continents. A matcher with a
// blanket "one typo is fine" rule accepts Iran for Iraq, which is worse than
// rejecting a typo — it teaches the wrong fact and calls it right. A ratio
// threshold is what makes this safe, because it scales with length: at 0.9 a
// 4-letter name needs to be exact, a 7-letter name still needs to be exact
// (6/7 = 0.857), and only names of 10+ characters can absorb an edit at all —
// and no two country names that long are anywhere near each other.
//
// So legitimate ALTERNATIVE NAMES are handled by the alias table below, never
// by loosening the fuzz. "Brasil" is not a typo for "Brazil" that we should
// tolerate by distance (5/6 = 0.833 would fail anyway) — it is a different
// correct spelling, and it belongs in a list of known names.
//
// Pure: no React, no storage, no network. Driven directly from
// test/engine.test.js against the real dataset.

import { ANSWER_CLOSE_RATIO } from "../constants";

// Strip diacritics, case, punctuation and filler so "Côte d'Ivoire",
// "cote divoire" and "COTE D IVOIRE" are one string.
//
// NFD splits an accented character into its base letter plus a combining mark,
// which the range below then removes — so this handles every accent in the
// dataset (and every one it might grow) rather than a hand-listed few.
export function normalize(input) {
  if (typeof input !== "string") return "";
  return (
    input
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      // Punctuation becomes a space rather than nothing: "guinea-bissau" and
      // "guinea bissau" should agree, and deleting the hyphen outright would
      // instead produce "guineabissau".
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      // A leading article is noise in every name it appears in ("the Gambia",
      // "the Netherlands"), and nobody should lose a point for it.
      .replace(/^(the|republic of|kingdom of|state of) /, "")
      .replace(/\s+/g, " ")
  );
}

// Known alternative names, normalized on both sides at lookup time so the
// table can be written the way a person would say them.
//
// This is the sanctioned way to accept a variant. Everything here is a name
// someone legitimately uses — an endonym, a former name, an abbreviation or a
// common English spelling — not a misspelling. Adding a near-miss here to make
// a test pass is how Iran-for-Iraq eventually gets in.
const ALIASES = {
  // Abbreviations and initialisms.
  usa: "united states",
  us: "united states",
  "united states of america": "united states",
  america: "united states",
  uk: "united kingdom",
  "great britain": "united kingdom",
  britain: "united kingdom",
  england: "united kingdom",
  uae: "united arab emirates",
  drc: "democratic republic of the congo",
  "dr congo": "democratic republic of the congo",
  car: "central african republic",

  // Former or alternative official names.
  burma: "myanmar",
  swaziland: "eswatini",
  holland: "netherlands",
  "czech republic": "czechia",
  "cape verde": "cabo verde",
  "east timor": "timor leste",
  "ivory coast": "cote d ivoire",
  macedonia: "north macedonia",
  turkey: "turkiye",
  persia: "iran",
  "vatican city": "vatican",
  "holy see": "vatican",

  // Common English spellings of the same name.
  brasil: "brazil",
  columbia: "colombia",
  phillipines: "philippines",

  // Short forms of long official names.
  "south korea": "south korea",
  "republic of korea": "south korea",
  "north korea": "north korea",
  "democratic peoples republic of korea": "north korea",
  "republic of the congo": "congo",
  "congo brazzaville": "congo",
  "congo kinshasa": "democratic republic of the congo",
};

// Resolve a normalized string through the alias table. One hop only: aliases
// point at canonical names, never at other aliases, so there is no chain to
// follow and no cycle to guard against.
export function canonical(input) {
  const n = normalize(input);
  return ALIASES[n] ?? n;
}

// Levenshtein edit distance, two rows rather than a full matrix — the answer
// set is small, but this runs on every keystroke in the suggestion path.
export function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  let curr = new Array(b.length + 1);
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      curr[j] = Math.min(
        prev[j] + 1, // deletion
        curr[j - 1] + 1, // insertion
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1) // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}

// 1 for identical, 0 for nothing in common. Normalized by the LONGER string,
// so adding characters is penalised as much as changing them — otherwise
// "guinea" scores well against "papua new guinea".
export function similarity(a, b) {
  if (!a.length && !b.length) return 1;
  const longest = Math.max(a.length, b.length);
  return longest === 0 ? 1 : 1 - levenshtein(a, b) / longest;
}

// THE function.
//
// `alternatives` is the round's other valid answers — the other options on the
// question, or the whole answer set. It exists for one specific failure: a
// player types a DIFFERENT real country and the fuzz happens to rate it close
// enough. Naming a real, wrong country is never a typo, so an exact hit on an
// alternative is a miss no matter what the ratio says. This is the backstop
// behind the threshold, not a replacement for it.
export function matchAnswer(input, correct, alternatives = []) {
  const typed = canonical(input);
  const target = canonical(correct);

  if (!typed) return "miss";
  if (typed === target) return "match";

  // Named a different real answer — not a typo, however close it scores.
  if (alternatives.some((alt) => canonical(alt) === typed && canonical(alt) !== target)) {
    return "miss";
  }

  return similarity(typed, target) >= ANSWER_CLOSE_RATIO ? "close" : "miss";
}

// Did this answer earn the point? `close` counts — that is the entire purpose
// of the middle state — but callers still get the three states so a surface
// can say "close enough: it's spelled …" rather than a silent tick.
export const isCorrectAnswer = (result) => result === "match" || result === "close";

// Autocomplete for the Medium tier: the answers worth offering for what has
// been typed so far.
//
// Prefix hits rank above substring hits, and both rank above nothing —
// somebody typing "gu" wants Guatemala and Guinea before Papua New Guinea.
// Deliberately NOT fuzzy: a suggestion list that guesses at misspellings
// would hand over the answer to someone who typed three wrong letters, which
// is the assist Hard exists to remove.
export function suggestAnswers(input, pool, limit = 6) {
  const typed = normalize(input);
  if (!typed) return [];

  const prefix = [];
  const contains = [];
  for (const candidate of pool) {
    const n = normalize(candidate);
    if (n.startsWith(typed)) prefix.push(candidate);
    else if (n.includes(typed)) contains.push(candidate);
  }
  return [...prefix, ...contains].slice(0, limit);
}
