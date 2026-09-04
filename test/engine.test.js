// Pure-logic tests for the quiz engine. Run with: npm test  (uses tsx)
// No React Native imports here, so it runs fast in plain Node via tsx.
import { COUNTRIES, LOCATOR_COUNTRIES, countryName } from "../src/data/countries";
import { COUNTRY_PATHS } from "../src/data/worldMap";
import { buildRound, buildDaily } from "../src/game/questions";
import { computeXp } from "../src/game/scoring";
import { WHY_IT_MATTERS, whyItMatters } from "../src/data/whyItMatters";
import { COUNTRY_PAGES, getCountryPage } from "../src/data/countryPages";
import {
  applyRoundResult,
  normalizeProgress,
  streakStatus,
  dayKey,
  DEFAULT_PROGRESS,
} from "../src/game/progress";
import { normalizeSettings, DEFAULT_SETTINGS } from "../src/game/settings";
import {
  statsRowFromProgress,
  progressFromStatsRow,
  resultRowFromRound,
  mergeProgress,
} from "../src/game/cloudSync";
import { roundSinks, shouldMigrate } from "../src/game/syncPolicy";
import { searchCountries, REGIONS } from "../src/game/countryIndex";
import { clampScale, pinchScale, wheelZoom, touchDistance, dragPan, clampPan, lerpView } from "../src/game/mapZoom";
import { pathBounds, smallCountryHitTargets, countryCentroids } from "../src/game/mapHitTargets";
import { MAP_REGIONS, regionBounds, regionView } from "../src/game/mapRegions";
import { countryRowFromPage, pageFromCountryRow } from "../src/game/contentSync";
import {
  contentCacheKey,
  cacheEntry,
  parseCacheEntry,
  isCacheFresh,
  resolveCountryContent,
} from "../src/game/contentPolicy";
import {
  lngLatToVec,
  vecToLngLat,
  orientation,
  rotate,
  toScreen,
  isVisible,
  projectRing,
  projectCountry,
  ringsFromPath,
  countryCenter,
  pointsToPath,
  graticuleLines,
  projectGraticuleLine,
  pointsToPolylinePath,
} from "../src/game/globeProjection";
import {
  DEFAULT_SPIN,
  MAX_LATITUDE,
  normalizeLng,
  clampSpin,
  spinFromDrag,
  shortestLngDelta,
  lerpSpin,
  angleBetween,
  groupSpin,
  groupZoom,
  zoomForRadius,
  countryAngularRadius,
  spinVelocityFromDrag,
  decayVelocity,
  isMomentumDone,
  stepMomentum,
  MOMENTUM_FRAME_MS,
} from "../src/game/globeMotion";
import { COUNTRY_RINGS, COUNTRY_CENTERS, GLOBE_COUNTRY_CODES } from "../src/data/worldGeo";
import { pickRedirectUrl } from "../src/auth/redirectPolicy";
import { INTERESTS, INTEREST_SLUGS } from "../src/data/interests";
import { isValidInterestSlug, normalizeInterests } from "../src/game/interestPolicy";
import {
  interestRowsFromSlugs,
  slugsFromInterestRows,
  mergeInterests,
  diffInterestRows,
} from "../src/game/interestSync";
import { LEARNING_PATH_REGIONS, LEARNING_PATHS, getLearningPath } from "../src/data/learningPaths";
import { computeNodeStates } from "../src/game/masteryPolicy";
import { ACHIEVEMENTS } from "../src/data/achievements";
import { computeAchievements } from "../src/game/achievementPolicy";
import {
  colors,
  contrastRatio,
  CONTRAST,
  onFill,
  modeAccents,
  map,
  spacing,
  layout,
  constrain,
  motion,
} from "../src/theme";
import {
  OPTIONS_PER_QUESTION,
  DIFFICULTIES,
  ROUND_LENGTH,
  STREAK_FREEZE_EARN_EVERY,
  MAP_SMALL_COUNTRY_MAX_SIZE,
  MAP_SMALL_HIT_RADIUS,
} from "../src/constants";

import {
  TABS,
  TAB_KEYS,
  ROUTES,
  MAX_STACK_DEPTH,
  initialNav,
  navFromPath,
  navToPath,
  currentRoute,
  currentStack,
  stackDepth,
  canGoBack,
  showsChrome,
  navigate,
  replace,
  back,
  switchTab,
  routeToPath,
  pathToRoute,
  syncToPath,
} from "../src/game/navigation";
import { BREAKPOINTS, RAIL_WIDTH, navMode, chromeLayout } from "../src/game/layout";
import {
  INITIAL_SYNC_STATE,
  FAILURE_ESCALATION,
  SYNC_IDLE,
  SYNC_OK,
  SYNC_RETRYING,
  SYNC_FAILED,
  describeError,
  recordSyncSuccess,
  recordSyncFailure,
  describeSyncState,
} from "../src/game/syncStatus";
import {
  getSyncState,
  subscribeSyncState,
  noteSyncOk,
  noteSyncFailure,
  resetSyncState,
  __setSyncStoreDeps,
} from "../src/game/syncStore";
import {
  resolveInterestPrompt,
  resolveSecondaryAction,
  ORIGIN_PROMPT,
  ORIGIN_EDIT,
} from "../src/game/interestPrompt";
import {
  MAX_CHUNK_CHARS,
  splitProse,
  chunkCountry,
  staleChunkIndexes,
} from "../src/game/contentChunks";
import { rerankByInterests, matchesInterests, INTEREST_BOOST } from "../src/game/ragRanking";
import {
  systemPrompt,
  buildUserMessage,
  formatSources,
  citedRefs,
  isUngrounded,
  NO_CONTEXT_ANSWER,
} from "../src/game/ragPrompt";
import { checkRateLimit, validateQuestion, RATE_LIMIT } from "../src/game/askLimits";

let fails = 0;
const check = (cond, msg) => {
  if (cond) {
    console.log("  ✓", msg);
  } else {
    console.log("  ✗", msg);
    fails++;
  }
};

console.log("Dataset");
const codes = new Set(COUNTRIES.map((c) => c.code));
check(codes.size === COUNTRIES.length, "country codes are unique");
check(
  COUNTRIES.every((c) => c.code && c.name && c.capital && c.region),
  "every country has code, name, capital, region"
);
check(COUNTRIES.length >= 40, `dataset has >= 40 countries (${COUNTRIES.length})`);
check(COUNTRIES.length === 196, `dataset has all 196 countries (${COUNTRIES.length})`);

const validTiers = new Set(["easy", "medium", "hard"]);
check(
  COUNTRIES.every((c) => validTiers.has(c.difficulty)),
  "every country has a valid difficulty tier (easy/medium/hard)"
);
for (const tier of ["easy", "medium", "hard"]) {
  const n = COUNTRIES.filter((c) => c.difficulty === tier).length;
  check(n >= ROUND_LENGTH, `"${tier}" tier has enough countries for a full round (${n})`);
}

console.log("Rounds");
for (const mode of ["flag", "capital", "capitalReverse", "shape"]) {
  const round = buildRound(mode);
  check(round.length === 8, `${mode}: default round length is 8`);
  for (const q of round) {
    check(q.options.length === OPTIONS_PER_QUESTION, `${mode}: ${OPTIONS_PER_QUESTION} options`);
    check(new Set(q.options).size === q.options.length, `${mode}: options are unique`);
    check(q.options.includes(q.correct), `${mode}: correct answer is among options`);
    if (mode === "capitalReverse") {
      check(q.correct === q.country.name, "capitalReverse: correct answer is the country name");
      check(q.prompt.includes(q.country.capital), "capitalReverse: prompt names the capital, not the country");
    }
    break; // one representative question per mode keeps output readable
  }
}

console.log("Difficulty");
for (const { key } of DIFFICULTIES) {
  for (const mode of ["flag", "capital", "capitalReverse", "shape"]) {
    const round = buildRound(mode, key);
    check(round.length === ROUND_LENGTH, `${mode}/${key}: round length is ${ROUND_LENGTH}`);
    if (key !== "all") {
      check(
        round.every((q) => q.country.difficulty === key),
        `${mode}/${key}: every question targets a "${key}" country`
      );
    }
  }
}

// Shape questions must only ever target countries that have a map outline.
// Sample many rounds so a stray outline-less pick can't slip through by luck.
let shapeBad = 0;
for (let i = 0; i < 200; i++) {
  for (const q of buildRound("shape")) if (q.country.noOutline) shapeBad++;
}
check(shapeBad === 0, "shape rounds never target a country without an outline");

// The Daily can assign a shape slot to an outline-less country; when it does,
// it must fall back to a non-shape type rather than render a broken outline.
let dailyShapeBad = 0;
for (let day = 1; day <= 28; day++) {
  for (const q of buildDaily(6, new Date(2026, 0, day))) {
    if (q.type === "shape" && q.country.noOutline) dailyShapeBad++;
  }
}
check(dailyShapeBad === 0, "daily never renders a shape for an outline-less country");

console.log("Locator");
check(
  LOCATOR_COUNTRIES.every((c) => COUNTRY_PATHS[c.code]),
  "every locator country has a world-map path"
);
check(LOCATOR_COUNTRIES.length >= ROUND_LENGTH * 4, `locator pool is large enough (${LOCATOR_COUNTRIES.length})`);
const locRound = buildRound("locator");
check(locRound.length === ROUND_LENGTH, `locator: default round length is ${ROUND_LENGTH}`);
for (const q of locRound) {
  check(q.type === "locator", "locator: question type is locator");
  check(q.choices.length === OPTIONS_PER_QUESTION, `locator: ${OPTIONS_PER_QUESTION} candidate choices`);
  check(q.choices.some((c) => c.code === q.correct), "locator: correct code is among the choices");
  check(q.choices.every((c) => COUNTRY_PATHS[c.code]), "locator: every candidate has a map path");
  check(new Set(q.choices.map((c) => c.code)).size === q.choices.length, "locator: candidate codes are unique");
  check(q.prompt.includes(q.country.name), "locator: prompt names the target country");
  break; // one representative question keeps output readable
}
// Every locator target must be drawable — sample many rounds to catch a stray.
let locBad = 0;
for (let i = 0; i < 200; i++) {
  for (const q of buildRound("locator")) if (!COUNTRY_PATHS[q.correct]) locBad++;
}
check(locBad === 0, "locator rounds never target a country without a map path");

console.log("Daily challenge");
const d = new Date(2026, 6, 8);
const a = buildDaily(6, d).map((q) => q.country.code + ":" + q.correct).join("|");
const b = buildDaily(6, d).map((q) => q.country.code + ":" + q.correct).join("|");
check(a === b, "daily challenge is deterministic for a fixed date");
check(buildDaily(6, d).length === 6, "daily has 6 questions");

console.log("Progress");
check(
  applyRoundResult({ xp: 10, streak: 1, bestScore: 5 }, { score: 7, xp: 80 }, "2026-03-01").xp === 90,
  "applyRoundResult accumulates xp"
);
check(
  applyRoundResult({ xp: 0, streak: 0, bestScore: 8 }, { score: 3, xp: 0 }, "2026-03-01").bestScore === 8,
  "applyRoundResult keeps the higher best score"
);
check(
  applyRoundResult({ xp: 0, streak: 0, bestScore: 2 }, { score: 6, xp: 0 }, "2026-03-01").bestScore === 6,
  "applyRoundResult raises best score to a new high"
);
check(
  normalizeProgress(null).xp === 0 && normalizeProgress(undefined).streak === 0,
  "normalizeProgress falls back to defaults for missing data"
);
check(
  normalizeProgress({ xp: -5, streak: "x", bestScore: 3.9 }).bestScore === 3 &&
    normalizeProgress({ xp: -5 }).xp === 0,
  "normalizeProgress coerces bad/negative values"
);
check(
  DEFAULT_PROGRESS.xp === 0 && DEFAULT_PROGRESS.streak === 0 && DEFAULT_PROGRESS.bestScore === 0,
  "DEFAULT_PROGRESS starts at zero"
);
check(
  DEFAULT_PROGRESS.lastPlayedOn === null && DEFAULT_PROGRESS.freezes === 0,
  "DEFAULT_PROGRESS has no last-played day or freezes"
);
// Old { xp, streak, bestScore } saves must migrate cleanly to the new shape.
const migrated = normalizeProgress({ xp: 30, streak: 7, bestScore: 5 });
check(
  migrated.lastPlayedOn === null && migrated.freezes === 0,
  "normalizeProgress migrates old saves (no date/freezes)"
);
check(migrated.longestStreak === 7, "normalizeProgress seeds longestStreak from an old streak");

console.log("Streaks (calendar-aware)");
check(dayKey(new Date(2026, 0, 5)) === "2026-01-05", "dayKey formats a local date as YYYY-MM-DD");

const day1 = applyRoundResult(DEFAULT_PROGRESS, { score: 5, xp: 50 }, "2026-03-01");
check(day1.streak === 1 && day1.lastPlayedOn === "2026-03-01", "first play starts a 1-day streak");

const sameDay = applyRoundResult(day1, { score: 8, xp: 100 }, "2026-03-01");
check(sameDay.streak === 1, "a second round the same day does not bump the streak");
check(sameDay.xp === 150 && sameDay.bestScore === 8, "same-day replay still adds xp + best score");

const day2 = applyRoundResult(day1, { score: 3, xp: 30 }, "2026-03-02");
check(day2.streak === 2, "playing the next calendar day continues the streak");
check(day2.longestStreak === 2, "longestStreak tracks the high-water mark");

const missed = applyRoundResult(day2, { score: 3, xp: 30 }, "2026-03-05");
check(missed.streak === 1, "missing a day with no freeze resets the streak to 1");
check(missed.longestStreak === 2, "a reset preserves the recorded longest streak");

const withFreeze = { ...day2, freezes: 1 };
const bridged = applyRoundResult(withFreeze, { score: 3, xp: 30 }, "2026-03-04"); // skipped Mar 3
check(bridged.streak === 3 && bridged.freezes === 0, "a freeze bridges one missed day and is spent");

// A freeze is earned when the streak reaches its milestone over consecutive days.
let run = DEFAULT_PROGRESS;
let dt = new Date(2026, 4, 1);
for (let i = 0; i < STREAK_FREEZE_EARN_EVERY; i++) {
  run = applyRoundResult(run, { score: 1, xp: 10 }, dayKey(dt));
  dt = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate() + 1);
}
check(run.streak === STREAK_FREEZE_EARN_EVERY, `streak reaches ${STREAK_FREEZE_EARN_EVERY} over consecutive days`);
check(run.freezes === 1, "a freeze is earned at the streak milestone");

check(streakStatus(day1, "2026-03-01").playedToday === true, "streakStatus: played today");
check(streakStatus(day1, "2026-03-02").atRisk === true, "streakStatus: at risk the next day");
const lapsed = streakStatus(day1, "2026-03-10");
check(!lapsed.alive && lapsed.count === 0, "streakStatus: lapsed after too long, count drops to 0");
check(streakStatus(DEFAULT_PROGRESS, "2026-03-01").alive === false, "streakStatus: never played is not alive");

console.log("Settings");
check(DEFAULT_SETTINGS.soundEnabled === true, "DEFAULT_SETTINGS starts with sound on");
check(
  normalizeSettings(null).soundEnabled === true && normalizeSettings(undefined).soundEnabled === true,
  "normalizeSettings falls back to defaults for missing data"
);
check(
  normalizeSettings({ soundEnabled: false }).soundEnabled === false,
  "normalizeSettings preserves a valid boolean"
);
check(
  normalizeSettings({ soundEnabled: "nope" }).soundEnabled === true,
  "normalizeSettings coerces a bad value back to the default"
);

console.log("Why it matters");
check(
  COUNTRIES.every((c) => typeof WHY_IT_MATTERS[c.code] === "string" && WHY_IT_MATTERS[c.code].length > 0),
  "every country has a hand-written 'why it matters' fact"
);
check(
  new Set(Object.values(WHY_IT_MATTERS)).size === Object.values(WHY_IT_MATTERS).length,
  "'why it matters' facts are all unique (no copy-paste duplicates)"
);
check(
  COUNTRIES.every((c) => whyItMatters(c) === WHY_IT_MATTERS[c.code]),
  "whyItMatters() returns the hand-written fact for every known country"
);
check(
  whyItMatters({ code: "zz", name: "Testlandia", region: "Europe" }) === "Testlandia is part of Europe — every place has a story worth knowing.",
  "whyItMatters() falls back gracefully for an unknown code"
);

console.log("Country pages (M2.2)");
const validCodes = new Set(COUNTRIES.map((c) => c.code));
const validModes = new Set(["flag", "capital", "capitalReverse", "shape", "locator"]);
check(getCountryPage("zz") === null, "getCountryPage returns null for an unknown code");

const brazil = getCountryPage("br");
check(brazil.hasFullContent === true, "Brazil (the hero entry) has full content");
check(brazil.name === "Brazil" && brazil.capital === "Brasília", "getCountryPage merges in the base country record");
check(typeof brazil.summary === "string" && brazil.summary.length > 100, "Brazil has a real story, not a one-liner");
check(brazil.population > 0 && brazil.areaKm2 > 0, "Brazil has population and area facts");
check(typeof brazil.lat === "number" && typeof brazil.lng === "number", "Brazil has map coordinates");
check(brazil.neighbors.length > 0, "Brazil lists its neighbors");
check(
  brazil.neighbors.every((code) => validCodes.has(code)),
  "every Brazil neighbor code is a real country in the dataset"
);
check(!brazil.neighbors.includes("br"), "Brazil is not its own neighbor");
check(
  brazil.relatedGameModes.length > 0 && brazil.relatedGameModes.every((m) => validModes.has(m)),
  "Brazil's related game modes are all real, country-targeted modes"
);
check(brazil.facts && typeof brazil.facts.climate === "string", "Brazil has climate/trade/culture facts");

for (const code of Object.keys(COUNTRY_PAGES)) {
  check(validCodes.has(code), `COUNTRY_PAGES key "${code}" is a real country code`);
}

// A country with no hand-authored page must still render something reasonable.
const sparse = getCountryPage("fr");
check(sparse.hasFullContent === false, "an unauthored country reports hasFullContent: false");
check(sparse.summary === whyItMatters(COUNTRIES.find((c) => c.code === "fr")), "an unauthored country falls back to its whyItMatters fact");
check(sparse.population === null && sparse.areaKm2 === null, "an unauthored country has no fabricated facts");
check(Array.isArray(sparse.neighbors) && sparse.neighbors.length === 0, "an unauthored country has an empty neighbor list, not a guess");
check(
  sparse.relatedGameModes.length > 0 && sparse.relatedGameModes.every((m) => validModes.has(m)),
  "an unauthored country still gets sensible default game-mode suggestions"
);

// Step 4 (generalize to all 196): every country in the dataset — not just the
// hand-authored ones — must render a usable page, and the hero must know when
// to fall back (mapsicon has no outline for four codes; see countries.js).
check(
  COUNTRIES.every((c) => getCountryPage(c.code) !== null),
  "getCountryPage resolves every one of the 196 countries, not just authored ones"
);
check(
  COUNTRIES.every((c) => getCountryPage(c.code).noOutline === Boolean(c.noOutline)),
  "getCountryPage reports noOutline in lockstep with the dataset's noOutline flag"
);
const noOutlineCodes = COUNTRIES.filter((c) => c.noOutline).map((c) => c.code);
check(noOutlineCodes.length > 0, "the dataset has at least one noOutline country to guard against");
check(
  noOutlineCodes.every((code) => getCountryPage(code).noOutline === true),
  "every noOutline country's page flags noOutline so the hero can fall back cleanly"
);

console.log("Country index (M2.2 step 5b)");
check(
  searchCountries(COUNTRIES).length === COUNTRIES.length,
  "no query/region returns every country"
);
check(
  searchCountries(COUNTRIES)[0].name < searchCountries(COUNTRIES)[1].name,
  "results sort alphabetically by name"
);
check(
  searchCountries(COUNTRIES, { region: "Oceania" }).every((c) => c.region === "Oceania"),
  "a region filter returns only countries in that region"
);
check(
  searchCountries(COUNTRIES, { region: "Oceania" }).length < COUNTRIES.length,
  "a region filter narrows the full list"
);
check(
  searchCountries(COUNTRIES, { query: "brazil" }).length === 1 &&
    searchCountries(COUNTRIES, { query: "brazil" })[0].code === "br",
  "a name query matches case-insensitively and by substring"
);
check(
  searchCountries(COUNTRIES, { query: "PARIS" })[0]?.code === "fr",
  "a query also matches by capital, case-insensitively"
);
check(
  searchCountries(COUNTRIES, { query: "zzzznotacountry" }).length === 0,
  "a query with no matches returns an empty list, not a fallback"
);
check(
  searchCountries(COUNTRIES, { query: "  BRAZIL  " }).length === 1,
  "surrounding whitespace in the query is trimmed"
);
check(
  searchCountries(COUNTRIES, { query: "san", region: "Europe" })
    .every((c) => c.region === "Europe" && (c.name.toLowerCase().includes("san") || c.capital.toLowerCase().includes("san"))),
  "query and region filters combine (both must match)"
);
check(
  REGIONS[0] === "All" && new Set(REGIONS.slice(1)).size === new Set(COUNTRIES.map((c) => c.region)).size,
  "REGIONS covers 'All' plus every distinct region in the dataset, once each"
);

console.log("Design tokens / a11y (brand kit v1.1)");
// The kit's ACCESSIBILITY CONTRACT, encoded: "Body text >= 4.5:1; large text
// and UI >= 3:1. Sand is never a text colour on light."
//
// The palette inverted at the redesign — off-white page, white cards, ink type,
// navy as authority — so these checks changed direction with it. What used to
// be guarded was "an accent is bright enough to carry text on a dark base, and
// dark enough to take navyDeep on top". Now it's "type is dark enough for
// paper, and a fill is dark enough for white type on top".

// Body copy on both surface levels. `text` is the only body colour.
for (const bg of ["surface", "surfaceRaised", "surfaceSunken"]) {
  check(
    contrastRatio(colors.text, colors[bg]) >= CONTRAST.body,
    `body text on ${bg} meets the kit's 4.5:1`
  );
}

// textMuted is deliberately NOT body copy. It clears 4.5:1 on white cards but
// lands at 4.40:1 on the off-white page — a genuine near-miss in the kit's own
// palette. Pinning both numbers here keeps that a recorded decision: muted is
// for labels, captions and metadata, which the contract scores as UI at 3:1.
check(
  contrastRatio(colors.textMuted, colors.surfaceRaised) >= CONTRAST.body,
  "muted text clears body contrast on white cards"
);
check(
  contrastRatio(colors.textMuted, colors.surface) >= CONTRAST.large,
  "muted text clears UI contrast on the off-white page (it is not body copy)"
);
check(
  contrastRatio(colors.textMuted, colors.surface) < CONTRAST.body,
  "...and does NOT clear body contrast there — the reason it's labels-only"
);

// Accents used AS TEXT on light. Teal is the one safe for body size; earth is
// large-text/UI only, exactly as the kit states.
check(
  contrastRatio(colors.accent, colors.surfaceRaised) >= CONTRAST.body,
  "teal is safe for body-size text on white"
);
check(
  contrastRatio(colors.accent, colors.surface) >= CONTRAST.body,
  "teal is safe for body-size text on the page"
);
for (const bg of ["surface", "surfaceRaised"]) {
  check(
    contrastRatio(colors.earth, colors[bg]) >= CONTRAST.large,
    `earth clears UI/large-text contrast on ${bg}`
  );
  check(
    contrastRatio(colors.brand, colors[bg]) >= CONTRAST.body,
    `navy headings clear body contrast on ${bg}`
  );
}

// "Sand is never a text colour on light." Asserted as a prohibition, not an
// omission — if someone re-tints sand upward one day, this says why they can't.
for (const bg of ["surface", "surfaceRaised"]) {
  check(
    contrastRatio(colors.sand, colors[bg]) < CONTRAST.large,
    `sand fails even UI contrast on ${bg} — decorative only, never type`
  );
}

// Fills carrying a label. Every brand fill takes white EXCEPT sand, which takes
// ink; theme.onFill() is the single place that rule lives, so drive the check
// through it rather than restating it.
for (const name of ["brand", "brandDeep", "accent", "earth", "danger", "sand"]) {
  const fill = colors[name];
  check(
    contrastRatio(onFill(fill), fill) >= CONTRAST.body,
    `a ${name} fill carries its label at 4.5:1 (onFill picks the right one)`
  );
}
check(onFill(colors.sand) === colors.text, "sand is the one fill that takes ink, not white");
check(onFill(colors.brand) === colors.onFill, "navy fills take white");

// Every game-mode accent doubles as a tile/button fill carrying a label.
for (const [mode, fill] of Object.entries(modeAccents)) {
  check(
    contrastRatio(onFill(fill), fill) >= CONTRAST.body,
    `the ${mode} accent carries its label at 4.5:1`
  );
}

// Success/danger as status text on light. The kit scores these as UI ("pair
// with an icon, never colour alone"), so 3:1 is the bar, and success genuinely
// does not reach body contrast — worth pinning so nobody sets a paragraph in it.
for (const bg of ["surface", "surfaceRaised"]) {
  check(
    contrastRatio(colors.success, colors[bg]) >= CONTRAST.large,
    `success status text clears UI contrast on ${bg}`
  );
  check(
    contrastRatio(colors.danger, colors[bg]) >= CONTRAST.body,
    `danger status text clears body contrast on ${bg}`
  );
}
check(
  contrastRatio(colors.success, colors.successSurface) >= CONTRAST.large,
  "success text on its own tint clears UI contrast"
);
check(
  contrastRatio(colors.danger, colors.dangerSurface) >= CONTRAST.body,
  "danger text on its own tint clears body contrast"
);

// The map is the one surface that stayed dark, so its type is checked against
// the ocean rather than against paper.
check(
  contrastRatio(map.onMap, map.ocean) >= CONTRAST.body,
  "map labels clear body contrast on the ocean fill"
);
check(
  contrastRatio(map.label, map.ocean) >= CONTRAST.large,
  "sand map labels clear UI contrast on the ocean — sand is legible on navy, just not on paper"
);

console.log("Cloud sync (M2.1)");
const fullProgress = {
  xp: 120,
  streak: 3,
  longestStreak: 9,
  bestScore: 7,
  lastPlayedOn: "2026-03-02",
  freezes: 1,
};
const statsRow = statsRowFromProgress("user-1", fullProgress);
check(
  statsRow.user_id === "user-1" &&
    statsRow.xp === 120 &&
    statsRow.current_streak === 3 &&
    statsRow.longest_streak === 9 &&
    statsRow.best_score === 7 &&
    statsRow.freezes === 1 &&
    statsRow.last_played_on === "2026-03-02",
  "statsRowFromProgress maps local progress onto the user_stats columns"
);
check(
  JSON.stringify(progressFromStatsRow(statsRow)) === JSON.stringify(fullProgress),
  "progress → user_stats row → progress round-trips unchanged"
);
check(progressFromStatsRow(null) === null, "progressFromStatsRow returns null for a missing row");

const dailyRow = resultRowFromRound(
  "user-1",
  { mode: "daily", score: 5, total: 6, xp: 50 },
  "2026-03-02"
);
check(dailyRow.daily_date === "2026-03-02", "resultRowFromRound stamps daily_date on a daily round");
check(
  dailyRow.xp_awarded === 50 && dailyRow.difficulty === "all" && dailyRow.timed === false,
  "resultRowFromRound defaults difficulty/timed and maps xp to xp_awarded"
);
check(
  resultRowFromRound("user-1", { mode: "flag", score: 8, total: 8, xp: 100 }, "2026-03-02")
    .daily_date === null,
  "resultRowFromRound leaves daily_date null for non-daily modes"
);

// The merge must never cost a returning player progress they already earned.
const localSide = { xp: 100, streak: 2, longestStreak: 4, bestScore: 8, lastPlayedOn: "2026-03-01", freezes: 0 };
const cloudSide = { xp: 250, streak: 5, longestStreak: 3, bestScore: 6, lastPlayedOn: "2026-03-04", freezes: 1 };
const merged = mergeProgress(localSide, cloudSide);
check(merged.xp === 250 && merged.bestScore === 8, "mergeProgress takes the max of each side's totals");
check(merged.streak === 5 && merged.freezes === 1, "mergeProgress keeps the higher streak and freezes");
// Each side is normalized first, so the cloud's longestStreak of 3 is lifted to
// its live streak of 5 before the merge — a longest streak can never sit below
// the current one, on either side of the sync.
check(merged.longestStreak === 5, "mergeProgress never reports a longest streak below the current streak");
check(merged.lastPlayedOn === "2026-03-04", "mergeProgress keeps the later last-played day");
check(
  JSON.stringify(mergeProgress(localSide, null)) === JSON.stringify(localSide),
  "mergeProgress with no cloud row keeps local progress as-is"
);
check(
  mergeProgress(DEFAULT_PROGRESS, cloudSide).xp === 250 &&
    mergeProgress(DEFAULT_PROGRESS, cloudSide).lastPlayedOn === "2026-03-04",
  "a fresh device adopts the cloud totals rather than zeroing them"
);
check(
  mergeProgress(null, null).xp === 0 && mergeProgress(null, null).lastPlayedOn === null,
  "mergeProgress falls back to defaults when both sides are missing"
);

console.log("Sync policy (M2.1)");
check(
  roundSinks({ id: "user-1" }).cloud === true && roundSinks({ id: "user-1" }).local === true,
  "a signed-in round is written to both local cache and cloud"
);
check(
  roundSinks(null).cloud === false && roundSinks(null).local === true,
  "a signed-out round is written local-only"
);
// A user object without an id can't own a row — RLS would reject the insert.
check(roundSinks({}).cloud === false, "a user with no id is not treated as signed in");
check(
  shouldMigrate({ user: { id: "user-1" }, migrated: false }) === true,
  "the local→cloud merge runs on a first sign-in"
);
check(
  shouldMigrate({ user: { id: "user-1" }, migrated: true }) === false,
  "the merge does not run again once the device is flagged as migrated"
);
check(
  shouldMigrate({ user: null, migrated: false }) === false,
  "the merge never runs while signed out"
);

console.log("Auth redirect (M2.1)");
check(
  pickRedirectUrl({ platform: "web", origin: "https://worldwise.vercel.app", nativeUrl: "worldwise://auth/callback" }) ===
    "https://worldwise.vercel.app",
  "web redirects back to its own origin, ignoring the native deep link"
);
check(
  pickRedirectUrl({ platform: "web", origin: "http://localhost:8081", nativeUrl: null }) === "http://localhost:8081",
  "web uses the dev origin, so one build works locally and on Vercel"
);
check(
  pickRedirectUrl({ platform: "ios", origin: null, nativeUrl: "worldwise://auth/callback" }) ===
    "worldwise://auth/callback",
  "native redirects to the app's deep link"
);
check(
  pickRedirectUrl({ platform: "android", origin: "https://ignored.example", nativeUrl: "exp://127.0.0.1:8081/--/auth/callback" }) ===
    "exp://127.0.0.1:8081/--/auth/callback",
  "native prefers its deep link even if a window origin somehow exists"
);
// Returning null lets Supabase fall back to its configured Site URL, which beats
// sending it a redirect built from a missing origin.
check(
  pickRedirectUrl({ platform: "web", origin: null, nativeUrl: null }) === null,
  "web with no origin yields no redirect rather than a malformed one"
);
check(
  pickRedirectUrl({ platform: "ios", origin: null, nativeUrl: null }) === null,
  "native with no deep link yields no redirect"
);

console.log("World Map zoom (M2.3 step 2a)");
check(clampScale(0.2, 1, 4) === 1, "clampScale floors below the minimum");
check(clampScale(9, 1, 4) === 4, "clampScale ceilings above the maximum");
check(clampScale(2.5, 1, 4) === 2.5, "clampScale leaves an in-range value alone");
check(
  touchDistance({ pageX: 0, pageY: 0 }, { pageX: 3, pageY: 4 }) === 5,
  "touchDistance is the straight-line distance between two touches (3-4-5 triangle)"
);
check(
  pinchScale(10, 20, 1, 1, 4) === 2,
  "pinchScale doubles when the touches move twice as far apart"
);
check(
  pinchScale(10, 5, 2, 1, 4) === 1,
  "pinchScale halves when the touches move together, clamped at the minimum"
);
check(
  pinchScale(0, 20, 1, 1, 4) === 1,
  "pinchScale ignores a degenerate zero start-distance instead of dividing by zero"
);
check(
  wheelZoom(1, -100, 0.01, 1, 4) === 2,
  "wheelZoom zooms in (scrolling up) by deltaY * speed"
);
check(
  wheelZoom(2, 500, 0.01, 1, 4) === 1,
  "wheelZoom zooms back out (scrolling down), clamped at the minimum"
);
check(
  wheelZoom(1, -10000, 0.01, 1, 4) === 4,
  "wheelZoom clamps at the maximum however far the wheel scrolls"
);

console.log("World Map pan (M2.3 step 2b)");
check(
  JSON.stringify(dragPan({ x: 0, y: 0 }, 10, 20, 1)) === JSON.stringify({ x: 10, y: 20 }),
  "dragPan tracks the drag 1:1 at 1x zoom"
);
check(
  JSON.stringify(dragPan({ x: 0, y: 0 }, 10, 20, 2)) === JSON.stringify({ x: 5, y: 10 }),
  "dragPan halves screen distance into local units at 2x zoom"
);
check(
  JSON.stringify(dragPan({ x: 5, y: -3 }, 10, 0, 1)) === JSON.stringify({ x: 15, y: -3 }),
  "dragPan adds the drag on top of the pan already in effect"
);

console.log("World Map pan bounds & reset (M2.3 step 2c)");
check(
  JSON.stringify(clampPan({ x: 50, y: 50 }, 1, 300, 200)) === JSON.stringify({ x: 0, y: 0 }),
  "clampPan forces the pan back to the origin at 1x zoom (nothing to pan into a fully-fit view)"
);
check(
  JSON.stringify(clampPan({ x: 5, y: -5 }, 1, 0, 0)) === JSON.stringify({ x: 0, y: 0 }),
  "clampPan zeroes the pan before the box has been measured (width/height of 0)"
);
{
  // At 2x zoom in a 300x200 box, the overflow on each side is
  // 300*(2-1)/2 = 150px and 200*(2-1)/2 = 100px, and the render applies pan
  // *before* scale, so the largest allowed pan is overflow / scale.
  const clamped = clampPan({ x: 1000, y: -1000 }, 2, 300, 200);
  check(clamped.x === 75, "clampPan caps an oversized rightward pan at overflow/scale (150/2)");
  check(clamped.y === -50, "clampPan caps an oversized upward pan at -overflow/scale (-100/2)");
}
check(
  JSON.stringify(clampPan({ x: 10, y: -10 }, 2, 300, 200)) === JSON.stringify({ x: 10, y: -10 }),
  "clampPan leaves an in-bounds pan untouched"
);

console.log("World Map region-jump animation (M2.3 step 5.3)");
{
  const start = { scale: 1, pan: { x: 0, y: 0 } };
  const target = { scale: 3, pan: { x: 20, y: -10 } };
  check(
    JSON.stringify(lerpView(start, target, 0)) === JSON.stringify(start),
    "lerpView at t=0 returns the start view unchanged"
  );
  check(
    JSON.stringify(lerpView(start, target, 1)) === JSON.stringify(target),
    "lerpView at t=1 returns the target view exactly"
  );
  const mid = lerpView(start, target, 0.5);
  check(mid.scale === 2 && mid.pan.x === 10 && mid.pan.y === -5, "lerpView at t=0.5 splits the difference");
}

console.log("World Map small-country hit targets (M2.3 step 3.2)");
{
  const square = pathBounds("M10 10L20 10L20 20L10 20Z");
  check(square.minX === 10 && square.maxX === 20, "pathBounds finds the x extent of a simple ring");
  check(square.minY === 10 && square.maxY === 20, "pathBounds finds the y extent of a simple ring");
  check(square.cx === 15 && square.cy === 15, "pathBounds centers on the bounding box, not the vertices");
}
{
  // A second, far-off subpath (M2.3's paths can have several rings) must
  // still be folded into one bounding box spanning both.
  const twoRings = pathBounds("M0 0L2 0L2 2L0 2ZM100 100L104 100L104 104L100 104Z");
  check(twoRings.minX === 0 && twoRings.maxX === 104, "pathBounds spans multiple subpaths on x");
  check(twoRings.minY === 0 && twoRings.maxY === 104, "pathBounds spans multiple subpaths on y");
}
{
  const targets = smallCountryHitTargets(
    { tiny: "M0 0L4 0L4 4L0 4Z", huge: "M0 0L100 0L100 50L0 50Z" },
    6,
    5
  );
  check(Object.keys(targets).length === 1 && targets.tiny, "only the bounding-box-under-threshold country gets a hit target");
  check(targets.tiny.r === 5, "the hit target uses the configured radius, not the shape's own size");
  check(targets.tiny.cx === 2 && targets.tiny.cy === 2, "the hit target is centered on the small country's own bounding box");
}
{
  // Sanity-check the real dataset with the shipped constants: Luxembourg is
  // the smallest bounding box in COUNTRY_PATHS and must qualify, while a
  // country the size of France (a several-hundred-unit bounding box) must not.
  const targets = smallCountryHitTargets(COUNTRY_PATHS, MAP_SMALL_COUNTRY_MAX_SIZE, MAP_SMALL_HIT_RADIUS);
  check(!!targets.lu, "Luxembourg (one of the smallest real shapes) gets an enlarged hit target");
  check(!targets.fr, "France (a large real shape) is left to its own outline");
}

console.log("World Map tap label (M2.3 step 3.3)");
{
  const centroids = countryCentroids({ box: "M0 0L10 0L10 20L0 20Z" });
  check(
    centroids.box.cx === 5 && centroids.box.cy === 10,
    "countryCentroids centers on each country's own bounding box"
  );
}
{
  // Every real country in COUNTRY_PATHS must resolve a centroid — the label
  // has nothing to fall back to if one is missing.
  const centroids = countryCentroids(COUNTRY_PATHS);
  check(
    Object.keys(COUNTRY_PATHS).every((code) => Number.isFinite(centroids[code].cx) && Number.isFinite(centroids[code].cy)),
    "every country in the real dataset gets a finite centroid"
  );
}
check(countryName("br") === "Brazil", "countryName resolves a known code to its display name");
check(countryName("zz") === "ZZ", "countryName falls back to the uppercased code for an unknown one");

console.log("World Map region presets (M2.3 step 5.1)");
{
  const paths = {
    a: "M0 0L10 0L10 10L0 10Z", // bounding box 0,0 - 10,10
    b: "M20 5L30 5L30 15L20 15Z", // bounding box 20,5 - 30,15
  };
  check(
    JSON.stringify(regionBounds(paths, ["a", "b"])) === JSON.stringify({ minX: 0, minY: 0, maxX: 30, maxY: 15 }),
    "regionBounds unions every listed country's own bounding box"
  );
  check(regionBounds(paths, ["missing"]) === null, "regionBounds returns null when none of the codes have path data");
  check(
    JSON.stringify(regionBounds(paths, ["a", "missing"])) === JSON.stringify({ minX: 0, minY: 0, maxX: 10, maxY: 10 }),
    "regionBounds skips codes with no path data instead of failing the whole region"
  );

  // A shape that straddles the antimeridian (e.g. Russia's real Natural
  // Earth path) reads as spanning nearly the whole map — regionBounds should
  // treat it like missing data rather than let it swamp the region's real
  // framing.
  const wrapping = { ...paths, wide: "M0 0L700 0L700 10L0 10Z" }; // 700-wide box
  check(
    JSON.stringify(regionBounds(wrapping, ["a", "wide"])) === JSON.stringify({ minX: 0, minY: 0, maxX: 10, maxY: 10 }),
    "regionBounds excludes an antimeridian-wrapping country's inflated bounding box"
  );
  check(
    regionBounds(wrapping, ["wide"]) === null,
    "regionBounds returns null when the only member's box is an antimeridian-wrapping outlier"
  );
  const realEuropeBounds = regionBounds(
    COUNTRY_PATHS,
    COUNTRIES.filter((c) => c.region === "Europe").map((c) => c.code)
  );
  check(
    realEuropeBounds.maxX - realEuropeBounds.minX < 400,
    "Europe's real region bounds stay well short of the full map width despite including Russia"
  );
}
{
  const view = { x: 0, y: 0, width: 100, height: 100 };
  check(
    JSON.stringify(regionView(null, view, { width: 200, height: 200 }, 1, 4)) ===
      JSON.stringify({ scale: 1, pan: { x: 0, y: 0 } }),
    "regionView falls back to the full unzoomed view when there are no bounds"
  );
  check(
    JSON.stringify(regionView({ minX: 0, minY: 0, maxX: 10, maxY: 10 }, view, { width: 0, height: 0 }, 1, 4)) ===
      JSON.stringify({ scale: 1, pan: { x: 0, y: 0 } }),
    "regionView falls back to the full unzoomed view before the box has been measured"
  );
}
{
  // Box matches the viewBox exactly (boxScale 1), so a 10x10 region at the
  // viewBox's own center (45..55) should just need scale to fill 100/10 —
  // clamped to the max — with pan landing back at the origin once clamped,
  // since a fully-centered region has nothing left to pan.
  const view = { x: 0, y: 0, width: 100, height: 100 };
  const box = { width: 100, height: 100 };
  const { scale, pan } = regionView({ minX: 45, minY: 45, maxX: 55, maxY: 55 }, view, box, 1, 4, 1);
  check(scale === 4, "regionView clamps the fit scale to the configured max");
  check(pan.x === 0 && pan.y === 0, "regionView pans a viewBox-centered region back to the origin");
}
{
  // An off-center region (near the left edge) should pull the pan positive
  // (shifting content right) so it's centered in the box once zoomed.
  const view = { x: 0, y: 0, width: 100, height: 100 };
  const box = { width: 100, height: 100 };
  const { pan } = regionView({ minX: 0, minY: 40, maxX: 20, maxY: 60 }, view, box, 1, 2, 1);
  check(pan.x > 0, "regionView pans a left-of-center region rightward to bring it into view");
}
check(
  MAP_REGIONS.every((r) => COUNTRIES.some((c) => c.region === r)),
  "every declared map region matches at least one country's own region field"
);
check(
  MAP_REGIONS.every((r) => REGIONS.includes(r)),
  "every declared map region is also one of countryIndex's REGIONS filters"
);

console.log("Content row mapping (M2.3.5)");
const brRow = countryRowFromPage(getCountryPage("br"), "easy");
check(brRow.code === "br" && brRow.name === "Brazil", "countryRowFromPage carries code and name");
check(brRow.area_km2 === 8_515_767, "countryRowFromPage renames areaKm2 to area_km2");
check(
  Array.isArray(brRow.related_game_modes) && brRow.related_game_modes.includes("locator"),
  "countryRowFromPage renames relatedGameModes to related_game_modes"
);
check(brRow.difficulty === "easy", "countryRowFromPage takes difficulty from the base record");
check(brRow.has_outline === true, "has_outline is true for a country with an outline");
const psRow = countryRowFromPage(getCountryPage("ps"), "hard");
check(psRow.has_outline === false, "has_outline is the negation of the bundled noOutline flag");
check(
  pageFromCountryRow(psRow).noOutline === true,
  "noOutline survives the round trip through has_outline"
);

// The seed writes these rows and the app reads them back; any field that drifts
// in between is a section that silently disappears from a country page.
const driftedFields = new Set();
for (const c of COUNTRIES) {
  const original = getCountryPage(c.code);
  const back = pageFromCountryRow(countryRowFromPage(original, c.difficulty));
  for (const key of Object.keys(original)) {
    if (JSON.stringify(original[key]) !== JSON.stringify(back[key])) driftedFields.add(key);
  }
}
check(
  driftedFields.size === 0,
  `every bundled country round-trips page->row->page unchanged${
    driftedFields.size ? ` (drifted: ${[...driftedFields].join(", ")})` : ""
  }`
);

check(pageFromCountryRow(null) === null, "pageFromCountryRow returns null for a missing row");
check(pageFromCountryRow({ name: "No code" }) === null, "pageFromCountryRow rejects a row with no code");
// PostgREST can serialize numeric/bigint as a string; the UI does arithmetic on
// these, so a string would render as "8515767" instead of "8.5M".
const stringy = pageFromCountryRow({ code: "zz", name: "Z", population: "1000000", area_km2: "2500.5" });
check(stringy.population === 1_000_000, "a string population is coerced to a number");
check(stringy.areaKm2 === 2500.5, "a string area_km2 is coerced to a number");
check(
  pageFromCountryRow({ code: "zz", name: "Z", population: "not-a-number" }).population === null,
  "an unparseable number becomes null rather than NaN"
);
check(
  pageFromCountryRow({ code: "zz", name: "Z", facts: {} }).facts === null,
  "an empty facts object reads back as null, matching the bundled shape"
);
check(
  pageFromCountryRow({ code: "zz", name: "Z", related_game_modes: [] }).relatedGameModes.length === 4,
  "a row with no related modes falls back to the default set"
);
check(
  pageFromCountryRow({ code: "zz", name: "Z" }).hasFullContent === false,
  "a bare row reports hasFullContent: false"
);
check(
  pageFromCountryRow(brRow).hasFullContent === true,
  "an authored row (population/area/facts) reports hasFullContent: true"
);
check(
  pageFromCountryRow({ code: "zz", name: "Z" }).noOutline === false,
  "a row with no has_outline value is treated as having an outline"
);

console.log("Content cache policy (M2.3.5)");
check(contentCacheKey("br") === "worldwise.content.country.br.v1", "cache key is versioned per country");
check(parseCacheEntry(null) === null, "parseCacheEntry returns null for a missing entry");
check(parseCacheEntry("{not json") === null, "parseCacheEntry survives corrupt JSON");
check(parseCacheEntry('{"version":1}') === null, "parseCacheEntry rejects an entry with no page");
check(
  parseCacheEntry('{"version":3,"page":{"code":"br"}}')?.version === 3,
  "parseCacheEntry reads a well-formed entry"
);
check(
  parseCacheEntry({ version: 3, page: { code: "br" } })?.page.code === "br",
  "parseCacheEntry accepts an already-parsed object"
);

const entryV3 = cacheEntry({ code: "br", name: "Brazil" }, 3);
check(isCacheFresh(entryV3, 3) === true, "a cache entry matching the content version is fresh");
check(isCacheFresh(entryV3, 4) === false, "a bumped content version makes the entry stale");
check(isCacheFresh(null, 3) === false, "a missing entry is never fresh");
// Offline is the case this whole layer exists for: unknown version means the
// server was unreachable, and stale content beats a blank page.
check(isCacheFresh(entryV3, null) === true, "an unreachable version treats the cache as fresh");

// resolveCountryContent is async, and this file transpiles to CJS (no top-level
// await), so its checks live in a function that the tail awaits before the
// summary. Fakes stand in for AsyncStorage and Supabase, so the decision tree is
// exercised without any network or React Native import.
async function contentResolverChecks() {
  console.log("Content resolver (M2.3.5)");

  let fetchCount = 0;
  const freshCacheResult = await resolveCountryContent("br", {
    getCached: async () => cacheEntry({ code: "br", name: "Cached Brazil" }, 7),
    setCached: async () => {},
    getVersion: async () => 7,
    fetchRow: async () => {
      fetchCount++;
      return { code: "br", name: "Remote Brazil" };
    },
    bundled: async () => null,
  });
  check(freshCacheResult.source === "cache", "a fresh cache entry is served from cache");
  check(freshCacheResult.page.name === "Cached Brazil", "the cached page is the one returned");
  check(fetchCount === 0, "a fresh cache entry skips the network entirely");

  let written = null;
  const staleResult = await resolveCountryContent("br", {
    getCached: async () => cacheEntry({ code: "br", name: "Old Brazil" }, 6),
    setCached: async (code, entry) => {
      written = { code, entry };
    },
    getVersion: async () => 7,
    fetchRow: async () => ({ code: "br", name: "New Brazil", population: 216_422_446 }),
    bundled: async () => null,
  });
  check(staleResult.source === "remote", "a bumped version refetches from the content API");
  check(staleResult.page.name === "New Brazil", "the refetched page replaces the stale one");
  check(written?.entry.version === 7, "the refetched page is cached under the new version");

  const staleFallback = await resolveCountryContent("br", {
    getCached: async () => cacheEntry({ code: "br", name: "Old Brazil" }, 6),
    setCached: async () => {},
    getVersion: async () => 7,
    fetchRow: async () => null,
    bundled: async () => ({ code: "br", name: "Bundled Brazil" }),
  });
  check(staleFallback.source === "stale-cache", "a failed refetch falls back to the stale cache");
  check(
    staleFallback.page.name === "Old Brazil",
    "stale cached content outranks the bundled baseline, being likelier to be richer"
  );

  const bundledFallback = await resolveCountryContent("br", {
    getCached: async () => null,
    setCached: async () => {},
    getVersion: async () => 7,
    fetchRow: async () => null,
    bundled: async () => ({ code: "br", name: "Bundled Brazil" }),
  });
  check(bundledFallback.source === "bundled", "no cache and no network falls back to bundled JSON");

  const nothing = await resolveCountryContent("zz", {
    getCached: async () => null,
    setCached: async () => {},
    getVersion: async () => 7,
    fetchRow: async () => null,
    bundled: async () => null,
  });
  check(nothing.source === "none" && nothing.page === null, "an unknown country resolves to no page");

  // Nothing in this layer may throw — content failing to load must degrade the
  // page, never break it.
  const allThrowing = await resolveCountryContent("br", {
    getCached: async () => {
      throw new Error("storage unavailable");
    },
    setCached: async () => {
      throw new Error("storage unavailable");
    },
    getVersion: async () => {
      throw new Error("offline");
    },
    fetchRow: async () => {
      throw new Error("offline");
    },
    bundled: async () => ({ code: "br", name: "Bundled Brazil" }),
  });
  check(
    allThrowing.source === "bundled" && allThrowing.page.name === "Bundled Brazil",
    "every dependency throwing still resolves to the bundled baseline"
  );

  const offlineWithCache = await resolveCountryContent("br", {
    getCached: async () => cacheEntry({ code: "br", name: "Cached Brazil" }, 6),
    setCached: async () => {},
    getVersion: async () => {
      throw new Error("offline");
    },
    fetchRow: async () => null,
    bundled: async () => ({ code: "br", name: "Bundled Brazil" }),
  });
  check(
    offlineWithCache.source === "cache",
    "offline with any cached entry serves the cache without a doomed fetch"
  );

  // A cache write that fails must not cost the caller the page it already has.
  const setFails = await resolveCountryContent("br", {
    getCached: async () => null,
    setCached: async () => {
      throw new Error("quota exceeded");
    },
    getVersion: async () => 7,
    fetchRow: async () => ({ code: "br", name: "Remote Brazil" }),
    bundled: async () => null,
  });
  check(
    setFails.source === "remote" && setFails.page.name === "Remote Brazil",
    "a failed cache write still returns the freshly fetched page"
  );
}

console.log("Layout + motion tokens");
check(
  layout.maxActionWidth <= layout.maxContentWidth && layout.maxContentWidth <= layout.maxMediaWidth,
  "the width caps nest: action <= content <= media"
);
// A phone must never hit a cap, or the app stops being full-bleed on mobile.
// What a cap actually competes with is the *content* width — the viewport minus
// the screen's horizontal gutters — not the raw viewport. Widest common phone is
// ~430pt (iPhone Pro Max), and screens pad by spacing(2.5) each side.
const WIDEST_PHONE_CONTENT = 430 - spacing(2.5) * 2;
check(
  layout.maxActionWidth >= WIDEST_PHONE_CONTENT,
  `the narrowest cap (${layout.maxActionWidth}) clears the widest phone's content width (${WIDEST_PHONE_CONTENT}), so mobile stays full-bleed`
);
check(
  ["content", "media", "action"].every(
    (k) => constrain[k].alignSelf === "center" && constrain[k].width === "100%"
  ),
  "every constrain style centers itself and fills the available width"
);
check(
  ["content", "media", "action"].every((k) => constrain[k].maxWidth === layout[maxKey(k)]),
  "each constrain style uses its matching layout token, not a copied number"
);
function maxKey(k) {
  return `max${k[0].toUpperCase()}${k.slice(1)}Width`;
}

check(
  Object.values(motion.duration).every((d) => d >= 120 && d <= 600),
  "every duration sits in the kit's 120ms micro - 600ms map fly-to band"
);
check(motion.rise >= 4 && motion.rise <= 16, "the entrance rise stays in the 4-16px band");
check(
  motion.duration.micro === 120 &&
    motion.duration.ui === 200 &&
    motion.duration.sheet === 320 &&
    motion.duration.mapFly === 600,
  "the four durations are the kit's exact figures"
);
check(
  motion.stagger * motion.maxStaggerSteps <= 320,
  "a full cascade finishes within one slow-duration window, so groups read as one gesture"
);
// theme.js is imported by this suite in plain Node. An RN Easing object here
// would mean a `react-native` import in theme.js and take the whole suite down.
check(
  Array.isArray(motion.easing) && motion.easing.length === 4,
  "easing is stored as bezier control points, keeping theme.js free of RN imports"
);
check(
  motion.easing.every((n) => typeof n === "number") && motion.easing[3] <= 1,
  "the easing curve decelerates without overshooting (no bounce)"
);

console.log("Globe projection (M2.3.7)");
const near = (a, b, eps = 1e-6) => Math.abs(a - b) < eps;
const unit = ([x, y, z]) => near(Math.hypot(x, y, z), 1, 1e-9);

check(unit(lngLatToVec(0, 0)) && unit(lngLatToVec(140, -71)), "lng/lat always maps to a unit vector");
check(
  near(lngLatToVec(0, 0)[0], 1) && near(lngLatToVec(0, 90)[2], 1),
  "0°N 0°E points down +x and the north pole points up +z"
);
{
  const [lng, lat] = vecToLngLat(lngLatToVec(-73.9, 40.7));
  check(near(lng, -73.9, 1e-9) && near(lat, 40.7, 1e-9), "vecToLngLat inverts lngLatToVec exactly");
}
{
  // The point you're looking at lands dead center of the disc, and its
  // antipode is behind the globe. These two together are the whole projection.
  const o = orientation(30, 45);
  const front = rotate(lngLatToVec(30, 45), o);
  const back = rotate(lngLatToVec(-150, -45), o);
  check(near(front[0], 0) && near(front[1], 0) && near(front[2], 1), "the view center projects to the middle of the disc");
  check(isVisible(front[2]) && !isVisible(back[2]), "the near face is visible and its antipode is not");
  // A point exactly 90° out lands on the limb. Asserting which SIDE of the
  // horizon it falls on would be asserting float noise — the dot product there
  // is ±1e-17 — so the stable invariant is where it draws, plus the pure
  // boundary rule that z of exactly 0 is hidden.
  const grazing = toScreen(rotate(lngLatToVec(120, 0), o), { cx: 200, cy: 200, radius: 190 });
  check(near(Math.hypot(grazing[0] - 200, grazing[1] - 200), 190, 1e-9), "a point 90° away projects exactly onto the limb");
  check(!isVisible(0), "a point sitting exactly on the horizon counts as hidden");
}
check(
  toScreen([0, 0], { cx: 200, cy: 200, radius: 190 })[1] === 200 &&
    toScreen([0, 1], { cx: 200, cy: 200, radius: 190 })[1] === 10,
  "screen y is flipped, so view-space up draws upward in SVG"
);

{
  const view = { cx: 200, cy: 200, radius: 190 };
  const ring = (pts) => {
    const out = new Float64Array(pts.length * 3);
    pts.forEach(([lng, lat], i) => {
      const v = lngLatToVec(lng, lat);
      out[i * 3] = v[0];
      out[i * 3 + 1] = v[1];
      out[i * 3 + 2] = v[2];
    });
    return out;
  };
  const facing = ring([[-5, -5], [5, -5], [5, 5], [-5, 5]]);
  const behind = ring([[175, -5], [-175, -5], [-175, 5], [175, 5]]);
  const straddling = ring([[80, -10], [110, -10], [110, 10], [80, 10]]);
  const o = orientation(0, 0);

  check(projectRing(facing, o, view)?.length === 4, "a ring fully facing the viewer projects every point");
  check(projectRing(behind, o, view) === null, "a ring on the far side projects to nothing at all");
  check(projectRing(ring([[0, 0], [1, 0]]), o, view) === null, "a degenerate ring of two points is dropped");
  const clipped = projectRing(straddling, o, view);
  check(clipped !== null && clipped.length > 4, "a ring crossing the horizon gains limb points rather than being dropped");
  check(
    clipped.every(([x, y]) => Math.hypot(x - view.cx, y - view.cy) <= view.radius + 1e-6),
    "no projected point ever escapes the globe's disc"
  );
}

{
  // The exact inverse of the Day 4 projection (x = (lng+180)*2, y = (90-lat)*2),
  // which is what lets the globe reuse worldMap.js instead of a second dataset.
  const rings = ringsFromPath("M360 180L364 180L364 176Z");
  check(rings.length === 1 && rings[0].length === 9, "ringsFromPath parses one ring of three points");
  const [lng, lat] = vecToLngLat([rings[0][0], rings[0][1], rings[0][2]]);
  check(near(lng, 0, 1e-9) && near(lat, 0, 1e-9), "map pixel 360,180 inverts to 0°N 0°E");
  check(ringsFromPath("M0 0L1 1").length === 0, "a ring with too few points is skipped, not emitted broken");
  check(ringsFromPath("M10 10L20 10L20 20ZM100 100L110 100L110 110Z").length === 2, "multi-ring paths split into separate rings");
}
{
  const box = ringsFromPath("M356 176L364 176L364 184L356 184Z");
  const center = countryCenter(box);
  check(unit(center), "countryCenter returns a unit vector");
  const [lng, lat] = vecToLngLat(center);
  check(near(lng, 0, 1e-9) && near(lat, 0, 1e-9), "a ring centered on 0,0 has its center there too");
  check(countryCenter([]) === null, "a country with no rings has no center");
}
check(pointsToPath([[1.04, 2.06], [3, 4], [5, 6]]) === "M1 2.1L3 4L5 6Z", "points round to 0.1px and close the path");
check(pointsToPath([[1, 2]]) === null, "fewer than three points is not a path");

console.log("Globe graticule (M2.3.7 step 4.2)");
{
  const lines = graticuleLines(30, 5);
  check(lines.length === 17, "30° spacing yields 12 meridians and 5 parallels (poles excluded)");
  check(lines[0].length === 37, "a meridian samples pole to pole every 5°");
  const parallel = lines[lines.length - 1];
  const [px, py, pz] = parallel[0];
  const [qx, qy, qz] = parallel[parallel.length - 1];
  check(
    near(px, qx, 1e-9) && near(py, qy, 1e-9) && near(pz, qz, 1e-9),
    "a parallel's first and last samples coincide, so it reads as a closed loop with no special-cased wraparound"
  );
}
{
  const o = orientation(0, 0);
  const view = { cx: 200, cy: 200, radius: 190 };

  const facing = [lngLatToVec(-10, -10), lngLatToVec(10, -10), lngLatToVec(10, 10), lngLatToVec(-10, 10)];
  const onDisc = projectGraticuleLine(facing, o, view);
  check(onDisc.length === 1 && onDisc[0].length === facing.length, "a line entirely facing the viewer projects every point as one segment");

  const behind = [lngLatToVec(170, -10), lngLatToVec(-170, -10)];
  check(projectGraticuleLine(behind, o, view).length === 0, "a line entirely on the far side projects to nothing");

  const line = [];
  for (let lng = -150; lng <= 150; lng += 10) line.push(lngLatToVec(lng, 0));
  const clipped = projectGraticuleLine(line, o, view);
  check(clipped.length === 1, "a line that enters and exits the horizon once each yields a single clipped segment, not a chord through the far side");
  check(clipped[0].length < line.length, "the hidden portion of the line is dropped rather than drawn through the far side");
  check(
    clipped[0].every(([x, y]) => Math.hypot(x - view.cx, y - view.cy) <= view.radius + 1e-6),
    "a clipped graticule segment never escapes the globe's disc"
  );
}
check(pointsToPolylinePath([[1.04, 2.06], [3, 4]]) === "M1 2.1L3 4", "a polyline path rounds like pointsToPath but never closes");
check(pointsToPolylinePath([[1, 2]]) === null, "fewer than two points is not a polyline");

console.log("Globe motion (M2.3.7)");
check(normalizeLng(190) === -170 && normalizeLng(-190) === 170, "longitude wraps across the antimeridian");
check(normalizeLng(180) === 180 && normalizeLng(-180) === 180, "the antimeridian normalizes to a single value");
check(clampSpin({ lng: 0, lat: 120 }).lat === MAX_LATITUDE, "latitude clamps short of the pole so the globe can't flip");
check(clampSpin({ lng: 540, lat: 0 }).lng === 180, "clampSpin folds a wound-up longitude back into range");
check(shortestLngDelta(170, -170) === 20, "170°E to 170°W is 20° east, not 340° west");
check(shortestLngDelta(-170, 170) === -20, "the short way is signed, so it works in both directions");
check(near(lerpSpin({ lng: 170, lat: 0 }, { lng: -170, lat: 0 }, 0.5).lng, 180), "a tween across the antimeridian crosses the Pacific");
{
  const spun = spinFromDrag({ lng: 0, lat: 0 }, 190, 0, 190);
  check(near(spun.lng, -90), "dragging one radius to the right spins the globe 90° west");
  check(spinFromDrag({ lng: 0, lat: 80 }, 0, 400, 190).lat === MAX_LATITUDE, "a drag past the pole stops at the clamp");
  check(
    Math.abs(spinFromDrag({ lng: 0, lat: 0 }, 50, 0, 380).lng) < Math.abs(spinFromDrag({ lng: 0, lat: 0 }, 50, 0, 190).lng),
    "the same drag rotates less when zoomed in, so the surface tracks the finger"
  );
}
check(near(angleBetween(lngLatToVec(0, 0), lngLatToVec(90, 0)), 90), "angleBetween measures the arc in degrees");
check(!Number.isNaN(angleBetween(lngLatToVec(10, 10), lngLatToVec(10, 10))), "a vector against itself is 0°, not NaN");
{
  // The bug that already cost mapRegions.js a debugging pass: averaging
  // lng/lat puts a group straddling the antimeridian at 0° — the wrong side
  // of the planet. Averaging vectors cannot make that mistake.
  const centers = { a: lngLatToVec(179, 0), b: lngLatToVec(-179, 0) };
  check(Math.abs(groupSpin(["a", "b"], centers).lng) > 179, "a group straddling the antimeridian centers on 180°, not 0°");
  check(groupSpin(["nope"], centers) === null, "a group with no known countries has no spin");
  check(groupSpin(["a", "b", "c"], { ...centers, c: lngLatToVec(0, 0) }) !== null, "a partly-unknown group still resolves from its known members");
}
{
  const centers = { a: lngLatToVec(0, 0), b: lngLatToVec(4, 0) };
  const tight = groupZoom(["a", "b"], centers, groupSpin(["a", "b"], centers));
  const wide = groupZoom(
    ["a", "b"],
    { a: lngLatToVec(0, 0), b: lngLatToVec(120, 0) },
    groupSpin(["a", "b"], { a: lngLatToVec(0, 0), b: lngLatToVec(120, 0) })
  );
  check(tight > wide, "a tighter group frames at a closer zoom");
  check(wide >= 1, "no group ever zooms out past the whole globe");
  check(groupZoom(["nope"], centers, DEFAULT_SPIN) === 1, "an unknown group falls back to the world view");
}
{
  // groupZoom compares countries' CENTERS against each other, so a lone
  // country — center vs. itself — always reads as ~0° apart. That's correct
  // for a region's own countries, but wrong for framing one country's own
  // outline: it would zoom Russia and the Vatican to roughly the same tight
  // view, which is the bug countryAngularRadius exists to avoid
  // (WorldMapScreen's "spin to this country" link, M2.3.7 step 4).
  check(zoomForRadius(0) === 1, "framing a zero-width point falls back to the world view, not a divide-by-zero");
  check(zoomForRadius(90) === 1, "a full hemisphere frames at the world view");
  check(zoomForRadius(0, { min: 2 }) === 2, "zoomForRadius honors a caller's own min");
  check(zoomForRadius(1, { max: 3 }) === 3, "zoomForRadius clamps to a caller's own max rather than blowing up near the limb");

  const brRadius = countryAngularRadius(COUNTRY_RINGS.br, COUNTRY_CENTERS.br);
  const luRadius = countryAngularRadius(COUNTRY_RINGS.lu, COUNTRY_CENTERS.lu);
  check(brRadius > luRadius, "Brazil's own outline reaches further from its center than Luxembourg's");
  check(
    zoomForRadius(brRadius, { min: 1, max: 4 }) < zoomForRadius(luRadius, { min: 1, max: 4 }),
    "framing Brazil zooms in less than framing Luxembourg, since Brazil fills more of the view on its own"
  );
  check(countryAngularRadius(COUNTRY_RINGS.lu, COUNTRY_CENTERS.lu) > 0, "even a small real country has a nonzero angular radius");
  check(countryAngularRadius(null, COUNTRY_CENTERS.br) === 0, "no rings has no angular radius, rather than throwing");
  check(countryAngularRadius(COUNTRY_RINGS.br, null) === 0, "no center has no angular radius, rather than throwing");
}
{
  // Spin momentum (M2.3.7 step 4.4): a release velocity that decays every
  // frame until it's imperceptible, rather than the globe stopping dead
  // where the finger let go.
  const v = spinVelocityFromDrag(1, 0, 190);
  check(v.lng < 0, "dragging right releases with a westward (negative lng) velocity, matching spinFromDrag's own sign");
  check(spinVelocityFromDrag(0, 1, 190).lat > 0, "dragging down releases with a positive lat velocity");
  check(
    Math.abs(spinVelocityFromDrag(1, 0, 380).lng) < Math.abs(spinVelocityFromDrag(1, 0, 190).lng),
    "the same release speed reads as a slower spin when zoomed in, same radius scaling as spinFromDrag"
  );

  const decayed = decayVelocity({ lng: -1, lat: 0.5 }, MOMENTUM_FRAME_MS);
  check(Math.abs(decayed.lng) < 1 && decayed.lng < 0, "one frame's decay shrinks the magnitude without flipping its sign");
  check(near(decayVelocity({ lng: -1, lat: 0 }, 0).lng, -1), "zero elapsed time decays nothing");
  check(
    Math.abs(decayVelocity({ lng: -1, lat: 0 }, MOMENTUM_FRAME_MS * 10).lng) <
      Math.abs(decayVelocity({ lng: -1, lat: 0 }, MOMENTUM_FRAME_MS).lng),
    "more elapsed time decays velocity further, so a dropped frame doesn't coast for free"
  );

  check(isMomentumDone({ lng: 0, lat: 0 }), "zero velocity is done");
  check(!isMomentumDone({ lng: 1, lat: 0 }), "a fast spin is not yet done");
  check(isMomentumDone({ lng: 0.0001, lat: -0.0001 }), "velocity below the stop threshold in both axes counts as done");

  const stepped = stepMomentum({ lng: 0, lat: 0 }, { lng: -1, lat: 0.5 }, 10);
  check(near(stepped.lng, -10) && near(stepped.lat, 5), "stepMomentum advances spin by velocity times elapsed time");
  check(near(stepMomentum({ lng: 170, lat: 0 }, { lng: 1, lat: 0 }, 20).lng, -170), "stepMomentum wraps longitude across the antimeridian like any other spin update");
  check(stepMomentum({ lng: 0, lat: 80 }, { lng: 0, lat: 1 }, 20).lat === MAX_LATITUDE, "stepMomentum clamps latitude at the pole like any other spin update");
}

console.log("Globe geometry over the real dataset (M2.3.7)");
check(GLOBE_COUNTRY_CODES.length === Object.keys(COUNTRY_RINGS).length, "every country with rings is listed");
check(GLOBE_COUNTRY_CODES.length > 160, "the globe carries the same ~167 countries the flat map does");
check(
  GLOBE_COUNTRY_CODES.every((code) => COUNTRY_CENTERS[code] && unit(COUNTRY_CENTERS[code])),
  "every country resolves to a unit center vector"
);
{
  // Brazil is south and west; Japan is north and east. If the inverse
  // projection were flipped in either axis, one of these would land in the
  // wrong hemisphere — the cheapest possible guard against a sign error.
  const [brLng, brLat] = vecToLngLat(COUNTRY_CENTERS.br);
  const [jpLng, jpLat] = vecToLngLat(COUNTRY_CENTERS.jp);
  check(brLng < -40 && brLng > -70 && brLat < 0, "Brazil's center lands in the south-western hemisphere");
  check(jpLng > 130 && jpLng < 145 && jpLat > 0, "Japan's center lands in the north-eastern hemisphere");
}
{
  // The projection's one hard invariant, over all 8,190 real points at four
  // orientations: nothing may draw outside the sphere's silhouette.
  const view = { cx: 200, cy: 200, radius: 190 };
  let drawn = 0;
  let escaped = 0;
  for (const [lng, lat] of [[0, 20], [100, 20], [-60, 10], [30, 60]]) {
    const o = orientation(lng, lat);
    for (const code of GLOBE_COUNTRY_CODES) {
      for (const ring of COUNTRY_RINGS[code]) {
        const pts = projectRing(ring, o, view);
        if (!pts) continue;
        drawn++;
        for (const [x, y] of pts) {
          if (Math.hypot(x - view.cx, y - view.cy) > view.radius + 0.05) escaped++;
        }
      }
    }
  }
  check(drawn > 400, "the four sample orientations draw a substantial share of the world");
  check(escaped === 0, "across every real country at four orientations, no point escapes the disc");
}
check(
  projectCountry(COUNTRY_RINGS.ru, orientation(100, 55), { cx: 200, cy: 200, radius: 190 })?.startsWith("M"),
  "Russia — the country that broke the flat map's bounding boxes — projects to a real path"
);
check(
  projectCountry(COUNTRY_RINGS.br, orientation(140, 0), { cx: 200, cy: 200, radius: 190 }) === null,
  "a country on the far side of the globe emits no path, so it can't be tapped through the sphere"
);
{
  const codes = COUNTRIES.filter((c) => c.region === "Europe").map((c) => c.code);
  const spin = groupSpin(codes, COUNTRY_CENTERS);
  check(spin.lat > 30 && spin.lat < 65 && spin.lng > -15 && spin.lng < 40, "the Europe preset actually faces Europe");
  check(groupZoom(codes, COUNTRY_CENTERS, spin, { min: 1, max: 4 }) > 1, "the Europe preset zooms in rather than staying at world view");
}

console.log("Scoring");
check(computeXp(0) === 0, "0 correct => 0 XP");
check(computeXp(4) === 40, "4 correct => 40 XP (no bonus)");
check(computeXp(8) === 80 + 20, "8 correct => 100 XP (with strong-round bonus)");

console.log("Interests (M2.3.6 step 2)");
const interestSlugSet = new Set(INTEREST_SLUGS);
check(interestSlugSet.size === INTERESTS.length, "interest slugs are unique");
check(
  INTERESTS.every((i) => i.slug && i.label && i.glyph),
  "every interest has a slug, label, and glyph"
);
check(isValidInterestSlug("history"), "isValidInterestSlug recognizes a real slug");
check(!isValidInterestSlug("astrology"), "isValidInterestSlug rejects an unknown slug");
check(
  JSON.stringify(normalizeInterests(["food", "history"])) === JSON.stringify(["history", "food"]),
  "normalizeInterests orders selections by catalog display order"
);
check(
  JSON.stringify(normalizeInterests(["history", "food", "history"])) === JSON.stringify(["history", "food"]),
  "normalizeInterests dedupes repeated slugs"
);
check(
  JSON.stringify(normalizeInterests(["history", "astrology"])) === JSON.stringify(["history"]),
  "normalizeInterests drops unknown slugs (e.g. a retired one from an old client)"
);
check(
  JSON.stringify(normalizeInterests(["food", "history"])) === JSON.stringify(normalizeInterests(["history", "food"])),
  "two equivalent selections in a different order normalize equal"
);
check(JSON.stringify(normalizeInterests(null)) === "[]", "normalizeInterests(null) is []");
check(JSON.stringify(normalizeInterests(undefined)) === "[]", "normalizeInterests(undefined) is []");
check(JSON.stringify(normalizeInterests([])) === "[]", "normalizeInterests([]) is []");

console.log("Interests cloud sync (M2.3.6 step 4)");
check(
  JSON.stringify(interestRowsFromSlugs("user-1", ["food", "history"])) ===
    JSON.stringify([
      { user_id: "user-1", interest_slug: "history" },
      { user_id: "user-1", interest_slug: "food" },
    ]),
  "interestRowsFromSlugs builds one row per slug, in catalog order"
);
check(
  JSON.stringify(interestRowsFromSlugs("user-1", ["history", "astrology"])) ===
    JSON.stringify([{ user_id: "user-1", interest_slug: "history" }]),
  "interestRowsFromSlugs drops unknown slugs like normalizeInterests does"
);
check(
  JSON.stringify(slugsFromInterestRows([{ interest_slug: "food" }, { interest_slug: "history" }])) ===
    JSON.stringify(["history", "food"]),
  "slugsFromInterestRows normalizes rows back into catalog order"
);
check(JSON.stringify(slugsFromInterestRows(null)) === "[]", "slugsFromInterestRows(null) is []");
check(JSON.stringify(slugsFromInterestRows([])) === "[]", "slugsFromInterestRows([]) is []");

check(
  JSON.stringify(mergeInterests(["history"], ["food"])) === JSON.stringify(["history", "food"]),
  "mergeInterests unions both sides rather than picking one"
);
check(
  JSON.stringify(mergeInterests(["history"], ["history", "food"])) === JSON.stringify(["history", "food"]),
  "mergeInterests dedupes a slug present on both sides"
);
check(JSON.stringify(mergeInterests(null, null)) === "[]", "mergeInterests with no data on either side is []");
check(
  JSON.stringify(mergeInterests(["history"], null)) === JSON.stringify(["history"]),
  "mergeInterests with no cloud row keeps local interests as-is"
);

const noOpDiff = diffInterestRows(["history", "food"], ["food", "history"]);
check(
  noOpDiff.toAdd.length === 0 && noOpDiff.toRemove.length === 0,
  "diffInterestRows is a no-op when current and desired are the same set"
);
const changedDiff = diffInterestRows(["history"], ["food"]);
check(
  JSON.stringify(changedDiff.toAdd) === JSON.stringify(["food"]) &&
    JSON.stringify(changedDiff.toRemove) === JSON.stringify(["history"]),
  "diffInterestRows adds the new slug and removes the dropped one, not both wholesale"
);
const emptyDesiredDiff = diffInterestRows(["history", "food"], []);
check(
  emptyDesiredDiff.toAdd.length === 0 && JSON.stringify(emptyDesiredDiff.toRemove) === JSON.stringify(["history", "food"]),
  "diffInterestRows clears every row when the desired selection is empty (a skip)"
);

console.log("Learning paths content model (M2.4 step 1)");
check(
  LEARNING_PATHS.length === LEARNING_PATH_REGIONS.length,
  "one learning path per region"
);
check(
  LEARNING_PATHS.every((p, i) => p.region === LEARNING_PATH_REGIONS[i] && p.id === LEARNING_PATH_REGIONS[i].toLowerCase()),
  "each path's id/region match LEARNING_PATH_REGIONS, in order"
);
const pathNodeCodes = LEARNING_PATHS.flatMap((p) => p.nodes.map((n) => n.code));
check(pathNodeCodes.length === COUNTRIES.length, "every country appears in exactly one path's nodes");
check(new Set(pathNodeCodes).size === pathNodeCodes.length, "no country appears in more than one path");
check(
  LEARNING_PATHS.every((p) => p.nodes.every((n) => n.code && n.name && n.difficulty)),
  "every node carries code, name, and difficulty"
);
const DIFFICULTY_RANK = { easy: 0, medium: 1, hard: 2 };
check(
  LEARNING_PATHS.every((p) => p.nodes.every((n, i) => i === 0 || DIFFICULTY_RANK[p.nodes[i - 1].difficulty] <= DIFFICULTY_RANK[n.difficulty])),
  "each path's nodes run easy → medium → hard, never harder-to-easier"
);
check(
  JSON.stringify(getLearningPath("americas")) === JSON.stringify(LEARNING_PATHS.find((p) => p.id === "americas")),
  "getLearningPath(id) returns the matching path"
);
check(getLearningPath("atlantis") === null, "getLearningPath returns null for an unknown id");

console.log("Mastery policy (M2.4 step 2)");
const oceania = getLearningPath("oceania");
const round = (difficulty, score, total) => ({ mode: "flag", difficulty, score, total });
const strongEasyRounds = [round("easy", 8, 8), round("easy", 7, 8), round("easy", 8, 8)];

const noHistory = computeNodeStates(oceania, []);
check(
  noHistory.filter((n) => n.difficulty === "easy").every((n) => n.state === "unlocked") &&
    noHistory.filter((n) => n.difficulty !== "easy").every((n) => n.state === "locked"),
  "with no round history, only the easy tier is unlocked"
);

const easyMastered = computeNodeStates(oceania, strongEasyRounds);
check(
  easyMastered.filter((n) => n.difficulty === "easy").every((n) => n.state === "mastered"),
  "3 strong easy rounds (>= the accuracy bar) master every easy node"
);
check(
  easyMastered.filter((n) => n.difficulty === "medium").every((n) => n.state === "unlocked"),
  "mastering easy unlocks (but doesn't master) medium nodes"
);
check(
  easyMastered.filter((n) => n.difficulty === "hard").every((n) => n.state === "locked"),
  "hard nodes stay locked until medium is mastered too"
);

const tooFewRounds = computeNodeStates(oceania, strongEasyRounds.slice(0, 2));
check(
  tooFewRounds.filter((n) => n.difficulty === "easy").every((n) => n.state === "unlocked") &&
    tooFewRounds.filter((n) => n.difficulty !== "easy").every((n) => n.state === "locked"),
  "fewer than MASTERY_MIN_ROUNDS strong rounds isn't enough to master a tier"
);

const weakEasyRounds = [round("easy", 2, 8), round("easy", 3, 8), round("easy", 2, 8)];
const weakEasy = computeNodeStates(oceania, weakEasyRounds);
check(
  weakEasy.filter((n) => n.difficulty === "easy").every((n) => n.state === "unlocked"),
  "enough rounds but below the accuracy bar isn't enough to master a tier"
);

const allDifficultyRounds = [round("all", 8, 8), round("all", 8, 8), round("all", 8, 8)];
const allDifficulty = computeNodeStates(oceania, allDifficultyRounds);
check(
  allDifficulty.filter((n) => n.difficulty === "easy").every((n) => n.state === "unlocked"),
  "difficulty:\"all\" rounds (Daily, or an untiered round) don't count toward any single tier"
);

check(JSON.stringify(computeNodeStates(null, [])) === "[]", "computeNodeStates returns [] for an unknown path");
check(
  oceania.nodes.every((n, i) => computeNodeStates(oceania, [])[i].code === n.code),
  "computeNodeStates preserves node order and identity"
);

console.log("Achievement catalog + policy (M2.5 step 1)");
check(
  new Set(ACHIEVEMENTS.map((a) => a.slug)).size === ACHIEVEMENTS.length,
  "every achievement has a unique slug"
);
check(
  ACHIEVEMENTS.every((a) => a.slug && a.label && a.description && a.glyph && a.metric && a.threshold > 0),
  "every achievement has slug/label/description/glyph/metric and a positive threshold"
);

const noProgressNoResults = computeAchievements(null, []);
check(
  noProgressNoResults.length === ACHIEVEMENTS.length && noProgressNoResults.every((a) => !a.unlocked && a.progress === 0),
  "with no progress and no round history, every achievement is locked at 0 progress"
);

const roundRow = (mode, score, total) => ({ mode, difficulty: "all", score, total });

const streakAchievements = computeAchievements({ longestStreak: 7 }, []);
check(
  streakAchievements.find((a) => a.slug === "streak-3").unlocked && streakAchievements.find((a) => a.slug === "streak-7").unlocked,
  "a 7-day longest streak unlocks the 3-day and 7-day streak badges"
);
check(
  !streakAchievements.find((a) => a.slug === "streak-30").unlocked,
  "a 7-day longest streak does not unlock the 30-day streak badge"
);
check(
  Math.abs(streakAchievements.find((a) => a.slug === "streak-30").progress - 7 / 30) < 1e-9,
  "a locked streak badge reports its progress as a 0..1 ratio toward the threshold"
);

const tenRounds = Array.from({ length: 10 }, () => roundRow("flag", 6, 8));
const roundsAchievements = computeAchievements(null, tenRounds);
check(
  roundsAchievements.find((a) => a.slug === "rounds-10").unlocked && !roundsAchievements.find((a) => a.slug === "rounds-50").unlocked,
  "10 completed rounds unlocks the 10-round badge but not the 50-round badge"
);

const perfectRows = [roundRow("shape", 8, 8), roundRow("capital", 5, 8)];
const perfectAchievements = computeAchievements(null, perfectRows);
check(
  perfectAchievements.find((a) => a.slug === "perfect-1").unlocked,
  "one round with score === total unlocks the first perfect-round badge"
);
check(
  !perfectAchievements.find((a) => a.slug === "perfect-10").unlocked,
  "a single perfect round does not unlock the 10-perfect-rounds badge"
);

const allModeRows = ["flag", "capital", "capitalReverse", "shape", "locator", "daily"].map((m) => roundRow(m, 5, 8));
check(
  computeAchievements(null, allModeRows).find((a) => a.slug === "modes-all").unlocked,
  "playing every game mode at least once unlocks the mode-variety badge"
);
check(
  !computeAchievements(null, allModeRows.slice(0, -1)).find((a) => a.slug === "modes-all").unlocked,
  "missing one game mode leaves the mode-variety badge locked"
);

const repeatedModeRows = Array.from({ length: 5 }, () => roundRow("flag", 5, 8));
check(
  computeAchievements(null, repeatedModeRows).find((a) => a.slug === "modes-all").value === 1,
  "modesPlayed counts distinct modes, not total rounds"
);

console.log("Navigation stack (nav rework)");

const nav0 = initialNav();
check(nav0.tab === "home", "a fresh nav starts on Home");
check(TAB_KEYS.every((t) => nav0.stacks[t].length === 1), "every tab starts at its own root");
check(!canGoBack(nav0), "a tab root has nothing to go back to");
check(TABS.every((t) => ROUTES[t.key] && ROUTES[t.key].root), "every tab has a root route");

// The bug the old returnTo/returnPathId could not express: more than one hop.
const deep = navigate(
  navigate(switchTab(nav0, "learn"), { name: "country", code: "BRA" }),
  { name: "quiz", mode: "flag", difficulty: "all", timed: false }
);
check(stackDepth(deep) === 3, "learn → country → quiz is three deep in one stack");
check(currentRoute(deep).name === "quiz", "the quiz is on top");
check(currentRoute(back(deep)).name === "country", "back from the quiz lands on the country page");
check(currentRoute(back(back(deep))).name === "learn", "back again lands on the learning path, not Home");
check(!canGoBack(back(back(deep))), "and that's the root, so Back stops being offered");

// Tabs keep their own stacks. This is what makes a detour non-destructive.
const detoured = switchTab(switchTab(deep, "explore"), "learn");
check(stackDepth(detoured) === 3, "leaving a tab and coming back preserves its stack");
check(currentRoute(detoured).name === "quiz", "...including exactly where you were");
check(stackDepth(switchTab(deep, "explore")) === 1, "the tab you switch TO is untouched at its root");

// Re-selecting the active tab is the standard "get me out of here".
check(stackDepth(switchTab(deep, "learn")) === 1, "re-selecting the active tab resets it to its root");

// A root route can never stack on itself.
const learnTwice = navigate(switchTab(nav0, "learn"), { name: "learn", pathId: "africa" });
check(learnTwice.tab === "learn" && stackDepth(learnTwice) === 1, "navigating to a tab root switches instead of pushing");
check(currentRoute(learnTwice).pathId === "africa", "...while still carrying its params");

// Cross-tab jump: the World Map's region pill opens a learning path.
const fromMap = navigate(switchTab(nav0, "explore"), { name: "learn", pathId: "europe" });
check(fromMap.tab === "learn", "opening a learning path from Explore switches tabs");
check(fromMap.stacks.explore.length === 1, "and leaves Explore's stack alone");

check(currentRoute(navigate(deep, currentRoute(deep))) === currentRoute(deep), "pushing the identical route is a no-op");
check(stackDepth(back(nav0)) === 1, "back at a root is a no-op, so Back always terminates");

const replaced = replace(deep, { name: "quiz", mode: "flag", difficulty: "all", timed: false, attempt: 1 });
check(stackDepth(replaced) === 3, "replace swaps the top without deepening the stack");
check(currentRoute(replaced).attempt === 1, "...and the new params take effect");

let grown = switchTab(nav0, "explore");
for (let i = 0; i < MAX_STACK_DEPTH + 8; i++) {
  grown = navigate(grown, { name: "country", code: `X${i}` });
}
check(stackDepth(grown) <= MAX_STACK_DEPTH, "a stack can't grow past MAX_STACK_DEPTH");
check(currentStack(grown)[0].name === "explore", "...and the root is never the entry that gets trimmed");

check(showsChrome(nav0), "ordinary screens keep the persistent nav chrome");
check(!showsChrome(deep), "a quiz in progress is focus mode — no tab bar, no rail");

console.log("Navigation URLs");

check(routeToPath({ name: "home" }) === "/", "home is /");
check(routeToPath({ name: "learn", pathId: "africa" }) === "/learn/africa", "a learning path carries its region");
check(routeToPath({ name: "learn", pathId: null }) === "/learn", "a path-less learn route is just /learn");
check(routeToPath({ name: "explore", focusCountry: "BRA" }) === "/explore/BRA", "a focused globe is linkable");
check(routeToPath({ name: "country", code: "JPN" }) === "/country/JPN", "country pages are linkable");
check(routeToPath({ name: "quiz", mode: "flag", difficulty: "all", timed: false }) === "/play/flag", "a default round is a clean /play/mode");
check(
  routeToPath({ name: "quiz", mode: "flag", difficulty: "hard", timed: true }) === "/play/flag?difficulty=hard&timed=1",
  "a non-default round is still reproducible from its URL"
);

// Round-trip: every route the app can reach must survive path serialization.
const roundTrips = [
  { name: "home" },
  { name: "learn", pathId: "asia" },
  { name: "explore", focusCountry: "FRA" },
  { name: "profile" },
  { name: "country", code: "BRA" },
  { name: "countryIndex" },
  { name: "interests" },
  { name: "achievements" },
  { name: "quiz", mode: "shape", difficulty: "easy", timed: true },
];
check(
  roundTrips.every((r) => routeToPath(pathToRoute(routeToPath(r))) === routeToPath(r)),
  "every route round-trips through its URL unchanged"
);
check(
  Object.keys(ROUTES).every((name) => roundTrips.some((r) => r.name === name)),
  "every route in the table has URL coverage — a new route without a path is a visible gap"
);

check(pathToRoute("/nope") === null, "an unknown path is null, not a silent redirect to Home");
check(pathToRoute("/country") === null, "a country page with no code is not a route");
check(pathToRoute("") .name === "home", "the empty path is Home");
check(pathToRoute("/learn/") .pathId === null, "a trailing slash doesn't invent an empty region id");

// A deep link needs something underneath it, or Back strands the visitor.
const linked = navFromPath("/country/BRA");
check(linked.tab === "explore", "a deep-linked country page opens in its owning tab");
check(stackDepth(linked) === 2 && canGoBack(linked), "...with its tab root underneath, so Back works");
check(navToPath(linked) === "/country/BRA", "and the URL it renders back is the one we arrived on");
check(navToPath(navFromPath("/learn/africa")) === "/learn/africa", "a deep-linked root route doesn't double up");
check(navToPath(navFromPath("/garbage")) === "/", "an unparseable URL falls back to Home");

// Browser Back must cost no more state than in-app Back.
const beforeBack = navigate(switchTab(deep, "explore"), { name: "country", code: "PER" });
const afterBack = syncToPath(beforeBack, "/explore");
check(currentRoute(afterBack).name === "explore", "browser Back pops to the route underneath");
check(afterBack.stacks.learn.length === 3, "...and does NOT flatten the other tabs' stacks");
check(navToPath(syncToPath(nav0, "/profile")) === "/profile", "an edited URL navigates rather than being ignored");
check(syncToPath(nav0, "/") === nav0, "syncing to the path we're already on is a no-op");
check(syncToPath(nav0, "/nonsense") === nav0, "an unparseable popstate leaves the stack alone");

console.log("Responsive chrome");

check(navMode(390) === "bar", "a phone gets the bottom tab bar");
check(navMode(834) === "bar", "a portrait tablet still gets the bar");
check(navMode(1440) === "rail", "a desktop gets the side rail");
check(navMode(BREAKPOINTS.rail) === "rail", "the rail breakpoint is inclusive");
check(chromeLayout(390).railWidth === 0, "bar mode reserves no rail width");
check(chromeLayout(900).railWidth === RAIL_WIDTH.compact, "a narrow desktop gets the icons-only rail");
check(chromeLayout(900).showLabels === false, "...without labels");
check(chromeLayout(1440).railWidth === RAIL_WIDTH.full, "a wide desktop gets the labelled rail");
check(chromeLayout(1440).showLabels === true, "...with labels");
check(
  BREAKPOINTS.railLabels - RAIL_WIDTH.full >= 880,
  "labels only appear once the media column still fits beside the rail"
);


console.log("Sync health (M2.1 — surfacing failed cloud writes)");

// The state machine. These are the checks that would have failed loudly on
// 2026-09-04, when every write was erroring and the UI still said "Synced".
check(INITIAL_SYNC_STATE.status === SYNC_IDLE, "a fresh session starts idle, not ok");
check(INITIAL_SYNC_STATE.failureCount === 0, "...with no failures recorded");

const fkError = { code: "23503", message: 'insert violates foreign key constraint' };
const oneFail = recordSyncFailure(INITIAL_SYNC_STATE, fkError, "t1");
check(oneFail.status === SYNC_RETRYING, "one failure is 'retrying', not a hard failure");
check(oneFail.failureCount === 1, "...and counts one failure");
check(oneFail.lastError.code === "23503", "...preserving the Postgres error code");

let escalated = INITIAL_SYNC_STATE;
for (let i = 0; i < FAILURE_ESCALATION; i++) escalated = recordSyncFailure(escalated, fkError, `t${i}`);
check(escalated.status === SYNC_FAILED, "consecutive failures escalate to 'failed'");
check(escalated.failureCount === FAILURE_ESCALATION, "...with the run counted");

const recovered = recordSyncSuccess(escalated, "t9");
check(recovered.status === SYNC_OK, "a success clears a failure run");
check(recovered.failureCount === 0, "...resetting the count");
check(recovered.lastError === null, "...and dropping the stale error");
check(recovered.lastOkAt === "t9", "...stamping when data was last known safe");

// lastOkAt is the useful half of a failure report, so it must survive one.
const failedAfterOk = recordSyncFailure(recovered, fkError, "t10");
check(failedAfterOk.lastOkAt === "t9", "a later failure keeps the last-known-good timestamp");

// Error narrowing — three shapes reach this from Supabase, thrown code, and
// libraries that invent their own.
check(describeError(null) === null, "no error narrows to null");
check(describeError(fkError).code === "23503", "a PostgrestError keeps its code");
check(describeError(new Error("boom")).message === "boom", "a thrown Error keeps its message");
check(describeError(new Error("boom")).code === null, "...with a null code");
check(describeError("plain string").message === "plain string", "a bare string still yields a message");

// What the player is told.
check(
  describeSyncState(recovered, { signedIn: false }).visible === false,
  "signed out shows nothing — local-only progress is the design, not a fault"
);
check(
  describeSyncState(INITIAL_SYNC_STATE, { signedIn: true }).visible === false,
  "signed in but nothing written yet stays quiet rather than claiming 'synced'"
);
check(
  describeSyncState(recovered, { signedIn: true }).tone === "ok",
  "a confirmed write reports ok"
);
check(
  describeSyncState(oneFail, { signedIn: true }).tone === "warning",
  "a single failure is a warning, not an alarm"
);
check(
  describeSyncState(escalated, { signedIn: true }).tone === "error",
  "a sustained failure escalates the tone"
);
check(
  describeSyncState(oneFail, { signedIn: true }).message.includes("retry"),
  "the warning tells the player a retry is coming"
);
check(
  describeSyncState(failedAfterOk, { signedIn: true }).detail === "Last saved t9",
  "a failure after a good write reports when data was last safe"
);
check(
  describeSyncState(oneFail, { signedIn: true }).detail === "No round has saved yet.",
  "...and says so honestly when nothing has ever saved"
);
check(
  describeSyncState(escalated, { signedIn: true }).tone !== "ok",
  "an escalated failure can never read as ok — the bug this whole module exists for"
);


console.log("Sync store (observable session health)");

// Deterministic clock + captured log, so these assert on real behaviour rather
// than on wall-clock strings, and don't spray console.error through the output.
const syncLogs = [];
const restoreSyncDeps = __setSyncStoreDeps({
  now: () => "2026-09-04T20:00:00.000Z",
  logger: (line) => syncLogs.push(line),
});

resetSyncState();
check(getSyncState().status === SYNC_IDLE, "the store starts idle");

const seen = [];
const unsubscribe = subscribeSyncState((s) => seen.push(s.status));

noteSyncFailure("user_stats upsert", fkError);
check(seen.length === 1, "a failure notifies subscribers");
check(getSyncState().status === SYNC_RETRYING, "...and moves the store to retrying");
check(getSyncState().lastError.code === "23503", "...keeping the Postgres code for the log");
check(
  syncLogs.length === 1 && syncLogs[0].includes("user_stats upsert") && syncLogs[0].includes("23503"),
  "a failed write is logged with which write failed and why"
);

noteSyncOk();
check(getSyncState().status === SYNC_OK, "a success moves the store to ok");
check(getSyncState().lastOkAt === "2026-09-04T20:00:00.000Z", "...stamped from the injected clock");
check(seen.length === 2, "...and notifies again");

unsubscribe();
noteSyncFailure("game_results insert", fkError);
check(seen.length === 2, "an unsubscribed listener stops hearing about changes");

resetSyncState();
check(getSyncState().status === SYNC_IDLE, "reset (sign-out) clears the state");
check(getSyncState().failureCount === 0, "...including the failure run");

// The decision path saveRoundResult() takes, driven through a fake client — no
// network, no Supabase. This is the wiring that actually broke in production:
// a failing user_stats upsert used to return early and never even attempt the
// game_results insert, silently.
const fakeClient = (failOn) => ({
  from(table) {
    const fail = failOn === table ? { code: "23503", message: "fk violation" } : null;
    return {
      upsert: async () => ({ error: fail }),
      insert: async () => ({ error: fail }),
    };
  },
});

async function syncWiringChecks() {
  // Mirrors saveRoundResult()'s order of operations without importing it —
  // cloudProgress.js pulls in AsyncStorage, which this suite cannot load.
  async function attemptRound(client) {
    const { error: statsError } = await client.from("user_stats").upsert({});
    if (statsError) {
      noteSyncFailure("user_stats upsert", statsError);
      return { ok: false };
    }
    const { error: resultError } = await client.from("game_results").insert({});
    if (resultError) {
      noteSyncFailure("game_results insert", resultError);
      return { ok: false };
    }
    noteSyncOk();
    return { ok: true };
  }

  resetSyncState();
  syncLogs.length = 0;
  const good = await attemptRound(fakeClient(null));
  check(good.ok === true, "a round against a healthy client reports ok");
  check(getSyncState().status === SYNC_OK, "...and leaves the store ok");
  check(syncLogs.length === 0, "...logging nothing");

  resetSyncState();
  syncLogs.length = 0;
  const bad = await attemptRound(fakeClient("user_stats"));
  check(bad.ok === false, "a failing stats upsert fails the round");
  check(getSyncState().status === SYNC_RETRYING, "...and the store records it");
  check(
    describeSyncState(getSyncState(), { signedIn: true }).tone === "warning",
    "...so Profile shows a warning instead of an unearned '✓ Synced'"
  );
  check(syncLogs.length === 1, "...and exactly one line reaches the console");

  resetSyncState();
  const badResult = await attemptRound(fakeClient("game_results"));
  check(badResult.ok === false, "a failing results insert also fails the round");
  check(
    getSyncState().lastError.message === "fk violation",
    "...recording the error that caused it"
  );

  restoreSyncDeps();
}


console.log("Interest prompt gate (M2.3.6 — asked once, never nagged)");

const promptGate = (over) =>
  resolveInterestPrompt({ signedIn: true, hydrated: true, askedAt: null, selected: [], ...over });

check(promptGate({}).prompt === true, "a signed-in account with nothing on file is asked");
check(promptGate({}).markAsked === true, "...and marked asked the moment it is shown");

check(
  promptGate({ hydrated: false }).prompt === false,
  "nothing is asked before local storage has answered"
);
check(
  promptGate({ hydrated: false }).markAsked === false,
  "...and nothing is marked either — we don't yet know what we know"
);
check(promptGate({ signedIn: false }).prompt === false, "signed out is never prompted");
check(
  promptGate({ signedIn: false }).markAsked === false,
  "...and signing out doesn't burn the one prompt they get"
);

// The anti-nag rules — the reason this module exists rather than an inline if.
check(
  promptGate({ askedAt: "2026-09-04T00:00:00.000Z" }).prompt === false,
  "an account already asked is never asked again"
);
check(
  promptGate({ askedAt: "2026-09-04T00:00:00.000Z", selected: [] }).prompt === false,
  "a SKIP is an answer — an empty selection after asking is not a reason to re-ask"
);
check(
  promptGate({ selected: ["history", "food"] }).prompt === false,
  "an account with picks from another device is not asked"
);
check(
  promptGate({ selected: ["history", "food"] }).markAsked === true,
  "...but is marked, so the decision isn't re-derived every launch"
);

// Defensive shapes — `selected` arrives from storage and a cloud merge.
check(promptGate({ selected: null }).prompt === true, "a null selection reads as nothing picked");
check(
  promptGate({ selected: undefined }).prompt === true,
  "...as does an undefined one"
);
check(resolveInterestPrompt().prompt === false, "called with nothing at all, it stays quiet");

// The invariant the whole milestone rests on: there is no input where we both
// decline to mark and still intend to ask. That combination would re-prompt on
// the next render forever.
for (const over of [
  {},
  { signedIn: false },
  { hydrated: false },
  { askedAt: "x" },
  { selected: ["food"] },
  { selected: null },
]) {
  const r = promptGate(over);
  if (r.prompt && !r.markAsked) {
    check(false, `prompting without marking would re-nag: ${JSON.stringify(over)}`);
  }
}
check(true, "no input asks without also marking — the prompt can never repeat");


console.log("Interests secondary button (Skip vs Cancel)");

const secondary = (over) => resolveSecondaryAction(over);

check(
  secondary({ origin: ORIGIN_PROMPT, initialSelected: [] }).label === "Skip",
  "the sign-up prompt offers Skip"
);
check(
  secondary({ origin: ORIGIN_PROMPT, initialSelected: [] }).clears === true,
  "...and skipping commits an empty answer"
);
check(
  secondary({ origin: ORIGIN_EDIT, initialSelected: ["history"] }).label === "Cancel",
  "the edit surface offers Cancel"
);
check(
  secondary({ origin: ORIGIN_EDIT, initialSelected: ["history"] }).clears === false,
  "...and cancelling leaves existing picks alone — the wipe bug this fixes"
);
check(
  secondary({ origin: ORIGIN_EDIT, initialSelected: [] }).label === "Cancel",
  "the edit surface says Cancel even with nothing picked yet"
);
check(
  secondary({ origin: ORIGIN_EDIT, initialSelected: [] }).clears === false,
  "...and still doesn't commit an answer on the player's behalf"
);

// Defensive: an origin that never got threaded through must degrade safely.
check(secondary().clears === false, "called with nothing, it cancels rather than clears");
check(
  secondary({ origin: "nonsense", initialSelected: ["food"] }).clears === false,
  "an unrecognized origin cancels"
);
check(
  secondary({ origin: ORIGIN_PROMPT, initialSelected: ["food"] }).clears === false,
  "even the prompt path refuses to clear when picks already exist"
);

// The invariant that makes the destructive case unreachable however origin is
// threaded through the UI.
for (const origin of [ORIGIN_PROMPT, ORIGIN_EDIT, "nonsense", undefined]) {
  for (const initialSelected of [["history"], ["a", "b"], []]) {
    const r = secondary({ origin, initialSelected });
    if (r.clears && initialSelected.length > 0) {
      check(false, `clearing with picks present: origin=${origin}`);
    }
  }
}
check(true, "no combination clears while picks exist — data loss is unreachable");


console.log("Content chunking (M2.9 step 2 — RAG ingestion)");

const chunkSrcRow = {
  code: "br",
  name: "Brazil",
  capital: "Brasilia",
  region: "Americas",
  summary: "Brazil is the giant of South America. It borders every country on the continent except Chile and Ecuador.",
  population: 216422446,
  area_km2: 8515767,
  lat: -14.235,
  lng: -51.9253,
  neighbors: ["ar", "bo"],
  facts: {
    trade: "One of the world's largest exporters of soybeans, coffee and iron ore.",
    climate: "Mostly tropical, dipping subtropical in the south.",
  },
};
const neighborNames = { ar: "Argentina", bo: "Bolivia" };
const brChunks = chunkCountry(chunkSrcRow, neighborNames);

check(brChunks.length > 0, "a populated country produces chunks");
check(
  brChunks.every((c, i) => c.chunkIndex === i),
  "chunk indexes are positional and gap-free — they are the upsert key"
);
check(
  brChunks.every((c) => c.countryCode === "br"),
  "every chunk carries its country code"
);
check(
  brChunks.every((c) => c.content.length <= MAX_CHUNK_CHARS),
  "no chunk exceeds the budget — gte-small truncates at 512 tokens silently"
);
check(
  brChunks.every((c) => c.content.includes("Brazil")),
  "every chunk names its country, so a retrieved fact can't be misattributed"
);
check(
  brChunks.some((c) => c.source === "geography" && c.content.includes("216.4 million")),
  "population is rendered as prose, not a raw number"
);
check(
  brChunks.some((c) => c.content.includes("Argentina and Bolivia")),
  "neighbours are named, not left as ISO codes"
);
check(
  brChunks.some((c) => c.source === "facts.trade"),
  "each fact becomes its own labelled chunk"
);

// Stable ordering across runs — unstable keys would rewrite every row each run.
const reordered = chunkCountry(
  { ...chunkSrcRow, facts: { climate: chunkSrcRow.facts.climate, trade: chunkSrcRow.facts.trade } },
  neighborNames
);
check(
  JSON.stringify(reordered.map((c) => c.source)) ===
    JSON.stringify(brChunks.map((c) => c.source)),
  "fact key order in the row doesn't change chunk order"
);

// Islands: "no land borders" is a real answer, not an absence.
const islandChunks = chunkCountry(
  { code: "is", name: "Iceland", region: "Europe", neighbors: [], summary: "An island nation." },
  {}
);
check(
  islandChunks.some((c) => c.content.includes("no land borders")),
  "a country with no neighbours says so, rather than retrieving nothing"
);

// Degenerate rows must not produce garbage chunks.
check(chunkCountry(null).length === 0, "a null row produces no chunks");
check(chunkCountry({ code: "xx" }).length === 0, "a row with no name produces no chunks");
check(
  chunkCountry({ code: "xx", name: "Nowhere" }).every((c) => c.content.trim().length > 0),
  "a nearly-empty row never produces blank chunks"
);

// splitProse
check(splitProse("").length === 0, "empty text yields no pieces");
check(splitProse("One sentence.")[0] === "One sentence.", "short text passes through whole");
const longProse = "This is a sentence about geography. ".repeat(120);
const prosePieces = splitProse(longProse);
check(prosePieces.length > 1, "over-budget prose is split");
check(prosePieces.every((p) => p.length <= MAX_CHUNK_CHARS), "...and every piece fits the budget");
check(
  prosePieces.every((p) => p.trim() === p && p.length > 0),
  "...with no blank or untrimmed pieces"
);
const unpunctuated = "x".repeat(MAX_CHUNK_CHARS * 2 + 50);
check(
  splitProse(unpunctuated).every((p) => p.length <= MAX_CHUNK_CHARS),
  "text with no sentence breaks still respects the budget"
);
check(
  splitProse("word ".repeat(400)).join(" ").replace(/\s+/g, " ").trim().startsWith("word word"),
  "splitting preserves the text rather than dropping it"
);

// staleChunkIndexes — the deletion half of a stable upsert.
check(
  JSON.stringify(staleChunkIndexes([0, 1, 2, 3, 4], 3)) === JSON.stringify([3, 4]),
  "shrinking content marks the leftover tail stale"
);
check(
  staleChunkIndexes([0, 1, 2], 3).length === 0,
  "unchanged chunk counts leave nothing stale"
);
check(
  staleChunkIndexes([0, 1], 5).length === 0,
  "growing content marks nothing stale"
);
check(staleChunkIndexes([], 0).length === 0, "an empty store has nothing stale");
check(
  JSON.stringify(staleChunkIndexes([2, 0, 1, 2], 1)) === JSON.stringify([1, 2]),
  "duplicates and disorder are handled"
);


console.log("RAG ranking, prompt + limits (M2.9 step 3)");

const ragChunks = [
  { country_code: "br", source: "summary", content: "Brazil is a country in Americas.", similarity: 0.80 },
  { country_code: "br", source: "geography", content: "Brazil borders Argentina.", similarity: 0.78 },
  { country_code: "br", source: "facts.trade", content: "Brazil — Trade: soybeans.", similarity: 0.76 },
  { country_code: "br", source: "facts.climate", content: "Brazil — Climate: tropical.", similarity: 0.74 },
];

// Degrade to general — the skip path is the default, not an edge case.
const unweighted = rerankByInterests(ragChunks, []);
check(
  unweighted.map((c) => c.source).join() === ragChunks.map((c) => c.source).join(),
  "no interests leaves retrieval order untouched"
);
check(unweighted.every((c) => c.interestMatched === false), "...and marks nothing as matched");

// Re-rank, never filter.
const weighted = rerankByInterests(ragChunks, ["economics"]);
check(weighted.length === ragChunks.length, "re-ranking never drops a chunk");
check(weighted[0].source === "facts.trade", "an economics pick lifts the trade chunk to the top");
check(
  weighted.some((c) => c.source === "facts.climate"),
  "...and the unmatched chunks are still reachable, not filtered out"
);
// A climate pick lifts the climate chunk past the chunks it was behind, but
// not past a stronger match it merely ties — which is the nudge-not-drag
// property, stated as a rank change rather than a first-place claim.
const climateRanked = rerankByInterests(ragChunks, ["climate"]).map((c) => c.source);
check(
  climateRanked.indexOf("facts.climate") < climateRanked.indexOf("geography"),
  "a climate pick lifts the climate chunk above the unmatched ones it trailed"
);
check(
  climateRanked.indexOf("facts.climate") < climateRanked.indexOf("facts.trade"),
  "...ahead of the other fact chunks too"
);
check(
  climateRanked[0] === "summary",
  "...while a tie still defers to the stronger retrieval match"
);

// The boost breaks ties; it must not override a clearly better match.
const farBehind = [
  { source: "summary", content: "x", similarity: 0.90 },
  { source: "facts.trade", content: "y", similarity: 0.40 },
];
check(
  rerankByInterests(farBehind, ["economics"])[0].source === "summary",
  "the boost nudges, it does not drag an irrelevant chunk over a strong match"
);
check(INTEREST_BOOST < 0.2, "the boost stays small enough for that to hold");

check(matchesInterests("facts.trade", ["economics"]), "trade matches economics");
check(!matchesInterests("facts.trade", ["wildlife"]), "trade does not match wildlife");
check(!matchesInterests("summary", ["economics"]), "a generic source matches nothing");
check(
  !matchesInterests("facts.trade", ["not-a-real-slug"]),
  "an unknown slug from an old client degrades to no boost rather than erroring"
);

// Determinism — the eval set in step 6 depends on it.
check(
  JSON.stringify(rerankByInterests(ragChunks, ["economics"]).map((c) => c.source)) ===
    JSON.stringify(rerankByInterests(ragChunks, ["economics"]).map((c) => c.source)),
  "re-ranking is deterministic for identical inputs"
);

// The grounding contract.
const sys = systemPrompt();
check(sys.includes("ONLY from the numbered sources"), "the system prompt states the grounding rule");
check(sys.toLowerCase().includes("cite"), "...and requires citations");
check(sys.toLowerCase().includes("never fill a gap from memory"), "...and forbids filling gaps from memory");

const userMsg = buildUserMessage({ question: "What does Brazil export?", chunks: ragChunks, place: "Brazil" });
check(userMsg.includes("[1]") && userMsg.includes("[4]"), "sources are numbered from 1");
check(userMsg.includes("What does Brazil export?"), "the question is included");
check(
  userMsg.indexOf("SOURCES:") < userMsg.indexOf("QUESTION:"),
  "stable framing precedes the volatile question — the shape prompt caching needs"
);

const sources = formatSources(ragChunks);
check(sources[0].ref === 1, "returned sources are one-indexed to match the citations");
check(
  sources.every((s) => typeof s.content === "string" && s.content.length > 0),
  "every returned source carries its text — a citation you can't read isn't evidence"
);

check(JSON.stringify(citedRefs("Brazil exports soybeans [3] and coffee [1].")) === JSON.stringify([1, 3]),
  "cited refs are extracted and sorted");
check(citedRefs("no citations here").length === 0, "an uncited answer yields no refs");
check(JSON.stringify(citedRefs("see [2][2][2]")) === JSON.stringify([2]), "repeated citations dedupe");

check(
  isUngrounded("Brazil is big.", 4) === true,
  "an answer citing nothing despite having sources is flagged ungrounded"
);
check(isUngrounded("Brazil is big [1].", 4) === false, "a cited answer is not flagged");
check(isUngrounded("anything", 0) === false, "with no sources there is nothing to be ungrounded against");
check(NO_CONTEXT_ANSWER.length > 0, "there is a canned answer for when retrieval finds nothing");

// Rate limiting.
check(checkRateLimit([], 1000).allowed === true, "a first request is allowed");
const full = Array.from({ length: RATE_LIMIT.max }, (_, i) => 1000 + i);
check(checkRateLimit(full, 1100).allowed === false, "a full window is rejected");
check(checkRateLimit(full, 1100).retryAfterMs > 0, "...with a retry hint");
check(
  checkRateLimit(full, 1000 + RATE_LIMIT.windowMs + 1).allowed === true,
  "the window slides — old requests stop counting"
);
check(
  checkRateLimit([1, 2, 3], 1_000_000).kept.length === 1,
  "expired timestamps are pruned, so storage can't grow forever"
);
check(checkRateLimit(null, 1000).allowed === true, "a missing history is treated as no requests");

check(validateQuestion("") === "empty", "an empty question is rejected before any API call");
check(validateQuestion("  ") === "empty", "...whitespace too");
check(validateQuestion("hi") === "too-short", "a too-short question is rejected");
check(validateQuestion("x".repeat(601)) === "too-long", "an over-long question is rejected");
check(validateQuestion("What does Brazil export?") === null, "a real question passes");


// The async sections. Everything above is synchronous, so the summary waits on
// just these two promises before deciding the exit code.
contentResolverChecks()
  .then(syncWiringChecks)
  .then(() => {
    console.log(fails ? `\nFAILED (${fails})` : "\nAll engine tests passed ✓");
    process.exit(fails ? 1 : 0);
  });
