// Worldwise design tokens — Slickrock Studio Brand Identity Kit v3.
//
// This file IS the design system in code. Semantic names, not literals: build
// against `colors.surfaceRaised`, never "#FBF6EA" — the kit's first rule, and
// the reason a re-skin is a diff to this file rather than a sweep through
// thirty components. Values come verbatim from the kit's `tokens.json`.
//
// ---------------------------------------------------------------------------
// WHAT CHANGED IN v3, AND WHY EVERY COLOUR MOVED
//
// v1.1 was a printed atlas: navy ink on warm off-white paper, cool-biased. v3
// is "a cartography room after dark" — deep pine walls, brass instrument
// fittings, lantern light on aged paper. Everything is WARM-BIASED, including
// the shadows, which are rgba(42,35,32,…) and never neutral grey. Cool colour
// appears only as lakewater, and only where something is live: water, routes,
// links, interactive state.
//
// So navy became pine (`brand`), off-white became parchment (`surface`), the
// old `earth`/`sand` pair became `ember`/`brass`, and the display face changed
// from Archivo (grotesque) to Newsreader (serif). The map did not flip: it is
// still the one dark stage in a light app — it just moved from navy-and-sand to
// pine-and-brass.
//
// Rules carried forward, still true:
//   · Proportion is ~70% parchment, ~25% pine, ~5% firelight. One warm accent
//     per screen. Ember and brass appear as line, rule and texture far more
//     often than as fill.
//   · Depth is `elevation(1|2|3)` — real soft shadows, never a solid lip.
//   · Weight lives in the font FAMILY, never in `fontWeight`.
//
// Rules new in v3, and easy to break by accident:
//   · **Brass is decorative only — never a text colour on light.** At 1.9:1 on
//     parchment it is a rule, a fleck, a graticule. `onFill()` knows it carries
//     ink rather than parchment.
//   · **Ember is a fill, a rule and terrain — not type.** When a warm colour
//     has to carry words, that is `emberInk`. Same for `success`/`successInk`.
//   · **Type on a material never carries alpha.** Hierarchy on dark comes from
//     size, case and the mono/serif switch — not from opacity.
//   · **Newsreader is never used below 17px.** Below that the serif detail
//     muddies; drop to Instrument Sans. `type.h3` at 21 is the floor.

export const colors = {
  // --- Brand -------------------------------------------------------------
  // Pine: the walls of the room. Carries authority and holds every map.
  // 10.45:1 on cream, 9.52:1 on parchment — safe for anything.
  brand: "#21403C",
  // Nightwood. Dark surfaces, ocean fills, immersive map mode, footers.
  brandDeep: "#16292A",

  // Lakewater is the world itself — water, routes, links, anything live. The
  // only cool colour in the system, and the only accent safe for body-size
  // text on light (4.70:1 on cream).
  accent: "#2E7A72",
  // The same water read against a dark ground.
  accentLight: "#8FC4B4",
  // Lakewater, deepened, for TEXT LINKS on light. The kit's own table splits
  // `accent`: "links on cream; large only on parchment" — it measures 4.70:1 on
  // cream but 4.28:1 on parchment, and back buttons and inline links sit on
  // both at 13-14px. This clears 4.5:1 on either ground (4.96 / 5.45), so a
  // link never has to know which surface it landed on. `accent` itself stays
  // what it is: the colour of water, live state, and large type.
  link: "#2A6F68",

  // Firelight. Ember and brass are the brass-instrument fittings and the
  // lantern — line, rule and texture far more often than fill.
  ember: "#B0602C",
  brass: "#D8A44A",
  // The type-safe ember. `ember` itself is 3.9:1 on parchment, which the kit
  // classes as "fills, rules, terrain — not type"; this is the same warmth,
  // dark enough to set words in (4.92:1 on parchment).
  emberInk: "#9A5225",

  success: "#4A8C4A",
  // The type-safe success, for the same reason emberInk exists.
  successInk: "#35703A",
  danger: "#A6432E",
  // Tinted answer states. The kit shows correct/incorrect as a raised card with
  // a coloured border and a coloured label, not a saturated fill — these are
  // the barely-there washes behind that.
  successSurface: "#E8F0E2",
  dangerSurface: "#F6E5DE",

  // --- Surfaces ----------------------------------------------------------
  // Parchment is the page; cream is the card laid on it. They differ by about
  // half a stop, and small type sits on both — which is why the accessibility
  // tests check BOTH grounds rather than assuming the lighter one.
  surface: "#F4EBD9",
  surfaceRaised: "#FBF6EA",
  // A recessed inset on the page (progress tracks, wells, image placeholders).
  surfaceSunken: "#E8DBC3",

  // --- Text --------------------------------------------------------------
  // Bark ink. 13.04:1 on parchment.
  text: "#2A2320",
  // Long-form secondary body copy. 8.52:1 on parchment.
  textSecondary: "#4A4038",
  // Labels and captions. 6.07:1 on parchment — comfortably AA, unlike v1.1's
  // textMuted, which sat at 4.40 and had to be pinned as a deliberate exception.
  textMuted: "#635547",
  // Data, hex values, hints. 4.68:1 on parchment — still AA body.
  textFaint: "#756654",

  // The two inks permitted on a dark ground. Parchment at any size; lichen only
  // at 14px+ on flat pine, and 16px+ over a material. Neither ever carries
  // alpha: an alpha tint over a gradient has no knowable contrast ratio.
  onFill: "#F4EBD9",
  onFillQuiet: "#C9BFA8",

  border: "rgba(33,64,60,0.12)",
  borderStrong: "rgba(33,64,60,0.18)",
  // Opaque twin of `border`, for the places RN can't composite an rgba edge
  // predictably (SVG strokes, Android borders under elevation).
  borderSolid: "#DED2BA",
};

// Which label colour a filled surface takes.
//
// Brass and lichen-light are the whole reason this is a function: parchment on
// brass is 1.90:1 and illegible, while nightwood on brass is 6.74:1 — which is
// exactly the kit's premium button, brass fill with brand-deep text. Everything
// else brand-coloured takes parchment.
//
// One function, so no component has to remember, and the tests drive their
// checks through the same call the components make.
const INK_ON_FILL = new Set([colors.brass, colors.accentLight]);

export function onFill(fill) {
  return INK_ON_FILL.has(fill) ? colors.brandDeep : colors.onFill;
}

// Game-mode accents. The kit forbids inventing hues — extend by tinting pine,
// lakewater and ember — so every mode draws from the brand set or a sanctioned
// tint of it. Each is checked in test/engine.test.js for the contrast its own
// label needs, through onFill() rather than against a hardcoded ink.
//
// Daily takes pine because it is the hero card.
export const modeAccents = {
  daily: colors.brand,
  flag: "#256760", // lakewater, deepened for a parchment label
  capital: colors.emberInk,
  capitalReverse: colors.brass, // the one fill that carries ink
  shape: "#2E5A52", // pine, lifted and greened
  locator: "#2B5F6B", // lakewater, cooled toward slate
  higherLower: "#7E4720", // ember, deepened
  country: colors.brandDeep,
};

// Country-page topic accents. Same idea as modeAccents, and the same rule.
//
// Keyed by the `facts` jsonb key rather than by a display label, so relabeling
// a section never silently drops its colour. The two legacy keys (trade,
// culture) are here because older cached pages and hand-authored overrides
// still carry them.
//
// All six clear 4.5:1 on `surfaceRaised`, because they colour the section
// label, which is 11px mono — small text, so AA body contrast, not large.
// `brass` is deliberately absent: at 1.90:1 it is never text on light.
export const topicAccents = {
  physical_geography: colors.emberInk, // 5.40:1 — terrain warmth
  climate: colors.accent, // 4.70:1 — lakewater
  economy: colors.brand, // 10.45:1 — pine
  people_and_culture: "#7E4720", // 6.93:1 — ember, deepened
  trade: "#2B5F6B", // 6.60:1 — lakewater, cooled
  culture: colors.successInk, // 5.52:1
};

// --- Spacing ---------------------------------------------------------------
// 4px base. The kit's scale is 4·8·12·16·24·32·48·64·88 and "never an odd
// value". Card padding 20 mobile / 24 desktop; section rhythm 64/88.
export const spacing = (n) => n * 4;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  section: 48,
  hero: 64,
  page: 88,
};

// --- Radius ----------------------------------------------------------------
export const radius = { sharp: 2, sm: 6, card: 8, md: 8, sheet: 14, icon: 23, pill: 999 };

// --- Elevation -------------------------------------------------------------
// Three steps, no more: e1 rest, e2 hover, e3 overlay. Written with RN's
// shadow* props plus Android `elevation` so one call works on web, iOS and
// Android.
//
// The shadow colour is BARK, not black and not navy: "even the shadows are
// warm-biased". A neutral shadow on parchment goes grey and dirty.
const SHADOW = "#2A2320";
export function elevation(level = 1) {
  switch (level) {
    case 3:
      return {
        shadowColor: SHADOW,
        shadowOffset: { width: 0, height: 14 },
        shadowOpacity: 0.18,
        shadowRadius: 34,
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
        shadowOpacity: 0.08,
        shadowRadius: 2,
        elevation: 2,
      };
  }
}

// The hairline that does most of the structural work now that cards are cream
// on parchment and the shadow at e1 is deliberately faint.
export const hairline = { borderWidth: 1, borderColor: colors.border };

// --- Typography ------------------------------------------------------------
// Newsreader (display) · Instrument Sans (body/UI) · IBM Plex Mono (utility).
//
// Weight lives in the FAMILY NAME, not in `fontWeight`. Each weight of a Google
// font is registered as its own family (expo-font does this per file), and on
// web that family is declared at weight `normal` — so pairing it with
// `fontWeight: "600"` makes the browser synthesise a fake bold on top of a real
// one. Encoding the weight here and omitting fontWeight in components is what
// avoids that double-bolding, and it costs nothing on native.
//
// Display and H1 are weight 500; H2 and below are 600. The wordmark is the
// single exception — Newsreader 600 — because a logotype needs presence the
// headline scale does not.
export const fonts = {
  // Newsreader — display. A serif, which is the biggest visible change from
  // v1.1's grotesque, and the reason the app now reads as a book rather than a
  // dashboard.
  display: "Newsreader_500Medium",
  displayBold: "Newsreader_600SemiBold",
  // Instrument Sans — body, UI labels, buttons. Unchanged from v1.1.
  body: "InstrumentSans_400Regular",
  bodyMedium: "InstrumentSans_500Medium",
  bodySemi: "InstrumentSans_600SemiBold",
  // IBM Plex Mono — coordinates, eyebrows, map labels, data. Never sentences.
  mono: "IBMPlexMono_400Regular",
  monoMedium: "IBMPlexMono_500Medium",
};

// The kit's scale, verbatim. Tracking is given there as a fraction of size; RN
// wants absolute points, so it is multiplied out (-1.2% of 60 = -0.72, -0.6% of
// 40 = -0.24, 12% of 11 = 1.32). Line-heights likewise.
export const type = {
  display: {
    fontFamily: fonts.display,
    fontSize: 60,
    letterSpacing: -0.72,
    lineHeight: 64,
    color: colors.brand,
  },
  h1: {
    fontFamily: fonts.display,
    fontSize: 40,
    letterSpacing: -0.24,
    lineHeight: 46,
    color: colors.brand,
  },
  h2: {
    fontFamily: fonts.displayBold,
    fontSize: 28,
    letterSpacing: -0.11,
    lineHeight: 34,
    color: colors.brand,
  },
  // The kit's H3, and the floor for the serif: Newsreader is never used below
  // 17px, so anything smaller than this drops to Instrument Sans.
  h3: { fontFamily: fonts.displayBold, fontSize: 21, lineHeight: 26, color: colors.brand },
  bodyLarge: { fontFamily: fonts.body, fontSize: 18, lineHeight: 30, color: colors.text },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 24, color: colors.text },
  label: { fontFamily: fonts.bodySemi, fontSize: 13, lineHeight: 18, color: colors.text },
  // Secondary body text — captions, metadata, blurbs.
  caption: { fontFamily: fonts.body, fontSize: 13, lineHeight: 20, color: colors.textMuted },
  // Mono, tracked 12%. The structural voice of the app: section headers,
  // kickers, anything that labels rather than speaks. Ember-ink, because every
  // warm type in this system is emberInk and never ember.
  eyebrow: {
    fontFamily: fonts.monoMedium,
    fontSize: 11,
    letterSpacing: 1.32,
    lineHeight: 15,
    textTransform: "uppercase",
    color: colors.emberInk,
  },
  // Same mono voice, untransformed — coordinates and figures are already
  // correctly cased and would be mangled by uppercasing.
  data: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1.32,
    lineHeight: 15,
    color: colors.textFaint,
  },
};

// --- Layout ----------------------------------------------------------------
export const breakpoints = { sm: 480, md: 768, lg: 1024, xl: 1280 };

export const layout = {
  maxContentWidth: 680,
  maxMediaWidth: 1024,
  maxActionWidth: 420,
  maxPageWidth: 1240,
  // Kit: card padding 20 mobile / 24 desktop.
  cardPadding: 20,
  cardPaddingWide: 24,
};

export const constrain = {
  content: { width: "100%", maxWidth: layout.maxContentWidth, alignSelf: "center" },
  media: { width: "100%", maxWidth: layout.maxMediaWidth, alignSelf: "center" },
  action: { width: "100%", maxWidth: layout.maxActionWidth, alignSelf: "center" },
  page: { width: "100%", maxWidth: layout.maxPageWidth, alignSelf: "center" },
};

// Kit §HIT TARGETS: 44x44 minimum on touch, 32 on pointer.
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

// --- Materials -------------------------------------------------------------
// The kit's three composite grounds carry the cozy. CSS gradients don't exist
// in React Native, so these are exposed as ORDERED STOPS for whatever can draw
// them — react-native-svg gradients on the globe, a future LinearGradient on a
// hero panel — rather than as strings no platform here can parse.
//
// The one rule that survives the translation: light enters from ONE corner.
// Never two, never centred.
export const materials = {
  // Dusk wash — brass and ember falling from the top-right over a
  // pine-to-nightwood ramp. The only sanctioned gradient in the system.
  dusk: {
    ramp: ["#2A4A44", "#21403C", "#16292A"],
    glow: [
      { color: colors.brass, opacity: 0.3 },
      { color: colors.ember, opacity: 0.26 },
    ],
  },
  // The same wash on a darker ramp, for panels inside an already-lit page.
  duskDeep: {
    ramp: ["#20393A", "#1A2F2C", "#12211F"],
    glow: [
      { color: colors.brass, opacity: 0.24 },
      { color: colors.ember, opacity: 0.22 },
    ],
  },
  // Lantern glow from a lower-left corner, for a dark panel that needs warmth
  // without a full wash.
  lantern: { color: colors.brass, opacity: 0.16 },
};

// --- Map -------------------------------------------------------------------
// Kit §MAP SCREEN, and the one place the app stays dark. Grouped rather than
// folded into `colors` so it is obvious that a screen reaching for `map.*` is
// deliberately entering the dark stage, not accidentally using a dark token on
// a light page.
export const map = {
  ocean: colors.brandDeep,
  // "land --ww-brand at 88%" — pre-composited against the ocean rather than
  // left as an opacity, so SVG fills stay flat and predictable across renderers.
  land: "#203D3A",
  landActive: colors.accent,
  // "borders 1px brass at 35%"
  border: "rgba(216,164,74,0.35)",
  // Over the photographic basemap the same brass at 35% disappears into bright
  // desert and reappears over dark ocean. Borders are the one thing that has to
  // read everywhere on that layer, so they get more of it.
  borderOnRaster: "rgba(216,164,74,0.62)",
  graticule: "rgba(216,164,74,0.22)",
  // "Selected place: ember dot + halo; related places: lakewater diamonds."
  selected: colors.ember,
  related: colors.accent,
  label: colors.brass,
  // The two permitted inks on the dark stage. Neither carries alpha.
  onMap: colors.onFill,
  onMapQuiet: colors.onFillQuiet,
  // A plate for a map label, per the kit: "parchment on a 72% nightwood plate".
  labelPlate: "rgba(22,41,42,0.72)",

  // --- Terrain -----------------------------------------------------------
  // The globe's realistic basemap. See game/terrainTint.js for how a country
  // gets its class; these are only the name → colour mapping, kept here so that
  // module stays theme-free and testable.
  //
  // Every value sits close to `land` in LIGHTNESS and varies mostly in hue: the
  // map is a dark stage and land must stay land against `ocean`. Ice and desert
  // are the two deliberate exceptions — they are supposed to be the pale and
  // the warm things on the globe.
  terrain: {
    ice: "#7E8C93", // ice sheet and permanent snow
    tundra: "#4C5F5C", // treeless, frozen subsoil
    boreal: "#22423A", // taiga — the dark conifer belt
    temperate: "#2C5241", // mixed and broadleaf forest, farmland
    grassland: "#5E6640", // steppe, prairie, savanna grass
    drySteppe: "#7A6E45", // semi-arid scrub on the desert's edge
    desert: "#8A6A3C", // sand and rock
    mediterranean: "#4A5C3A", // dry summer scrub and olive country
    tropicalDry: "#3D6337", // savanna and monsoon woodland
    tropicalWet: "#27563A", // rainforest
    highland: "#5A6367", // mountain rock above the treeline
  },
  // The lit sphere: the ocean brightens toward the point facing the viewer and
  // falls away toward the limb, and `shade` darkens everything near the edge.
  // Together they are what make the globe read as a ball rather than a disc.
  oceanLit: "#1D3A3C",
  shade: "#0A1416",
};

// --- Accessibility ---------------------------------------------------------
// WCAG contrast ratio between two hex colors. Pure, no RN/DOM, so it's testable
// and doubles as a guard against a token change silently breaking text
// contrast. Kit §ACCESSIBILITY CONTRACT: body >= 4.5:1, large text and UI >= 3:1.
//
// The kit is explicit that BOTH light grounds must be checked — cream and
// parchment differ by roughly half a stop and small type sits on both.
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

// The two light grounds, so a check can assert against both rather than
// picking whichever one happens to pass.
export const LIGHT_GROUNDS = [colors.surface, colors.surfaceRaised];
