// PURE first-run gate for the interests prompt (M2.3.6). No storage, no React
// — just the decision, so test/engine.test.js can pin the anti-nag rules.
//
// The milestone's own words: "One short, entirely optional prompt at sign-up
// with a real Skip — the app must be fully usable having answered nothing, and
// a skipper is never re-nagged." Everything here exists to make that literally
// true rather than aspirationally true.
//
// The rule that matters most: **a skip is an answer.** Nothing distinguishes
// "skipped" from "picked three things" as far as this gate is concerned — both
// mean asked, and asked means never again. Anything else is the dark pattern
// the milestone is explicitly written against.

// Resolve whether to show the prompt, and whether to record that we've asked.
//
// Returns { prompt, markAsked }:
//   prompt    — show InterestsScreen now
//   markAsked — persist the "already asked" flag, whether or not we prompted
//
// `markAsked` is true in *both* terminal cases, which is the subtle part. When
// we prompt, we mark immediately rather than waiting for Skip/Continue: a
// person who dismisses the screen with Back has still been asked, and asking
// again because they didn't use one of our two buttons would be exactly the
// nagging this is meant to prevent. One prompt, ever, no matter how it ends.
export function resolveInterestPrompt({
  signedIn = false,
  hydrated = false,
  askedAt = null,
  selected = [],
} = {}) {
  const quiet = { prompt: false, markAsked: false };

  // Not hydrated: local storage hasn't answered yet, so we don't know whether
  // they've been asked. Prompting here would flash the screen at someone who
  // answered months ago.
  if (!hydrated) return quiet;

  // Signed out is not a missing answer — the app is fully usable having never
  // signed in, and there'd be no account to attach the picks to.
  if (!signedIn) return quiet;

  // Already asked. This is the whole point.
  if (askedAt) return quiet;

  // Already has interests — picked on another device and brought over by the
  // cloud merge, or picked locally before signing up. Don't ask, but *do* mark,
  // so this stays a one-time decision rather than being re-derived every launch.
  if (Array.isArray(selected) && selected.length > 0) {
    return { prompt: false, markAsked: true };
  }

  return { prompt: true, markAsked: true };
}

// --- The secondary button -------------------------------------------------
// InterestsScreen does double duty: it is the sign-up prompt *and* the edit
// surface reached from Profile → Preferences → Interests. Those two contexts
// want opposite things from the button beside Continue.
//
// As the prompt, "Skip" means "I'm answering with nothing" — an empty
// selection is a real answer, and committing it is the point. As the edit
// surface, the same click has to mean "Cancel" — leave what I already picked
// alone. Before this, both paths cleared, so opening the screen from Profile
// with three interests and tapping Skip silently wiped them.
//
// Returns { label, clears }. The invariant worth keeping: **`clears` is never
// true when there are existing picks.** That is what makes the destructive
// case unreachable regardless of how `origin` is threaded through the UI — a
// wrong origin degrades to a harmless Cancel, never to data loss.
export const ORIGIN_PROMPT = "prompt";
export const ORIGIN_EDIT = "edit";

export function resolveSecondaryAction({ origin = ORIGIN_EDIT, initialSelected = [] } = {}) {
  const hasPicks = Array.isArray(initialSelected) && initialSelected.length > 0;

  // Only the sign-up prompt, and only with nothing on file, commits an empty
  // answer. Everything else — the edit surface, an unknown origin, or a prompt
  // that somehow has picks — cancels without touching them.
  if (origin === ORIGIN_PROMPT && !hasPicks) {
    return { label: "Skip", clears: true };
  }
  return { label: "Cancel", clears: false };
}
