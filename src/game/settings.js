// Pure settings logic — no React or storage imports, mirrors game/progress.js.
export const DEFAULT_SETTINGS = { soundEnabled: true };

// Coerce anything read back from storage into a valid settings object, so a
// corrupt or partial payload can never crash the app.
export function normalizeSettings(raw) {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_SETTINGS };
  return {
    soundEnabled: typeof raw.soundEnabled === "boolean" ? raw.soundEnabled : DEFAULT_SETTINGS.soundEnabled,
  };
}
