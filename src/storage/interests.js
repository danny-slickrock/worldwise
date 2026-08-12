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
