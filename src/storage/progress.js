// Persistence for player progress. AsyncStorage is backed by localStorage on
// web and native storage on device, so a single API covers every platform.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DEFAULT_PROGRESS, normalizeProgress } from "../game/progress";

// Versioned key so we can migrate the shape later without reading stale data.
export const PROGRESS_KEY = "worldwise.progress.v1";

// Read saved progress, falling back to defaults on a first run, missing data,
// or any read/parse error. Never throws.
export async function loadProgress() {
  try {
    const raw = await AsyncStorage.getItem(PROGRESS_KEY);
    return raw ? normalizeProgress(JSON.parse(raw)) : { ...DEFAULT_PROGRESS };
  } catch {
    return { ...DEFAULT_PROGRESS };
  }
}

// Persist progress. Failures are non-fatal — progress just won't survive this
// restart — so we swallow them rather than interrupt play.
export async function saveProgress(progress) {
  try {
    await AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    /* storage unavailable (e.g. private mode) — ignore */
  }
}
