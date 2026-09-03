// Worldwise design tokens — Slickrock Studio Brand Identity Kit v1.1 / UI Kit v1.0.
//
// This file IS the design system in code. Semantic names, not literals: build
// against `colors.surfaceRaised`, never "#FFFFFF" — the kit's first rule, and
// the reason a re-skin is a diff to this file rather than a sweep through
// twenty components.
//
// ---------------------------------------------------------------------------
// WHAT CHANGED, AND WHY IT LOOKS LIKE AN INVERSION
//
// The prototype was dark: a navy-charcoal base with lifted slabs and depth
// drawn as a solid, un-blurred bottom edge. The brand kit is the opposite —
// "warm off-white is the page the world is printed on". Navy stopped being the
// background and became the *ink and authority*: wordmark, headers, primary
// buttons. So every surface flipped, and with it the rule about what carries
// text.
//
// The one thing that did NOT flip is the map. Kit §MAP RULES: ocean
// `brandDeep`, land `brand` at 88%, sand graticule. The map is still a dark
// stage — it's now a dark stage set into a light app, which is exactly the
// "printed atlas" idea the palette is named for. See `map` at the bottom.
//
// Two old rules are deliberately dead:
//   · "No `white` token on purpose" — white is now a real surface (cards,
//     sheets) and the label colour on every brand-coloured fill.
//   · `depth()`, the solid lip — replaced by `elevation()`, real soft shadows
//     (e1 rest / e2 hover / e3 overlay). A solid extrusion is a dark-UI trick;
//     on warm paper it reads as a printing error.

export const colors = {
  // --- Brand -------------------------------------------------------------
  // Navy carries authority and holds every map. AA on off-white at 10.5:1.
  brand: "#1F3A5F",
  // Dark surfaces, ocean fills, immersive map mode, footers.
  brandDeep: "#16293F",

  // Teal is the world itself — water, routes, anything live. 5.8:1 on white,
  // so unlike the other accents it is safe for body-size text.
  accent: "#2E6E7E",

  // Earth and sand are terrain, drawn from printed atlases. They accent, never
  // dominate — "line and texture more often than fill" (kit §COLOUR, DO).
  earth: "#9C6B3C",
  sand: "#C9A66B",

  success: "#2F8F5B",
  danger: "#B23A2E",
  // Tinted answer states. The kit shows correct/incorrect as a white card with
  // a coloured border and a coloured label, not a saturated fill — these are
  // the barely-there washes behind that, at ~8% on paper.
  successSurface: "#EAF4EE",
  dangerSurface: "#F8ECEA",

  // --- Surfaces ----------------------------------------------------------
  // The page the world is printed on, and the cards laid on top of it.
  surface: "#F7F4EE",
  surfaceRaised: "#FFFFFF",
  // A recessed inset on the page (progress tracks, map stages, wells). Kit has
  // no token for this; tinting navy is the sanctioned way to extend, so it is
  // navy at ~6% rather than a new hue.
  surfaceSunken: "#EDE9E1",

  // --- Text --------------------------------------------------------------
  text: "#20242B",
  // Secondary and UI text ONLY. 4.83:1 on white but 4.40:1 on the off-white
  // page — a hair under the kit's own "body ≥ 4.5:1" line. `text` is the body
  // colour; `textMuted` labels, captions and metadata. Guarded in
  // test/engine.test.js so this stays a decision rather than an accident.
  textMuted: "#6B7280",
  // The label colour on any brand-coloured fill. Every fill below clears 4.5:1
  // against it except `sand`, which takes `text` instead — see onFill().
  onFill: "#FFFFFF",

  border: "rgba(31,58,95,0.12)",
  // Opaque twin of `border`, for the places RN can't composite an rgba edge
  // predictably (SVG strokes, Android borders under elevation).
  borderSolid: "#E2DDD3",
};

// Which label colour a filled surface takes. Sand is the whole reason this is
// a function: at 2.3:1 white on sand is illegible, while ink on sand is 6.8:1.
// The kit's own premium "Dive deeper" button is dark-on-sand for exactly this
// reason. Anything else brand-coloured takes white.
export function onFill(fill) {
  return fill === colors.sand ? colors.text : colors.onFill;
}

// Game-mode accents. The kit forbids inventing hues — "extend by tinting navy
// and earth instead" — so the six modes draw from the brand set plus two
// sanctioned tints, rather than the old sky/iris/leaf trio which had no place
// in this palette. Daily takes brand navy because it's the hero card.
export const modeAccents = {
  daily: colors.brand,
  flag: colors.accent,
  capital: colors.earth,
  capitalReverse: colors.sand,
  shape: "#3E5C86", // navy, tinted up — 6.8:1 against white text
  locator: "#245A67", // teal, tinted down — 7.7:1 against white text
};

// --- Spacing ---------------------------------------------------------------
// 4px base, not 8. The kit's scale is 4·8·12·16·24·32·48·64 and "never an odd
// value", so spacing(3) is 12 and the ramp has the mid-steps the old 8px base
// couldn't express. Card padding 24 mobile / 32 desktop; section rhythm 64/88.
export const spacing = (n) => n * 4;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, section: 48, hero: 64 };

// --- Radius ----------------------------------------------------------------
// Flatter than the old chunky slabs: a printed-atlas card has a crisp corner.
export const radius = { sharp: 2, card: 8, sheet: 14, pill: 999 };

// --- Elevation -------------------------------------------------------------
// Replaces the old `depth()` solid lip. Three steps, no more: e1 rest, e2
// hover, e3 overlay. Written with RN's shadow* props plus Android `elevation`
// so one call works on web, iOS and Android — the portability the solid edge
// used to buy us, now bought properly.
//
// The shadow colour is brand navy rather than black: a neutral-black shadow on
// warm paper goes grey and dirty, while a navy one stays in the palette.
const SHADOW = "#1F3A5F";
export function elevation(level = 1) {
  switch (level) {
    case 3:
      return {
        shadowColor: SHADOW,
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.16,
        shadowRadius: 28,
        elevation: 12,
      };
    case 2:
      return {
        shadowColor: SHADOW,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
      };
    case 0:
      return {};
    default:
      return {
        shadowColor: SHADOW,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
        elevation: 2,
      };
  }
}

// The hairline that does most of the structural work now that cards are white
// on off-white and the shadow at e1 is deliberately faint.
export const hairline = { borderWidth: 1, borderColor: colors.border };

// --- Typography ------------------------------------------------------------
// Archivo (display) · Instrument Sans (body/UI) · IBM Plex Mono (utility).
// Families are referenced by the names App.js registers with expo-font; each
// falls back to the platform default if the webfont hasn't loaded yet, so a
// slow font never blanks the screen.
// Weight lives in the FAMILY NAME, not in `fontWeight`. Each weight of a
// Google font is registered as its own family (expo-font does this per file),
// and on web that family is declared at weight `normal` — so pairing it with
// `fontWeight: "600"` makes the browser synthesise a fake bold on top of a real
// one. Encoding the weight here and omitting fontWeight below is what avoids
// that double-bolding, and it costs nothing on native.
//
// Registered in App.js. Until they load, RN falls back to the platform default
// rather than blanking — App.js renders a plain splash for the one frame it
// takes instead of gating the whole tree indefinitely.
export const fonts = {
  // Archivo — display. "A grotesque with cartographic bones."
  display: "Archivo_600SemiBold",
  displayBold: "Archivo_700Bold",
  // Instrument Sans — body, UI labels, buttons.
  body: "InstrumentSans_400Regular",
  bodyMedium: "InstrumentSans_500Medium",
  bodySemi: "InstrumentSans_600SemiBold",
  // IBM Plex Mono — coordinates, eyebrows, map labels, data. Never sentences.
  mono: "IBMPlexMono_400Regular",
  monoMedium: "IBMPlexMono_500Medium",
};

// The kit's scale, verbatim. Letter-spacing is given there as a percentage of
// size; RN wants absolute points, so it's multiplied out (-3.5% of 64 = -2.24,
// -2% of 40 = -0.8, 12% of 11 = 1.32).
export const type = {
  display: { fontFamily: fonts.display, fontSize: 64, letterSpacing: -2.24, color: colors.brand },
  h1: { fontFamily: fonts.display, fontSize: 40, letterSpacing: -0.8, color: colors.brand },
  h2: { fontFamily: fonts.display, fontSize: 28, color: colors.brand },
  // A third display step the kit doesn't name but every card needs — a title
  // smaller than H2 that is still Archivo, not body, so card headings and page
  // headings read as one voice.
  h3: { fontFamily: fonts.display, fontSize: 20, color: colors.brand },
  bodyLarge: { fontFamily: fonts.body, fontSize: 18, lineHeight: 30, color: colors.text },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 24, color: colors.text },
  label: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.text },
  // Secondary body text — captions, metadata, blurbs. `textMuted` is safe here
  // because this is explicitly not body copy (see the token's own note).
  caption: { fontFamily: fonts.body, fontSize: 13, lineHeight: 20, color: colors.textMuted },
  // Mono, tracked 12%. The structural voice of the app: section headers,
  // kickers, anything that labels rather than speaks.
  eyebrow: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1.32,
    textTransform: "uppercase",
    color: colors.earth,
  },
  // Same mono voice, untransformed — coordinates and figures are already
  // correctly cased and would be mangled by uppercasing.
  data: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1.32, color: colors.textMuted },
};

// --- Layout ----------------------------------------------------------------
// Kit breakpoints: sm 480 · md 768 · lg 1024 · xl 1280. Content max 1240;
// map views go full-bleed.
export const breakpoints = { sm: 480, md: 768, lg: 1024, xl: 1280 };

export const layout = {
  maxContentWidth: 680,
  maxMediaWidth: 1024,
  maxActionWidth: 420,
  maxPageWidth: 1240,
  // Kit: card padding 24 mobile / 32 desktop.
  cardPadding: 24,
  cardPaddingWide: 32,
};

export const constrain = {
  content: { width: "100%", maxWidth: layout.maxContentWidth, alignSelf: "center" },
  media: { width: "100%", maxWidth: layout.maxMediaWidth, alignSelf: "center" },
  action: { width: "100%", maxWidth: layout.maxActionWidth, alignSelf: "center" },
  page: { width: "100%", maxWidth: layout.maxPageWidth, alignSelf: "center" },
};

// Kit §HIT TARGETS: 44×44 minimum on touch, 32 on pointer.
export const hitTarget = { touch: 44, pointer: 32 };

// Kit §BUTTONS: sm 32h · md 44h · lg 56h.
export const buttonHeight = { sm: 32, md: 44, lg: 56 };

// Kit §Z-LAYERS. "Nothing improvises its own index."
export const z = { map: 0, chrome: 10, sheet: 20, modal: 30, toast: 40 };

// --- Motion ----------------------------------------------------------------
// Kit §MOTION: 120ms micro · 200ms UI · 320ms sheets · 600ms map fly-to, all on
// cubic-bezier(.2,.7,.2,1). Stored as control points, not an RN `Easing`
// object, because test/engine.test.js imports this file in plain Node — a
// `react-native` import here would break the whole suite.
export const motion = {
  duration: { micro: 120, ui: 200, sheet: 320, mapFly: 600 },
  easing: [0.2, 0.7, 0.2, 1],
  rise: 8,
  stagger: 40,
  maxStaggerSteps: 6,
};

// --- Map -------------------------------------------------------------------
// Kit §MAP RULES, and the one place the app stays dark. Grouped rather than
// folded into `colors` so it's obvious that a screen reaching for `map.*` is
// deliberately entering the dark stage, not accidentally using a dark token on
// a light page.
export const map = {
  ocean: colors.brandDeep,
  // "land #1F3A5F at 88%" — pre-composited against the ocean rather than left
  // as an opacity, so SVG fills stay flat and predictable across renderers.
  land: "#213D63",
  landActive: colors.accent,
  // "borders 1px sand at 35%"
  border: "rgba(201,166,107,0.35)",
  graticule: "rgba(201,166,107,0.22)",
  // "Selected place: earth dot + halo; related places: teal diamonds."
  selected: colors.earth,
  related: colors.accent,
  label: colors.sand,
  // Text sitting on the dark stage.
  onMap: "#F2EEE6",
  onMapMuted: "rgba(242,238,230,0.72)",
};

// --- Accessibility ---------------------------------------------------------
// WCAG contrast ratio between two hex colors. Pure, no RN/DOM, so it's testable
// and doubles as a guard against a token change silently breaking text
// contrast. Kit §ACCESSIBILITY CONTRACT: body ≥ 4.5:1, large text and UI ≥ 3:1.
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

export const CONTRAST = { body: 4.5, large: 3 };
