// PURE entitlements — which games a given account tier may play.
//
// The product shape (M2.12 step 1): six free games, and two "pro" marathon
// games still to be built. What this module is NOT, yet, is a paywall. Every
// account is created `pro`, so `isUnlocked` answers `true` for everything a
// real player will ask it about today; the gating is cosmetic this pass —
// a PRO badge on Home — and the switch that makes it real is DEFAULT_TIER.
//
// Building the seam before the wall is deliberate. A tier check retrofitted
// later has to be threaded through every play entry point at once, which is
// exactly the kind of change that misses one. This way the call sites exist
// and are exercised from day one; flipping the default is the only edit that
// turns the badge into a lock.
//
// Pure by the load-bearing convention (see CLAUDE.md): no React, no storage,
// no network, so test/engine.test.js can drive it in plain Node.

// The two account tiers. Ordered free -> pro, so a future "does tier A cover
// tier B?" question is an index comparison rather than a special case.
export const TIERS = ["free", "pro"];

// Every account is pro until the paywall ships. See the module header.
export const DEFAULT_TIER = "pro";

// Mode -> the tier that unlocks it. This is the catalog: the single place that
// knows a game's commercial status, so no screen has to carry a hardcoded list
// of which games are behind the wall.
//
// `daily` and `country` are deliberately absent-as-free rather than missing:
// Daily is the app's habit loop and a country round is reached from a country
// page, so neither is ever a thing you buy.
export const MODE_TIERS = {
  flag: "free",
  capital: "free",
  capitalReverse: "free",
  shape: "free",
  locator: "free",
  higherLower: "free",
  daily: "free",
  country: "free",

  // Not built yet (steps 7 and 8). Listed now so the catalog is the product's
  // plan rather than a lagging record of it — and so the Home badge and the
  // tests have something real to assert against before the games exist.
  nameEveryCountry: "pro",
  identifyAllFlags: "pro",
};

// The two lists, derived rather than retyped. A mode added to MODE_TIERS shows
// up here automatically, which is what stops the catalog and the lists drifting.
export const FREE_MODES = Object.keys(MODE_TIERS).filter((m) => MODE_TIERS[m] === "free");
export const PRO_MODES = Object.keys(MODE_TIERS).filter((m) => MODE_TIERS[m] === "pro");

// Is this mode behind the pro wall? One predicate, so a component never has to
// remember whether the catalog stores a tier or a boolean.
//
// An UNKNOWN mode answers false. A mode missing from the catalog is a bug in
// the catalog, and the safe failure for a geography game is to let someone
// play — locking a game nobody meant to lock is the worse outcome, and a
// silently free game shows up in the "every mode is catalogued" test below.
export const isProMode = (mode) => MODE_TIERS[mode] === "pro";

// Coerce anything read back from storage into a valid tier, mirroring
// normalizeSettings' own rule: an unrecognised value falls back rather than
// being trusted. A corrupt tier string must not decide what someone can play.
export const normalizeTier = (raw) => (TIERS.includes(raw) ? raw : DEFAULT_TIER);

// THE question: may an account on `tier` play `mode`?
//
// pro unlocks everything; free unlocks exactly the free catalog. The tier is
// normalized on the way in, so a caller that reads straight from storage and
// forgets to sanitize gets the safe answer rather than `undefined`.
export function isUnlocked(mode, tier = DEFAULT_TIER) {
  return normalizeTier(tier) === "pro" ? true : !isProMode(mode);
}

// Every mode this tier may play, in catalog order. For a surface that renders
// a list rather than asking about one game — a hub, a picker, a marathon menu.
export function unlockedModes(tier = DEFAULT_TIER) {
  return Object.keys(MODE_TIERS).filter((mode) => isUnlocked(mode, tier));
}
