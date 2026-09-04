// Local cache for interest selections — same shape as storage/progress.js.
// AsyncStorage is backed by localStorage on web and native storage on device,
// so a person who picks interests before signing in keeps them through
// sign-up: this is the offline copy cloudInterests.js's migration reads from.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { normalizeInterests } from "../game/interestPolicy";

// Versioned key so we can migrate the shape later without reading stale data.
export const INTERESTS_KEY = "worldwise.interests.v1";

// Read saved interests, falling back to an empty selection on a first run,
// missing data, or any read/parse error. Never throws.
export async function loadInterests() {
  try {
    const raw = await AsyncStorage.getItem(INTERESTS_KEY);
    return raw ? normalizeInterests(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

// Persist a selection (including an explicit empty one — a skip is a valid
// answer). Failures are non-fatal: the pick just won't survive this restart.
export async function saveInterests(slugs) {
  try {
    await AsyncStorage.setItem(INTERESTS_KEY, JSON.stringify(normalizeInterests(slugs)));
  } catch {
    /* storage unavailable (e.g. private mode) — ignore */
  }
}

// --- The "we've asked" flag (M2.3.6 prompt gate) ----------------------------
// Separate key from the selection itself, because the two answer different
// questions: INTERESTS_KEY is *what* they picked (an empty array is a real
// answer), and this is *whether they were ever asked*. Collapsing them would
// make a skip indistinguishable from a fresh install and re-nag every launch.
//
// Device-local on purpose, and worth being clear about the tradeoff: signing in
// on a second device with nothing picked will ask once there too. Making it
// per-account would mean a column on `profiles` and a migration, and the
// milestone explicitly allows offering "once more, much later, at most" — one
// prompt per device sits inside that, where a prompt every launch would not.
export const INTERESTS_ASKED_KEY = "worldwise.interests.asked.v1";

// When the prompt was last shown, or null if it never has. Never throws — an
// unreadable flag reads as "not asked", which risks one extra prompt rather
// than silently suppressing the only one a learner would ever see.
export async function loadInterestsAskedAt() {
  try {
    return (await AsyncStorage.getItem(INTERESTS_ASKED_KEY)) || null;
  } catch {
    return null;
  }
}

// Record that we've asked. Called the moment the prompt opens, not when it is
// answered — see resolveInterestPrompt() for why dismissing still counts.
export async function markInterestsAsked(now = new Date().toISOString()) {
  try {
    await AsyncStorage.setItem(INTERESTS_ASKED_KEY, now);
  } catch {
    /* storage unavailable — worst case they see the prompt once more */
  }
}
