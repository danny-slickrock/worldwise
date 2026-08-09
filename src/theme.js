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

// ---------------------------------------------------------------------------
// Layout — how wide content is allowed to get.
//
// The app was built phone-first, so every surface stretched to the viewport. On
// a desktop browser that turns a 44px button into a 1400px slab and a paragraph
// into an unreadable single line. These caps turn the app into a centered column
// on wide screens while changing nothing on a phone: a 390px device never
// reaches even the narrowest cap, so mobile stays full-bleed by construction.
//
// Three widths rather than one, because they answer different questions:
//   content — the reading column. Bounded by line length (~65-75 characters at
//             our body size), not by taste.
//   media   — maps and the outline hero. Maps are the hero, so they earn more
//             room than text, but still stop short of sprawling on an ultrawide.
//   action  — buttons and answer options. A button wider than this reads as a
//             banner and pushes its label away from where the eye lands.
export const layout = {
  maxContentWidth: 520,
  maxMediaWidth: 880,
  maxActionWidth: 420,
};

// Prebuilt centering styles — static objects, so spreading them into a
// StyleSheet entry or a style array allocates nothing per render.
//
// `alignSelf: center` is what does the centering: each of these sits on a child
// of a column flex container (a ScrollView's content container, or a card
// stack), where the cross axis is horizontal.
export const constrain = {
  content: { width: "100%", maxWidth: layout.maxContentWidth, alignSelf: "center" },
  media: { width: "100%", maxWidth: layout.maxMediaWidth, alignSelf: "center" },
  action: { width: "100%", maxWidth: layout.maxActionWidth, alignSelf: "center" },
};

// ---------------------------------------------------------------------------
// Motion — one vocabulary for every entrance.
//
// Values match what QuizScreen and CountryPageScreen already do by hand (260ms
// in, 200ms out, a ~16px rise), so adopting this primitive is a consolidation
// rather than a second, competing motion language.
//
// Easing is stored as cubic-bezier control points instead of an RN `Easing`
// object on purpose: theme.js is imported by test/engine.test.js, which runs in
// plain Node, so a `react-native` import here would break the whole suite.
// Components build the real easing with `Easing.bezier(...motion.easeOut)`.
export const motion = {
  duration: { fast: 180, base: 260, slow: 320 },
  // How far content travels on the way in. Small enough to read as a settle
  // rather than a slide — the fade does most of the work.
  rise: 12,
  // Gap between staggered siblings. Short: a cascade should feel like one
  // gesture, not a queue. 45ms x 6 items = 270ms for the whole group.
  stagger: 45,
  // Cap on staggered position. Past this every remaining item shares the last
  // delay, so a 196-country list can't schedule an 8-second cascade.
  maxStaggerSteps: 6,
  // Decelerating curve — fast out of the gate, soft landing. No overshoot:
  // nothing here should bounce.
  easeOut: [0.22, 1, 0.36, 1],
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
