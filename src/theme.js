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

const lightColors = {
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
  // The same barely-there treatment in the firelight family, for a warm marker
  // that has to carry a word — the PRO badge today. It exists because the
  // alternative breaks a kit rule: brass is decorative only (1.9:1), so "PRO"
  // can be neither brass type nor parchment-on-brass. emberInk on this measures
  // 4.64:1, so the badge is real AA body text rather than a decorative fleck.
  emberSurface: "#F4E3CF",

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

  // The press tint PressableTint lays over whatever was touched, and the colour
  // every elevation() shadow is cast in. Tokens rather than literals in those
  // components because each one inverts in the dark scheme.
  tint: "rgba(33,64,60,0.10)",
  shadow: "#2A2320",

  // Glass chrome (see `glass` below). Cream at 86% — warm, and opaque enough
  // that the chrome's own inks clear contrast whatever scrolls behind it.
  glassTint: "rgba(251,246,234,0.86)",
  // The lit top edge that makes a pane read as glass rather than as a tint.
  glassHighlight: "rgba(255,255,255,0.65)",
  glassBorder: "rgba(42,35,32,0.10)",
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
//
// In the dark scheme the rule is the same idea run the other way: pine, lake-
// water, ember and the status colours are LIFTED so they can be type on a dark
// ground, and a lifted fill is too light for parchment. So the dark set is
// every lifted fill, and they take nightwood exactly as brass always has. The
// tests drive both schemes through this one function.
const LIGHT_INK_ON_FILL = ["brass", "accentLight"];
const DARK_INK_ON_FILL = [
  "brass",
  "accentLight",
  "brand",
  "accent",
  "link",
  "ember",
  "emberInk",
  "success",
  "successInk",
  "danger",
];

export function onFill(fill) {
  const t = THEMES[active];
  return t.inkOnFill.has(fill) ? t.colors.brandDeep : t.colors.onFill;
}

// Game-mode accents. The kit forbids inventing hues — extend by tinting pine,
// lakewater and ember — so every mode draws from the brand set or a sanctioned
// tint of it. Each is checked in test/engine.test.js for the contrast its own
// label needs, through onFill() rather than against a hardcoded ink.
//
// Daily takes pine because it is the hero card.
export const modeAccents = {
  daily: lightColors.brand,
  flag: "#256760", // lakewater, deepened for a parchment label
  capital: lightColors.emberInk,
  capitalReverse: lightColors.brass, // the one fill that carries ink
  shape: "#2E5A52", // pine, lifted and greened
  locator: "#2B5F6B", // lakewater, cooled toward slate
  higherLower: "#7E4720", // ember, deepened
  country: lightColors.brandDeep,
  // Ember/brass family, tinted toward olive-gold rather than ember's red —
  // the kit's "coin" end of the firelight range, and far enough from
  // higherLower's own ember tint to read as a different tile.
  currency: "#6B5A2E",
  // Ember, deepened and reddened toward rust rather than currency's
  // olive-gold or higherLower's orange-brown — a third, distinct tint of the
  // same family rather than a new hue.
  language: "#6B4035",
  // M2.7 step 3. A tint of pine rather than a new hue, same rule as every
  // other mode accent — warmed and yellowed toward forest green, distinct
  // from shape's teal-lifted pine and nameEveryCountry's cooled pine.
  nationalAnimal: "#2F5233",
  // M2.7 step 4. A tint of lakewater rather than a new hue — the kit's
  // "cooled toward slate" end of that family, distinct from flag's deepened
  // teal and locator's own cooled lakewater.
  foodOrigin: "#2B5A5F",
  // M2.7 step 5. A tint of pine rather than a new hue, same rule as every
  // other mode accent — greyed and desaturated toward stone, distinct from
  // shape's teal-lifted pine, nationalAnimal's forest green and
  // nameEveryCountry's cooled pine, all of which read as more saturated
  // greens than this one.
  city: "#4A5A52",
  // M2.7 step 6.2. A tint of lakewater rather than a new hue, same rule as
  // every other mode accent — deepened further toward navy than flag's
  // teal-green, locator's blue-grey or foodOrigin's slate-teal, which is
  // the thematic fit for a river: water, but the deepest cast of it yet.
  river: "#1D4E66",
  // M2.7 step 7.2. An ember/brass tint rather than a new hue, deepened and
  // greyed toward granite — distinct from currency's olive-gold, language's
  // rust and higherLower's orange-brown (the other three ember-family tints),
  // and the thematic fit for a mountain range: stone rather than water.
  mountain: "#5A4632",
  // M2.7 step 8.2. The third and last feature-based tint of lakewater — cooled
  // further toward true navy than river's own teal-leaning cast, since the
  // open ocean is the deepest, bluest water in the catalog rather than a
  // river's or a coastline's.
  ocean: "#1A3450",
  // The two pro marathons (M2.12 steps 7-8). Both deepened the same way every
  // other mode accent is, because each carries a body-size label on parchment
  // and a raw brand tint measures 4.28:1.
  nameEveryCountry: "#1F5148", // pine, cooled
  identifyAllFlags: "#6B4A86", // a warm violet, deepened — the one mode hue
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
const lightTopicAccents = {
  physical_geography: lightColors.emberInk, // 5.40:1 — terrain warmth
  climate: lightColors.accent, // 4.70:1 — lakewater
  economy: lightColors.brand, // 10.45:1 — pine
  people_and_culture: "#7E4720", // 6.93:1 — ember, deepened
  trade: "#2B5F6B", // 6.60:1 — lakewater, cooled
  culture: lightColors.successInk, // 5.52:1
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
export function elevation(level = 1) {
  switch (level) {
    case 3:
      return {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 14 },
        shadowOpacity: 0.18,
        shadowRadius: 34,
        elevation: 12,
      };
    case 2:
      return {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
      };
    case 0:
      return {};
    default:
      return {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
        elevation: 2,
      };
  }
}

// The hairline that does most of the structural work now that cards are cream
// on parchment and the shadow at e1 is deliberately faint.
const buildHairline = (c) => ({ borderWidth: 1, borderColor: c.border });

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
function buildType(colors) {
  return {
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
}

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
// SLOWER AND SPRINGIER than the kit's original figures (120/200/320/600ms on
// cubic-bezier(.2,.7,.2,1), no bounce) — a deliberate product decision, Nov
// 2026, toward a modern Apple feel: roughly 1.7x the durations, three times the
// entrance travel, and spring physics that overshoot a little and settle.
//
// Stored as plain numbers, not RN `Easing`/spring objects, because
// test/engine.test.js imports this file in plain Node — a `react-native`
// import here would break the whole suite.
//
// Reduce-motion still drops every one of these to its resting state. That is an
// explicit request from someone who may get physically ill, and "more
// dramatic" makes honouring it matter more, not less.
export const motion = {
  duration: { micro: 200, ui: 340, sheet: 540, mapFly: 960 },
  // Apple's own deceleration curve (fast start, very long soft landing).
  easing: [0.32, 0.72, 0, 1],
  rise: 24,
  stagger: 70,
  maxStaggerSteps: 6,
  // Spring configs for Animated.spring. Each is UNDERDAMPED (damping ratio
  // under 1), so it overshoots slightly and settles, but never rings: the
  // ratio stays above 0.5. A test pins both bounds.
  //   entrance — content arriving: a soft rise with a gentle overshoot
  //   press    — a card under the thumb: quick to sink, springy to return
  //   bloom    — the nav pill growing into place
  spring: {
    entrance: { stiffness: 120, damping: 14, mass: 1 },
    press: { stiffness: 420, damping: 22, mass: 1 },
    bloom: { stiffness: 220, damping: 18, mass: 1 },
  },
  // How far a pressed card sinks, and how small content starts on entrance.
  pressScale: 0.96,
  entranceScale: 0.94,
};

// The damping ratio of a spring config: < 1 overshoots, 1 is critical, > 1 is
// sluggish. Pure, so the "springy but never ringing" contract is testable.
export function dampingRatio({ stiffness, damping, mass = 1 }) {
  return damping / (2 * Math.sqrt(stiffness * mass));
}

// --- Glass -----------------------------------------------------------------
// Frosted, translucent CHROME — the tab bar, the side rail, sheets and map
// overlays — in the modern Apple manner. Chrome only, by decision: cards that
// carry reading text stay opaque cream, so body contrast stays knowable.
//
// The tint is warm (cream / bark), never the neutral white or grey of a stock
// blur: everything in this system is warm-biased. It is opaque ENOUGH that a
// label on it clears contrast over the worst thing that could be behind it — a
// test composites the tint over pure black and pure white and checks the
// chrome's inks against both.
export const glass = {
  blur: 28, // px, web backdrop-filter
  saturate: 1.7, // web: the vibrancy that makes glass read as glass
  nativeIntensity: 70, // expo-blur intensity, 0-100
  radius: 28, // the floating tab bar's corner
};

// --- Materials -------------------------------------------------------------
// The kit's four composite grounds — "the cozy layer". They are what turns a
// correct palette into the room the brand describes: pine walls, a walnut desk,
// lantern light, aged paper.
//
// CSS gradients don't exist in React Native, so the kit's `background`
// shorthands can't be pasted in. Each is decomposed here into ORDERED,
// PLATFORM-NEUTRAL STOPS, and `components/Material.js` draws them with
// react-native-svg — which has linear gradients, radial gradients AND patterns
// on web, iOS and Android alike. One definition, three platforms, and the
// values stay readable next to the kit's own CSS.
//
// Rules that survive the translation, and are the whole reason these read as
// material rather than as noise:
//
//   · **Light enters from ONE corner.** Never two, never centred. The dusk
//     wash lights from the top right; the walnut desk and the lantern from the
//     lower left. A composition that lights from both has no light source.
//   · **At most two materials in one composition** — a lit page plus one desk,
//     or a dusk panel on a paper page.
//   · **Texture never sits behind body copy.** Materials belong to grounds,
//     panels and mockup surfaces. `MaterialSurface` takes the ground; the card
//     laid on it stays flat `surfaceRaised`, which is what lets the weave read
//     as paper rather than as dirt on the type.
//   · **Type on a material never carries alpha.** Inside the dusk wash's lit
//     corner the ground reaches L≈0.12, where a 0.65-alpha parchment label
//     lands at ~3.3:1. So there are exactly two inks on dark — `onFill` at any
//     size, `onFillQuiet` at 16px+ over a material (14px+ on flat pine).
//
// Grain periods are deliberately co-prime-ish (9/17/29/43/97). Beaten against
// each other they never line up inside a viewport, so the desk reads as figure
// rather than as corduroy — a single 9px stripe would visibly tile.
const lightMaterials = {
  // Dusk wash — brass and ember falling from the top-right over a
  // pine-to-nightwood ramp. The only sanctioned gradient in the system.
  dusk: {
    base: "#21403C",
    // CSS `linear-gradient(168deg, …)`: 12° off straight down, leaning right.
    ramp: {
      angle: 168,
      stops: [
        { offset: 0, color: "#2A4A44" },
        { offset: 0.44, color: "#21403C" },
        { offset: 1, color: "#16292A" },
      ],
    },
    glow: [
      { color: lightColors.brass, opacity: 0.3, cx: 1, cy: 0, rx: 1.2, ry: 0.9, fade: 0.58 },
      { color: lightColors.ember, opacity: 0.26, cx: 0.86, cy: 0.1, rx: 0.9, ry: 0.7, fade: 0.62 },
    ],
  },
  // The same wash on a darker ramp, for a panel inside an already-lit page.
  duskDeep: {
    base: "#1A2F2C",
    ramp: {
      angle: 168,
      stops: [
        { offset: 0, color: "#20393A" },
        { offset: 0.46, color: "#1A2F2C" },
        { offset: 1, color: "#12211F" },
      ],
    },
    glow: [
      { color: lightColors.brass, opacity: 0.24, cx: 1, cy: 0, rx: 1.2, ry: 0.9, fade: 0.58 },
      { color: lightColors.ember, opacity: 0.22, cx: 0.88, cy: 0.08, rx: 0.9, ry: 0.7, fade: 0.62 },
    ],
  },
  // Paper fibre — a 3-4px weave at ~3% ink plus a brass wash from the top edge.
  // The default page ground, and the quietest material by a wide margin: at 3%
  // it is felt rather than seen, which is exactly the brief.
  paper: {
    base: lightColors.surface,
    weave: [
      { axis: "horizontal", color: "#7A6A58", opacity: 0.032, thickness: 1, period: 3 },
      { axis: "vertical", color: "#7A6A58", opacity: 0.026, thickness: 1, period: 4 },
    ],
    glow: [
      { color: lightColors.brass, opacity: 0.11, cx: 0.5, cy: 0, rx: 1.3, ry: 0.9, fade: 0.72 },
    ],
  },
  // Pine grain — the wall. Vertical stripes in nightwood with a brass fleck.
  // Layer OVER a dark base or over duskDeep.
  pineGrain: {
    base: lightColors.brand,
    grain: [
      { axis: "vertical", color: "#0B1614", opacity: 0.2, thickness: 2, period: 9 },
      { axis: "vertical", color: lightColors.brass, opacity: 0.045, thickness: 1, period: 17 },
      { axis: "vertical", color: "#0B1614", opacity: 0.11, thickness: 4, period: 29 },
    ],
  },
  // Walnut desk — horizontal grain from five beaten periods, the last supplying
  // figure, lit from the upper left. ONLY ever the ground beneath a device, a
  // card or an artefact. Never behind type.
  walnut: {
    base: "#5A3A1F",
    ramp: {
      angle: 176,
      stops: [
        { offset: 0, color: "#6B4526" },
        { offset: 1, color: "#482E17" },
      ],
    },
    grain: [
      { axis: "horizontal", color: "#281509", opacity: 0.15, thickness: 1, period: 9 },
      { axis: "horizontal", color: "#1E0F06", opacity: 0.11, thickness: 1, period: 17 },
      { axis: "horizontal", color: lightColors.brass, opacity: 0.05, thickness: 1, period: 29 },
      { axis: "horizontal", color: "#281509", opacity: 0.09, thickness: 2, period: 43 },
      { axis: "horizontal", color: "#1E0F06", opacity: 0.13, thickness: 4, period: 97 },
    ],
    glow: [{ color: lightColors.brass, opacity: 0.15, cx: 0.2, cy: 0, rx: 1.4, ry: 1, fade: 0.64 }],
  },
  // Lantern — a warm glow from the lower left, for a dark panel that needs
  // warmth without a full wash. Composable on top of any of the above.
  lantern: {
    glow: [
      { color: lightColors.brass, opacity: 0.16, cx: 0.1, cy: 1, rx: 0.75, ry: 0.65, fade: 0.62 },
    ],
  },
};

// A CSS gradient angle → the two endpoints react-native-svg wants, in
// object-bounding-box units.
//
// CSS measures from "to top" and turns clockwise (0 up, 90 right, 180 down);
// SVG wants a start and an end point. Getting this wrong is silent — the wash
// still renders, just lit from the wrong corner, which is the one thing the
// kit says must never happen. So it is a function with a test rather than four
// numbers typed into a component.
export function gradientVector(angle) {
  const rad = ((angle % 360) * Math.PI) / 180;
  // Screen space: y grows downward, so "to top" is (0, -1) and a clockwise
  // turn of θ takes it to (sin θ, -cos θ).
  const dx = Math.sin(rad);
  const dy = -Math.cos(rad);
  return {
    x1: 0.5 - dx / 2,
    y1: 0.5 - dy / 2,
    x2: 0.5 + dx / 2,
    y2: 0.5 + dy / 2,
  };
}

export const MATERIALS = Object.keys(lightMaterials);

// A material's flat fallback. Every Material draws over this as a plain
// background colour, so a platform that can't render a pattern degrades to the
// right brand colour rather than to a hole in the layout.
export function materialBase(name) {
  return materials[name]?.base ?? "transparent";
}

// Which of the two permitted inks a material's ground carries, and the size
// floor that ink needs. The kit gives lichen three different floors depending
// on what is under it — 14px on flat pine or nightwood, 16px over a wash or a
// grain, because the dusk wash's lit corner drops it to 3.4:1. Encoding it here
// means a component asks rather than remembers.
export function materialInk(name) {
  const dark = name === "dusk" || name === "duskDeep" || name === "pineGrain" || name === "walnut";
  if (!dark) return { primary: colors.text, quiet: colors.textMuted, quietMinSize: 11 };
  return { primary: colors.onFill, quiet: colors.onFillQuiet, quietMinSize: 16 };
}

// --- Map -------------------------------------------------------------------
// Kit §MAP SCREEN, and the one place the app stays dark. Grouped rather than
// folded into `colors` so it is obvious that a screen reaching for `map.*` is
// deliberately entering the dark stage, not accidentally using a dark token on
// a light page.
export const map = {
  // The pine wall a map panel sits in (outline boxes, the country hero, the
  // Explore frame). Pinned to the light palette's pine on purpose: `brand`
  // lifts to sage in the dark scheme, and the map stage must not.
  stage: lightColors.brand,
  ocean: lightColors.brandDeep,
  // "land --ww-brand at 88%" — pre-composited against the ocean rather than
  // left as an opacity, so SVG fills stay flat and predictable across renderers.
  land: "#203D3A",
  landActive: lightColors.accent,
  // "borders 1px brass at 35%"
  border: "rgba(216,164,74,0.35)",
  // Over the photographic basemap the same brass at 35% disappears into bright
  // desert and reappears over dark ocean. Borders are the one thing that has to
  // read everywhere on that layer, so they get more of it.
  borderOnRaster: "rgba(216,164,74,0.62)",
  graticule: "rgba(216,164,74,0.22)",
  // "Selected place: ember dot + halo; related places: lakewater diamonds."
  selected: lightColors.ember,
  related: lightColors.accent,
  label: lightColors.brass,
  // The two permitted inks on the dark stage. Neither carries alpha.
  onMap: lightColors.onFill,
  onMapQuiet: lightColors.onFillQuiet,
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

// A mode accent used AS TYPE — the small "Capital"/"River" eyebrow on a quiz
// badge. Mode accents are fills, deep enough for a parchment label; as type
// they read on parchment but sink into bark, and brass (capitalReverse) never
// reads on light at all. So: the accent itself when it clears body contrast on
// the card in the active scheme, otherwise the eyebrow ink — the badge keeps
// the mode's colour in its border either way.
export function accentInk(accent) {
  const card = colors.surfaceRaised;
  return /^#[0-9A-Fa-f]{6}$/.test(accent) && contrastRatio(accent, card) >= CONTRAST.body
    ? accent
    : colors.emberInk;
}

// The two light grounds, so a check can assert against both rather than
// picking whichever one happens to pass.
export const LIGHT_GROUNDS = [lightColors.surface, lightColors.surfaceRaised];

// ===========================================================================
// THE DARK SCHEME — "the cartography room with the lamp turned low"
//
// Not a neutral grey dark mode. The page is deep bark and charcoal (warm, the
// same family as the light scheme's ink, not #121212), the inks are parchment,
// and pine, lakewater and ember are carried through — LIFTED, because a colour
// that is ink on parchment is invisible on bark. Three consequences worth
// knowing before touching a value:
//
//   · Lifted brand colours are too light to carry parchment, so in this scheme
//     they carry nightwood instead. That is `onFill()`'s job, which is why a
//     label on a fill must always go through it rather than naming `onFill`.
//   · The MAP DOES NOT CHANGE. It was already the dark stage; `map.*` is built
//     from the light palette and is identical in both schemes. So is
//     `modeAccents`: those are tile fills with parchment labels, and a deep
//     tinted tile reads on bark as well as on parchment.
//   · Materials get dark variants rather than inversions: the paper weave
//     becomes a parchment fibre at a few percent over bark, and the dusk wash
//     sinks a step so it stays a lit panel rather than the brightest thing on
//     the page. Light still enters from one corner.
// ===========================================================================
const darkColors = {
  // Sage pine — the walls of the room, read by lamplight. Headings, active nav,
  // primary fills (which take nightwood ink, via onFill()).
  brand: "#9CC3B1",
  brandDeep: "#16292A",
  accent: "#6DB3A5",
  accentLight: "#8FC4B4",
  link: "#80C4B6",
  ember: "#C8743C",
  brass: "#D8A44A",
  emberInk: "#E39D68",
  success: "#6FAE6B",
  successInk: "#94CB8F",
  danger: "#E0866E",
  successSurface: "#1F2A1D",
  dangerSurface: "#34201A",
  emberSurface: "#33251A",

  // Bark and charcoal. The page is the darkest ground, the card sits half a
  // stop above it, a well sinks below — the same three-level ladder as light.
  surface: "#1C1815",
  surfaceRaised: "#27211C",
  surfaceSunken: "#141110",

  // Parchment ink, ramped down the same four steps as bark ink is in light.
  text: "#EFE6D3",
  textSecondary: "#D6CBB6",
  textMuted: "#BAAC95",
  textFaint: "#A49580",

  onFill: "#F4EBD9",
  onFillQuiet: "#C9BFA8",

  border: "rgba(244,235,217,0.12)",
  borderStrong: "rgba(244,235,217,0.2)",
  borderSolid: "#3B332B",

  tint: "rgba(244,235,217,0.10)",
  // Still warm, never neutral black: a shadow that goes blue-grey on bark looks
  // as dirty as a neutral one on parchment.
  shadow: "#0B0806",

  // Smoked bark glass, with a faint parchment rim.
  glassTint: "rgba(39,33,28,0.88)",
  glassHighlight: "rgba(244,235,217,0.14)",
  glassBorder: "rgba(244,235,217,0.10)",
};

// Every topic label is 11px mono on cream — so on bark each one is lifted to
// clear body contrast there instead. Same hues, same keys.
const darkTopicAccents = {
  physical_geography: darkColors.emberInk,
  climate: darkColors.accent,
  economy: darkColors.brand,
  people_and_culture: "#D9A27A",
  trade: "#8BBCC6",
  culture: darkColors.successInk,
};

const darkMaterials = {
  dusk: {
    base: "#1A3532",
    ramp: {
      angle: 168,
      stops: [
        { offset: 0, color: "#223F3B" },
        { offset: 0.44, color: "#1A3532" },
        { offset: 1, color: "#10201F" },
      ],
    },
    glow: [
      { color: darkColors.brass, opacity: 0.24, cx: 1, cy: 0, rx: 1.2, ry: 0.9, fade: 0.58 },
      { color: darkColors.ember, opacity: 0.2, cx: 0.86, cy: 0.1, rx: 0.9, ry: 0.7, fade: 0.62 },
    ],
  },
  duskDeep: {
    base: "#142826",
    ramp: {
      angle: 168,
      stops: [
        { offset: 0, color: "#1A302F" },
        { offset: 0.46, color: "#142826" },
        { offset: 1, color: "#0C1817" },
      ],
    },
    glow: [
      { color: darkColors.brass, opacity: 0.2, cx: 1, cy: 0, rx: 1.2, ry: 0.9, fade: 0.58 },
      { color: darkColors.ember, opacity: 0.18, cx: 0.88, cy: 0.08, rx: 0.9, ry: 0.7, fade: 0.62 },
    ],
  },
  // Paper by lamplight: the same weave, now parchment fibre over bark, and the
  // brass wash from the top edge turned down to a glimmer.
  paper: {
    base: darkColors.surface,
    weave: [
      { axis: "horizontal", color: "#F4EBD9", opacity: 0.022, thickness: 1, period: 3 },
      { axis: "vertical", color: "#F4EBD9", opacity: 0.018, thickness: 1, period: 4 },
    ],
    glow: [
      { color: darkColors.brass, opacity: 0.06, cx: 0.5, cy: 0, rx: 1.3, ry: 0.9, fade: 0.72 },
    ],
  },
  pineGrain: {
    base: "#1B3633",
    grain: [
      { axis: "vertical", color: "#0B1614", opacity: 0.22, thickness: 2, period: 9 },
      { axis: "vertical", color: darkColors.brass, opacity: 0.035, thickness: 1, period: 17 },
      { axis: "vertical", color: "#0B1614", opacity: 0.12, thickness: 4, period: 29 },
    ],
  },
  walnut: {
    base: "#432B16",
    ramp: {
      angle: 176,
      stops: [
        { offset: 0, color: "#50341C" },
        { offset: 1, color: "#352211" },
      ],
    },
    grain: lightMaterials.walnut.grain,
    glow: [{ color: darkColors.brass, opacity: 0.11, cx: 0.2, cy: 0, rx: 1.4, ry: 1, fade: 0.64 }],
  },
  lantern: {
    glow: [
      { color: darkColors.brass, opacity: 0.12, cx: 0.1, cy: 1, rx: 0.75, ry: 0.65, fade: 0.62 },
    ],
  },
};

export const DARK_GROUNDS = [darkColors.surface, darkColors.surfaceRaised];

// ---------------------------------------------------------------------------
// Scheme resolution.
//
// Every themed export below is a LIVE VIEW onto the active scheme's tokens, so
// `colors.surface` reads bark or parchment depending on which is active at the
// moment it is read. That is what keeps dark mode a theming change rather than
// a component rewrite: a component that reads tokens at render time is already
// correct. The one thing it cannot fix is a value captured ONCE at module load
// — a `StyleSheet.create({...})` at the top of a file — which is what
// `themed()` is for: it defers the factory and caches one result per scheme.
//
// Which scheme is active is decided by App.js (game/colorScheme.js resolves
// the setting against the OS; lib/appearance.js reads the OS). This module
// only holds the answer, so it stays free of React Native and testable here.
export const SCHEMES = ["light", "dark"];

function buildTheme(c, topics, mats, inkNames) {
  return {
    colors: c,
    topicAccents: topics,
    materials: mats,
    type: buildType(c),
    hairline: buildHairline(c),
    inkOnFill: new Set(inkNames.map((n) => c[n])),
  };
}

const THEMES = {
  light: buildTheme(lightColors, lightTopicAccents, lightMaterials, LIGHT_INK_ON_FILL),
  dark: buildTheme(darkColors, darkTopicAccents, darkMaterials, DARK_INK_ON_FILL),
};

let active = "light";

export function setActiveScheme(scheme) {
  active = SCHEMES.includes(scheme) ? scheme : "light";
  return active;
}

export function activeScheme() {
  return active;
}

// A scheme's tokens, read directly — for tests, and for the few places that
// must name a scheme explicitly rather than follow the active one.
export function themeFor(scheme) {
  const t = THEMES[scheme] ?? THEMES.light;
  return {
    colors: t.colors,
    topicAccents: t.topicAccents,
    materials: t.materials,
    type: t.type,
    hairline: t.hairline,
  };
}

function liveView(resolve) {
  return new Proxy(
    {},
    {
      get: (_, key) => resolve()[key],
      has: (_, key) => key in resolve(),
      ownKeys: () => Reflect.ownKeys(resolve()),
      getOwnPropertyDescriptor: (_, key) => {
        const d = Reflect.getOwnPropertyDescriptor(resolve(), key);
        return d && { ...d, configurable: true };
      },
    }
  );
}

export const colors = liveView(() => THEMES[active].colors);
export const topicAccents = liveView(() => THEMES[active].topicAccents);
export const materials = liveView(() => THEMES[active].materials);
export const type = liveView(() => THEMES[active].type);
export const hairline = liveView(() => THEMES[active].hairline);

// Defer a module-level style object (or any token-derived lookup) until it is
// read, building it once per scheme. Wrap a top-of-file StyleSheet:
//
//   const styles = themed(() => StyleSheet.create({ ... }));
//
// `styles.foo` then resolves against whichever scheme is active at render.
export function themed(factory) {
  const cache = {};
  return liveView(() => (cache[active] ??= factory()));
}

// The CompassMark tone for the page ground. Pine on bark disappears, so the
// dark scheme asks for the kit's own cream mark — the brand artwork itself is
// untouched; only which of its sanctioned tones a page picks changes.
export function pageMarkTone() {
  return active === "dark" ? "cream" : "pine";
}
