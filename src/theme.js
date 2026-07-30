// Worldwise design tokens — premium, map-first, timeless.
//
// The surface treatment is a dark, tactile "slab" language: deep navy-charcoal
// base, slightly lifted cards, and depth expressed as a solid un-blurred bottom
// edge (see `depth()`) rather than a soft shadow. Everything is pressable-looking
// and chunky, but the palette stays Worldwise — navy base, teal/earth/sand
// accents — so maps still read as the hero rather than the chrome.
export const colors = {
  // Brand deeps. On a dark UI these are structure (panels, the map stage),
  // not accents on white.
  navy: "#1B2534",
  navyDeep: "#131A25",

  // Surfaces, in stacking order: bg → surface (cards) → surfaceAlt (insets).
  bg: "#232A36",
  surface: "#2E3644",
  surfaceAlt: "#3A4453",
  // The solid underside every card and button sits on. Darker than `bg` so the
  // extrusion reads on both the base and on top of another card.
  lip: "#161C26",

  // Accents, brightened to hold 4.5:1 against the dark surfaces. Each game mode
  // draws its accent from here (see game/questions.js MODES).
  teal: "#5FC4D8",
  earth: "#D89B5E",
  sand: "#E6C179",
  sky: "#82AEE6",
  iris: "#A79BE8",
  leaf: "#7BD3A4",

  // The warm off-white that used to be the page background now carries type.
  headline: "#F7F4EE",
  ink: "#E9E5DD",
  muted: "#AAB5C4",
  line: "#3F4A5A",

  success: "#5FCB8E",
  successBg: "#1E3B2C",
  error: "#F08A70",
  errorBg: "#3C2320",
};

// No `white` token on purpose. Every fill bright enough to carry text on the
// dark base is too bright for white text on top — reach for `navyDeep` there,
// and `headline` on the dark surfaces.

export const spacing = (n) => n * 8;

// Chunkier than a typical app: the slab language needs generous corners or the
// solid bottom edge reads as a mistake rather than a deliberate extrusion.
export const radius = { sm: 12, md: 18, lg: 24, pill: 999 };

export const type = {
  hero: { fontSize: 34, fontWeight: "900", color: colors.headline, letterSpacing: -0.5 },
  title: { fontSize: 24, fontWeight: "900", color: colors.headline },
  h2: { fontSize: 18, fontWeight: "800", color: colors.headline },
  body: { fontSize: 16, color: colors.ink },
  muted: { fontSize: 14, color: colors.muted },
  pill: { fontSize: 13, fontWeight: "800" },
  // All-caps, tight-tracked labels are this UI's structural voice: `section`
  // separates blocks, `kicker` tags a single card or screen.
  section: {
    fontSize: 13,
    fontWeight: "900",
    color: colors.muted,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  kicker: {
    fontSize: 11,
    fontWeight: "900",
    color: colors.earth,
    letterSpacing: 1.6,
    textTransform: "uppercase",
  },
};

// The depth primitive, replacing the old blurred `shadow`. A solid bottom edge
// makes every card and button read as a physical slab you can press. It's one
// style object rather than a wrapper view, and unlike shadow/elevation it
// renders identically on web, iOS, and Android.
//
// Spread it last: it sets borderBottomWidth, which a later `borderWidth` in the
// same object would flatten.
export const depth = (h = 4, color = colors.lip) => ({
  borderBottomWidth: h,
  borderBottomColor: color,
});

// WCAG contrast ratio between two hex colors — pure, no RN/DOM, so it's
// testable in test/engine.test.js and doubles as a guard against future
// token changes silently breaking text contrast.
function relativeLuminance(hex) {
  const n = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255);
  const linear = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

export function contrastRatio(hexA, hexB) {
  const lA = relativeLuminance(hexA);
  const lB = relativeLuminance(hexB);
  const [lighter, darker] = lA > lB ? [lA, lB] : [lB, lA];
  return (lighter + 0.05) / (darker + 0.05);
}
