// Central place for tunable game parameters — keep gameplay numbers out of components.
export const ROUND_LENGTH = 8; // questions per single-mode round
export const DAILY_LENGTH = 6; // questions in the Daily Challenge
export const OPTIONS_PER_QUESTION = 4; // total answer choices (1 correct + distractors)

// Difficulty tiers a player can pick before a round. "all" draws from every
// country regardless of tier; the others filter the target pool (see questions.js).
export const DIFFICULTIES = [
  { key: "all", label: "All" },
  { key: "easy", label: "Easy" },
  { key: "medium", label: "Medium" },
  { key: "hard", label: "Hard" },
];
export const DEFAULT_DIFFICULTY = "all";

// Timed mode: seconds allowed to answer each question before it counts as
// wrong. Not applied to the Daily Challenge — that round stays untimed.
export const TIMED_SECONDS_PER_QUESTION = 10;

// Streaks: a "freeze" automatically protects your streak across a missed day.
// Players hold up to STREAK_FREEZE_MAX at once and earn one each time their
// streak reaches a STREAK_FREEZE_EARN_EVERY-day milestone.
export const STREAK_FREEZE_MAX = 2;
export const STREAK_FREEZE_EARN_EVERY = 5;

// XP awarded at the end of a round.
export const XP = {
  perCorrect: 10,
  strongBonusThreshold: 4, // correct answers above this earn a bonus
  strongBonusPerCorrect: 5,
};

// World Map screen (M2.3 step 2a): zoom bounds for pinch/scroll-to-zoom, and
// how fast a wheel/trackpad tick changes scale on web.
export const MAP_ZOOM_MIN = 1;
export const MAP_ZOOM_MAX = 4;
export const MAP_WHEEL_ZOOM_SPEED = 0.0016;

// World Map screen (M2.3 step 2b): a single-finger/mouse press only becomes a
// pan once it moves this many screen pixels — below that, it's left alone as
// a tap so it still reaches ExploreMap's country shapes.
export const MAP_DRAG_THRESHOLD = 4;

// World Map screen (M2.3 step 3.2): countries whose bounding box's longest
// side is under this many viewBox units (see data/worldMap.js's projection)
// get an invisible circular hit target of MAP_SMALL_HIT_RADIUS instead of
// relying on their own tiny shape — the long tail of micro-states that are
// otherwise all-but-untappable before zooming in.
export const MAP_SMALL_COUNTRY_MAX_SIZE = 6;
export const MAP_SMALL_HIT_RADIUS = 5;

// World Map screen (M2.3 step 3.3): tapping a country shows its name at the
// tap point for this long before its country page opens — a beat long enough
// to read the name, short enough to still feel like one continuous tap.
// Font size is in the map's own viewBox units (see data/worldMap.js), so the
// label scales with the map itself at any zoom level instead of a fixed pixel
// size.
export const MAP_TAP_LABEL_DELAY_MS = 380;
export const MAP_TAP_LABEL_FONT_SIZE = 7;
// Hover tooltip on the Explore globe. Sized in viewBox units like everything
// else the globe draws, so it stays the same on-screen size at any zoom.
export const GLOBE_TOOLTIP_FONT_SIZE = 7;
export const GLOBE_TOOLTIP_PAD_X = 4;
export const GLOBE_TOOLTIP_PAD_Y = 2.5;
// How far above the country's center the chip floats. Enough to clear the
// shape being named without detaching from it.
export const GLOBE_TOOLTIP_GAP = 7;

// World Map screen (M2.3 step 5.3): how long a region-pill jump (or the
// return to the full World view) takes to animate, instead of cutting
// straight to the new scale/pan.
export const MAP_REGION_ANIMATION_MS = 320;

// Globe (M2.3.7). The SVG viewBox is a fixed square and the sphere is drawn
// inside it, so zoom grows the globe's radius rather than scaling the whole
// canvas. That's what keeps borders and labels a constant thickness on screen
// at every zoom level instead of fattening as you go in.
export const GLOBE_VIEW_SIZE = 400;
export const GLOBE_BASE_RADIUS = 190; // radius at zoom 1, inside GLOBE_VIEW_SIZE
// Country borders, in viewBox units. Constant on screen at any zoom (see
// above), so this is a true hairline rather than a value that needs scaling.
export const GLOBE_BORDER_WIDTH = 0.5;
// Countries whose widest angular span is under this many degrees get the same
// enlarged tap target treatment the flat map gives micro-states.
export const GLOBE_SMALL_COUNTRY_MAX_DEGREES = 3;
export const GLOBE_SMALL_HIT_RADIUS = 6; // viewBox units

// Locator mode has a harder job than Explore. On Explore a country too small to
// tap is a minor annoyance — you can spin, zoom, or tap its neighbour instead.
// In the game you must tap one specific country to answer, and it may be
// Djibouti, which projects to about six pixels and is invisible against its
// neighbours. Worse, the answer reveal says "Djibouti is in green" while
// pointing at something the player cannot see.
//
// So a small candidate gets a drawn marker ring, not just an invisible hit
// area. The ring is the affordance; the hit circle around it is larger still,
// the usual pattern of a touch target exceeding its visual. At the 300px-tall
// box this screen renders into, 14 viewBox units is ~21 CSS px of ring inside a
// ~44 px target — the minimum the M2.4 a11y pass set.
export const GLOBE_LOCATOR_MARKER_RADIUS = 14; // viewBox units — the visible ring
export const GLOBE_LOCATOR_HIT_RADIUS = 29; // viewBox units — the touch target
export const GLOBE_LOCATOR_MARKER_WIDTH = 2.5;
// How long a region-pill spin takes. Longer than the flat map's jump because
// a rotation covers more visual distance and reads better unhurried.
export const GLOBE_SPIN_ANIMATION_MS = 520;

// XP levels (M2.5 step 5): the curve is a game-balance call, kept in one place
// so it can be retuned without touching levelPolicy.js's math. Level 1 starts
// at 0 XP; LEVEL_XP_BASE is what level 2 costs, and each subsequent level
// costs LEVEL_XP_GROWTH times the last — a standard escalating RPG curve, not
// a flat "N XP per level" ladder, so early levels come quickly (a round or
// two) while later ones ask for sustained play.
export const LEVEL_XP_BASE = 100;
export const LEVEL_XP_GROWTH = 1.35;

// Learning paths (M2.4 step 2): a node "demonstrates mastery" once the player
// has shown sustained accuracy at its difficulty tier — the finest signal
// game_results tracks today (per-round score/total tagged by mode +
// difficulty, not per-country). MASTERY_MIN_ROUNDS keeps one lucky round from
// counting; MASTERY_ACCURACY is the bar a tier's rounds have to clear.
export const MASTERY_MIN_ROUNDS = 3;
export const MASTERY_ACCURACY = 0.8;

// Graticule (M2.3.7 step 4.2): the lat/lng grid, drawn under the land so it
// only reads through open ocean. 30° spacing matches every reference globe's
// own convention (12 meridians, 5 parallels); 5° sampling along each line is
// dense enough that the orthographic curve of a great circle looks smooth
// without pushing per-frame point count anywhere near the country data's own.
export const GLOBE_GRATICULE_STEP_DEG = 30;
export const GLOBE_GRATICULE_SAMPLE_DEG = 5;
export const GLOBE_GRATICULE_WIDTH = 0.4;

// Atmosphere/limb glow (M2.3.7 step 4.3): a soft halo ringing the globe's
// silhouette, the way every real photo of Earth from space shows the
// atmosphere scattering light at the limb. Purely a rendering effect — no sun
// position exists anywhere in the app, so this is a symmetric glow around the
// whole disc rather than a true day/night terminator line.
// A fixed viewBox-unit width, same reasoning as GLOBE_BORDER_WIDTH: it holds a
// constant on-screen thickness at every zoom instead of growing with the
// sphere's radius, so the halo reads as a thin physical layer, not a scaled sticker.
export const GLOBE_ATMOSPHERE_WIDTH = 8;
export const GLOBE_ATMOSPHERE_PEAK_OPACITY = 0.32;
export const GLOBE_ATMOSPHERE_RIM_WIDTH = 1.2;
export const GLOBE_ATMOSPHERE_RIM_OPACITY = 0.4;

// --- Higher or Lower -------------------------------------------------------
// Two countries, one metric, pick the bigger. The streak is the mode: a single
// question is a coin flip, a run of eight is knowledge.
//
// Metrics are declared as data rather than branched on in code, so adding
// "coastline" later is a line here rather than a new case in the builder.
// `field` names the property on the bundled country metrics (see
// src/data/countryMetrics.js); `unit` is how a value is read back after the
// answer, which is the part that teaches.
export const HIGHER_LOWER_METRICS = [
  {
    key: "population",
    field: "population",
    prompt: "Which has the larger population?",
    unit: "people",
  },
  {
    key: "area",
    field: "areaKm2",
    prompt: "Which is larger by area?",
    unit: "km²",
  },
  {
    key: "borders",
    field: "borderCount",
    prompt: "Which has more land borders?",
    unit: "land borders",
  },
];

// A pair whose values are nearly equal is a coin flip dressed as a question —
// the player cannot know that Kenya is 1% bigger than Somalia, and being marked
// wrong for it teaches nothing. Continuous metrics need a clear ratio; border
// counts are small integers, where any difference at all is a real one.
export const HIGHER_LOWER_MIN_RATIO = 1.25;

// How hard the builder tries to find a fair pair before giving up on a metric
// and moving to the next one. Bounded so a degenerate pool cannot spin forever.
export const HIGHER_LOWER_MAX_ATTEMPTS = 40;

// The streak bonus. Deliberately superlinear: the mode is about chaining, and a
// reward that scales linearly makes eight singles worth the same as a run of
// eight, which is exactly the wrong incentive.
export const HIGHER_LOWER_STREAK = {
  // No bonus for the first couple — a two-streak is luck often enough.
  bonusFrom: 3,
  // XP per streak step at or past `bonusFrom`, multiplied by how far past it
  // the run reached.
  xpPerStep: 2,
  // Ceiling, so a perfect round cannot dwarf every other mode's XP.
  maxBonus: 40,
};
