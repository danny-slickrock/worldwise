// PURE interaction-difficulty catalog (M2.12 step 2).
//
// THE DISTINCTION THAT MATTERS, and the reason this file is not an extension
// of `DIFFICULTIES` in constants.js:
//
//   · `constants.js`'s DIFFICULTIES is a POOL filter. It picks *which
//     countries* a round draws from — famous ones or obscure ones — by
//     filtering on each country's own `difficulty` field.
//   · This file is INTERACTION difficulty. It picks *how you answer* and how
//     much the game helps: choose from four, type with suggestions, type
//     blind, read an unlabelled map.
//
// They are orthogonal on purpose, and collapsing them is the trap. If "hard"
// meant both "obscure countries" and "no assists" at once, there would be no
// way to ask for a gentle interaction over unfamiliar places — which is
// exactly what someone studying a region they don't know yet wants. Under this
// menu the pool defaults to `all`, and the pool filter retires from the
// primary flow rather than being deleted: buildRound still accepts it, and the
// Daily Challenge and learning paths still lean on the country tiers.
//
// Pure data, no React and no imports from the game engine, so the catalog can
// be asserted directly in test/engine.test.js.

// The four interaction tiers, in ascending order. Not every mode offers all
// four — see MODE_TIERS below — but where a mode does offer one, it means the
// same thing across every game, which is what lets a player carry an
// expectation from Flag Guesser to Shape Guesser.
export const TIER_ORDER = ["easy", "medium", "hard", "expert"];

export const DEFAULT_TIER = "easy";

// Per mode, its ordered tiers. Each carries the label shown on the menu button
// and the one line underneath it that says what you are actually signing up
// for — the description is the point of the menu, not decoration: "Hard" alone
// does not tell anyone that close spelling still counts.
//
// `expert` exists only where there is a genuinely different *interaction* left
// to reach for, rather than just a smaller pool. Shape gets it (lookalike
// silhouettes) and Locator gets it (a map with no borders at all). Flag and
// Capital do not: past "type it blind" there is nothing further to remove.
const MODE_TIERS = {
  flag: [
    { key: "easy", label: "Easy", description: "Four flags, one answer." },
    { key: "medium", label: "Medium", description: "Type the country; we suggest as you go." },
    { key: "hard", label: "Hard", description: "Type it blind — close spelling counts." },
  ],
  capital: [
    { key: "easy", label: "Easy", description: "Pick the capital from four." },
    { key: "medium", label: "Medium", description: "Type the capital, with suggestions." },
    { key: "hard", label: "Hard", description: "Type it blind, close spelling counts." },
  ],
  capitalReverse: [
    { key: "easy", label: "Easy", description: "Pick the country from four." },
    { key: "medium", label: "Medium", description: "Type the country, with suggestions." },
    { key: "hard", label: "Hard", description: "Type it blind, close spelling counts." },
  ],
  shape: [
    { key: "easy", label: "Easy", description: "Match the outline to one of four." },
    { key: "medium", label: "Medium", description: "Type it, with suggestions." },
    { key: "hard", label: "Hard", description: "Type it blind, close spelling counts." },
    { key: "expert", label: "Expert", description: "Lookalike shapes, obscure countries, blind." },
  ],
  locator: [
    { key: "easy", label: "Easy", description: "Globe's turned to it; your choices glow." },
    {
      key: "medium",
      label: "Medium",
      description: "Globe's turned to the neighborhood — find it.",
    },
    { key: "hard", label: "Hard", description: "Spin to find it, borders only." },
    { key: "expert", label: "Expert", description: "No borders — read the land itself." },
  ],
  higherLower: [
    { key: "easy", label: "Easy", description: "Famous countries, clear gaps." },
    { key: "medium", label: "Medium", description: "Closer calls, less-familiar places." },
    { key: "hard", label: "Hard", description: "Tight margins, deep cuts." },
  ],
};

// The modes that show a tier menu at all. Daily is deliberately absent: it is
// one fixed round shared by every player on a given day, and a difficulty
// choice would make two people's "same" Daily incomparable — which is the one
// thing the Daily has to guarantee. A country round is absent for the same
// reason it is absent from Home: it is reached from a country page with a
// subject already chosen, and is a mixed round rather than one interaction.
export const TIERED_MODES = Object.keys(MODE_TIERS);

// The tiers this mode offers, in order. Returns an empty array for a mode with
// no menu, which is what lets a caller ask without first checking membership.
export function tiersFor(mode) {
  return MODE_TIERS[mode] ?? [];
}

// Does this mode show a tier menu before the round?
export const hasTiers = (mode) => tiersFor(mode).length > 0;

// One tier's record, or null. Null rather than a blank shell so a caller can
// tell "this mode has no such tier" from "a tier with nothing filled in".
export function tierFor(mode, tier) {
  return tiersFor(mode).find((t) => t.key === tier) ?? null;
}

// Coerce a tier for this mode, mirroring normalizeSettings'/normalizeTier's own
// rule: an unrecognised value falls back rather than being trusted. The
// fallback is the mode's FIRST tier rather than the global DEFAULT_TIER,
// because a mode is not obliged to offer "easy" — reaching for a tier a mode
// does not have is how a round ends up with no interaction at all.
export function normalizeTier(mode, tier) {
  const tiers = tiersFor(mode);
  if (!tiers.length) return null;
  return tiers.some((t) => t.key === tier) ? tier : tiers[0].key;
}

// Is this tier's interaction actually BUILT yet?
//
// Steps 3-6 wire the real interactions one family at a time, and a tier whose
// surface does not exist yet has to fall back to the multiple-choice round
// that does — otherwise picking "Hard" mid-milestone produces a question with
// no way to answer it. This is the one place that knows, so retiring a
// fallback is a single edit here rather than a hunt through the engine.
//
// Step 3 built the shared type-in surface and proved it on Flag; step 4 moved
// the rest of the type-in family across. Steps 5-6 wire the other two, whose
// interactions are not typed at all — a globe and a pair comparison.
const BUILT_TIERS = {
  flag: ["easy", "medium", "hard"],
  capital: ["easy", "medium", "hard"],
  capitalReverse: ["easy", "medium", "hard"],
  shape: ["easy", "medium", "hard", "expert"],
  locator: ["easy"],
  higherLower: ["easy"],
};

export const isTierBuilt = (mode, tier) => (BUILT_TIERS[mode] ?? []).includes(tier);

// The tier a round should actually be BUILT as: the chosen one if its
// interaction exists, otherwise the mode's first tier. Selection and
// capability are kept separate deliberately — the menu still shows what was
// picked and the URL still carries it, so a fallback never silently rewrites
// the player's choice, it only decides which question shape to emit.
export function effectiveTier(mode, tier) {
  const normalized = normalizeTier(mode, tier);
  if (normalized === null) return null;
  return isTierBuilt(mode, normalized) ? normalized : tiersFor(mode)[0].key;
}
