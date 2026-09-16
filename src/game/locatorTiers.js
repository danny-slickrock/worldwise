// PURE Country Locator tier policy (M2.12 step 5).
//
// Four tiers, and what separates them is entirely how much the globe HELPS —
// never a different question. The answer is always "where is this country?".
//
//   Easy    globe already turned to the neighbourhood, the candidates lit up,
//           and only those candidates are tappable. A four-way choice, on a map.
//   Medium  still turned to the neighbourhood, but nothing is lit and the
//           whole globe is live. You are no longer picking from four.
//   Hard    not turned anywhere. Spin the Earth and find it, borders drawn.
//   Expert  the photographic basemap with NO borders at all — read the land.
//
// The jump that matters is Easy -> Medium, and it is not the highlight: it is
// that the candidate set stops being a shortlist. Highlighting four countries
// and then accepting taps anywhere would be the worst of both, so `highlight`
// and `restrictToCandidates` move together and this module is the one place
// that knows it.
//
// Pure: returns semantic decisions, never theme tokens or components, the same
// split locatorFillState() already uses. Driven from test/engine.test.js.

import { locatorView } from "./locatorRound";
import { DEFAULT_SPIN } from "./globeMotion";

export const LOCATOR_TIERS = ["easy", "medium", "hard", "expert"];

const PRESENTATION = {
  easy: {
    preOriented: true,
    highlight: true,
    restrictToCandidates: true,
    basemap: "simple",
    showBorders: true,
  },
  medium: {
    preOriented: true,
    highlight: false,
    restrictToCandidates: false,
    basemap: "simple",
    showBorders: true,
  },
  hard: {
    preOriented: false,
    highlight: false,
    restrictToCandidates: false,
    basemap: "simple",
    showBorders: true,
  },
  expert: {
    preOriented: false,
    highlight: false,
    restrictToCandidates: false,
    // Terrain, deliberately: with no borders, the photograph is the only
    // information left. On `simple` an unbordered globe is a flat green shape
    // and the question becomes unanswerable rather than hard.
    basemap: "terrain",
    showBorders: false,
  },
};

// How the globe should present itself for this tier.
//
// An unknown tier resolves to `easy` rather than throwing or returning
// undefined: a locator question with no presentation would render a globe with
// nothing tappable, which reads as a broken game rather than a missing tier.
export function locatorPresentation(tier) {
  return PRESENTATION[tier] ?? PRESENTATION.easy;
}

// Where the globe STARTS.
//
// A pre-oriented tier frames the candidates the way it always has. An
// unoriented one starts at the world's default view — NOT at a random spin,
// which would be a different puzzle every time for no reason, and not
// anywhere derived from the answer, which would leak it.
export function locatorStartView(tier, codes, centers) {
  return locatorPresentation(tier).preOriented
    ? locatorView(codes, centers)
    : { spin: { ...DEFAULT_SPIN }, zoom: 1 };
}

// Which countries may be tapped: the shortlist on Easy, anything drawn
// otherwise. Returning null means "no restriction", which is what lets the
// component skip building a Set on the three tiers that don't need one.
export function locatorTappable(tier, choices = []) {
  return locatorPresentation(tier).restrictToCandidates ? choices.map((c) => c.code ?? c) : null;
}

// Does the answer's own neighbourhood still get lit up? Only on Easy — see
// the module header for why this moves in lockstep with the tappable set.
export const locatorHighlights = (tier) => locatorPresentation(tier).highlight;

// The basemap this QUESTION wants, which is not necessarily the one the player
// has chosen globally.
//
// Returning the name rather than writing settings.basemap is the whole point:
// a tier that silently rewrote the global setting would leave every other
// globe in the app changed after one round of Expert, and the player would
// have no idea what did it.
export const locatorBasemap = (tier) => locatorPresentation(tier).basemap;

// Are country borders drawn at all? Expert alone says no.
export const locatorShowsBorders = (tier) => locatorPresentation(tier).showBorders;
