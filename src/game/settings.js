// Pure settings logic — no React or storage imports, mirrors game/progress.js.

// How the globes draw their land. "terrain" is the realistic basemap (climate
// and landform, per game/terrainTint.js); "simple" is the kit's flat map layer,
// land as pine at 88% over a nightwood ocean, which is what every globe looked
// like before terrain existed.
//
// Both are legitimate: terrain is better for "what is this place like?", simple
// is better for reading borders and picking a country out of a crowd, which is
// what the Country Locator actually asks you to do.
export const BASEMAPS = ["terrain", "simple"];
export const DEFAULT_BASEMAP = "terrain";

export const DEFAULT_SETTINGS = { soundEnabled: true, basemap: DEFAULT_BASEMAP };

// Coerce anything read back from storage into a valid settings object, so a
// corrupt or partial payload can never crash the app.
export function normalizeSettings(raw) {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_SETTINGS };
  return {
    soundEnabled:
      typeof raw.soundEnabled === "boolean" ? raw.soundEnabled : DEFAULT_SETTINGS.soundEnabled,
    // An unknown value falls back rather than being trusted: a basemap name is
    // used to pick a fill, and an unrecognised one would paint nothing.
    basemap: BASEMAPS.includes(raw.basemap) ? raw.basemap : DEFAULT_SETTINGS.basemap,
  };
}

// The other basemap. One function so no component has to know there are exactly
// two, which is what makes adding a third a single edit here.
export function nextBasemap(current) {
  const i = BASEMAPS.indexOf(current);
  return BASEMAPS[(i + 1) % BASEMAPS.length] ?? DEFAULT_BASEMAP;
}
