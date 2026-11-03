// PURE colour-scheme policy — no React Native, no DOM, so the suite can pin it.
//
// The setting is a PREFERENCE (system | light | dark); the scheme is what the
// app actually draws (light | dark). "system" defers to the OS, and an OS that
// reports nothing (older Android, a browser without prefers-color-scheme,
// Node) resolves to light — the scheme the brand was designed in first.
//
// Reading the OS is IO and lives beside this in lib/appearance.js; applying
// the answer to the tokens is theme.js's setActiveScheme(). This module only
// decides.
export const COLOR_SCHEME_PREFS = ["system", "light", "dark"];
export const DEFAULT_COLOR_SCHEME = "system";

export const COLOR_SCHEME_LABELS = {
  system: "System",
  light: "Light",
  dark: "Dark",
};

// An unknown stored value falls back to "system" rather than being trusted —
// the same rule settings.js applies to the basemap.
export function normalizeColorSchemePref(value) {
  return COLOR_SCHEME_PREFS.includes(value) ? value : DEFAULT_COLOR_SCHEME;
}

// preference × OS → the scheme to draw.
export function resolveColorScheme(pref, osScheme) {
  const p = normalizeColorSchemePref(pref);
  if (p === "light" || p === "dark") return p;
  return osScheme === "dark" ? "dark" : "light";
}

// The status bar's glyphs contrast with the page: dark glyphs on parchment,
// light glyphs on bark.
export function statusBarStyle(scheme) {
  return scheme === "dark" ? "light" : "dark";
}
