// Pure-logic tests for the quiz engine. Run with: npm test  (uses tsx)
// No React Native imports here, so it runs fast in plain Node via tsx.
import { COUNTRIES, LOCATOR_COUNTRIES } from "../src/data/countries";
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
import { pickRedirectUrl } from "../src/auth/redirectPolicy";
import {
  OPTIONS_PER_QUESTION,
  DIFFICULTIES,
  ROUND_LENGTH,
  STREAK_FREEZE_EARN_EVERY,
} from "../src/constants";

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

console.log("Scoring");
check(computeXp(0) === 0, "0 correct => 0 XP");
check(computeXp(4) === 40, "4 correct => 40 XP (no bonus)");
check(computeXp(8) === 80 + 20, "8 correct => 100 XP (with strong-round bonus)");

console.log(fails ? `\nFAILED (${fails})` : "\nAll engine tests passed ✓");
process.exit(fails ? 1 : 0);
