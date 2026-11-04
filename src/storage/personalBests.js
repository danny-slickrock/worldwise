// Persistence for personal bests (game/bestTimePolicy.js). Same AsyncStorage
// pattern as storage/settings.js: local-first, never throws.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { mergeBests } from "../game/bestTimePolicy";

export const PERSONAL_BESTS_KEY = "worldwise.personalBests.v1";

export async function loadPersonalBests() {
  try {
    const raw = await AsyncStorage.getItem(PERSONAL_BESTS_KEY);
    // Re-merged into an empty map so a corrupt entry is dropped, not trusted.
    return raw ? mergeBests({}, JSON.parse(raw)) : {};
  } catch {
    return {};
  }
}

export async function savePersonalBests(bests) {
  try {
    await AsyncStorage.setItem(PERSONAL_BESTS_KEY, JSON.stringify(bests ?? {}));
  } catch {
    /* storage unavailable — a best is a nicety, never worth a crash */
  }
}
