// PURE marathon presentation policy (M2.12 steps 7-8).
//
// A marathon tier is two independent choices — how the target is PROMPTED, and
// how you ANSWER — and writing them as a table rather than as branches is what
// keeps the two games one screen instead of two.
//
//   prompt   "highlight"  the globe lights the country up
//            "name"       the game names it and you find it
//            "flag"       the flag is shown (step 8)
//            "none"       nothing is prompted — a blank map (Expert recall)
//
//   answer   "choices"    four names, tap one
//            "globe"      tap the country on the globe
//            "type"       a text field; `suggest` decides whether it helps
//
// Splitting them this way is what makes Name Every Country's Medium
// (name -> globe) and Hard (highlight -> type) the same screen with two table
// rows, rather than two bespoke surfaces. It is also why step 8's flag game
// needed no new rendering logic at all: it is "flag" crossed with the three
// answer modes that already existed.
//
// Pure: semantic names only, no components and no theme tokens, the same split
// locatorTiers.js and locatorFillState() use.

import { runShape, RUN_SHAPES } from "./marathon";

const NAME_EVERY_COUNTRY = {
  easy: { prompt: "highlight", answer: "choices", suggest: false },
  medium: { prompt: "name", answer: "globe", suggest: false },
  hard: { prompt: "highlight", answer: "type", suggest: false },
  // Expert is the only tier with no prompt at all: the map is blank and you
  // supply the countries. Its run shape (recall) is what makes that work —
  // see marathon.js.
  expert: { prompt: "none", answer: "type", suggest: false },
};

const IDENTIFY_ALL_FLAGS = {
  easy: { prompt: "flag", answer: "choices", suggest: false },
  medium: { prompt: "flag", answer: "type", suggest: true },
  hard: { prompt: "flag", answer: "type", suggest: false },
};

const TABLES = {
  nameEveryCountry: NAME_EVERY_COUNTRY,
  identifyAllFlags: IDENTIFY_ALL_FLAGS,
};

// The Easy presentation is the fallback everywhere, for the same reason
// locatorPresentation falls back: a marathon with no presentation renders a
// screen with nothing to answer, which reads as broken rather than as missing.
const FALLBACK = { prompt: "highlight", answer: "choices", suggest: false };

export function marathonPresentation(mode, tier) {
  const table = TABLES[mode];
  if (!table) return FALLBACK;
  return table[tier] ?? table.easy ?? FALLBACK;
}

// Does this tier show the globe at all? Every Name Every Country tier does —
// including Expert, where the blank map IS the surface — and no flag tier
// does, because a flag marathon that also drew a globe would be giving away
// the answer it just asked for.
export function marathonUsesGlobe(mode, tier) {
  const look = marathonPresentation(mode, tier);
  return look.prompt === "highlight" || look.prompt === "none" || look.answer === "globe";
}

// Is the current target's country lit up on that globe?
//
// Only when the prompt IS the highlight. On Medium the globe is the answer
// surface, so highlighting the target would hand over the answer; on Expert
// there is no target to light.
export const marathonHighlights = (mode, tier) =>
  marathonPresentation(mode, tier).prompt === "highlight";

// Free-recall tiers answer into a list rather than a question. Re-exported
// through here so a surface asks ONE module about presentation rather than
// two — marathon.js owns what a run is, this owns what it looks like.
export const marathonIsRecall = (mode, tier) => runShape(tier) === RUN_SHAPES.recall;

// A one-line instruction for the tier, shown under the title. Not decoration:
// Expert in particular is unlike anything else in the app, and a blank globe
// with a text field under it explains nothing by itself.
const HINTS = {
  nameEveryCountry: {
    easy: "Which country is highlighted?",
    medium: "Find it on the globe.",
    hard: "Type the highlighted country.",
    expert: "Name as many countries as you can.",
  },
  identifyAllFlags: {
    easy: "Whose flag is this?",
    medium: "Type the country — we'll suggest.",
    hard: "Type the country, blind.",
  },
};

export const marathonHint = (mode, tier) => HINTS[mode]?.[tier] ?? HINTS.nameEveryCountry.easy;
