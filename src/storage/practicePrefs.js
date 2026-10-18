// Local cache for practice preferences — same shape as storage/interests.js.
// AsyncStorage is backed by localStorage on web and native storage on
// device, so a person who sets regions/difficulty/a streak goal before
// signing in keeps them through sign-up: this is the offline copy
// cloudPracticePrefs.js's migration reads from.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { normalizePracticePrefs, DEFAULT_PRACTICE_PREFS } from "../game/practicePrefsPolicy";

// Versioned key so we can migrate the shape later without reading stale data.
export const PRACTICE_PREFS_KEY = "worldwise.practicePrefs.v1";

// Read saved preferences, falling back to the defaults on a first run,
// missing data, or any read/parse error. Never throws.
export async function loadPracticePrefs() {
  try {
    const raw = await AsyncStorage.getItem(PRACTICE_PREFS_KEY);
    return raw ? normalizePracticePrefs(JSON.parse(raw)) : { ...DEFAULT_PRACTICE_PREFS };
  } catch {
    return { ...DEFAULT_PRACTICE_PREFS };
  }
}

// Persist preferences. Failures are non-fatal: the pick just won't survive
// this restart.
export async function savePracticePrefs(prefs) {
  try {
    await AsyncStorage.setItem(PRACTICE_PREFS_KEY, JSON.stringify(normalizePracticePrefs(prefs)));
  } catch {
    /* storage unavailable (e.g. private mode) — ignore */
  }
}
