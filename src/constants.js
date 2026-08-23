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
// How long a region-pill spin takes. Longer than the flat map's jump because
// a rotation covers more visual distance and reads better unhurried.
export const GLOBE_SPIN_ANIMATION_MS = 520;

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
