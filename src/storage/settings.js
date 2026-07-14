// Persistence for player settings (e.g. sound toggle). Same AsyncStorage
// pattern as storage/progress.js.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DEFAULT_SETTINGS, normalizeSettings } from "../game/settings";

export const SETTINGS_KEY = "worldwise.settings.v1";

// Read saved settings, falling back to defaults on a first run, missing data,
// or any read/parse error. Never throws.
export async function loadSettings() {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    return raw ? normalizeSettings(JSON.parse(raw)) : { ...DEFAULT_SETTINGS };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

// Persist settings. Failures are non-fatal, so we swallow them.
export async function saveSettings(settings) {
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* storage unavailable (e.g. private mode) — ignore */
  }
}
