// PURE study analytics (M2.12 step 9) — what should this player go and learn?
//
// Mined from the same signal every other policy layer uses:
// `game_results.countries`, the { code, correct } pairs M2.5 step 6.1 started
// capturing. No new schema, no new column, no second source of truth.
//
// THE DESIGN PROBLEM: three different things all mean "needs study", and they
// are not interchangeable.
//
//   1. You get it wrong a lot          — low accuracy
//   2. You got it wrong just now       — a recent miss, even at high accuracy
//   3. You have not seen it in weeks   — decay, even at 100% accuracy
//
// Collapsing them into one number loses the reason, and the reason is the
// whole product: "you missed Latvia twice this week" and "you have not seen
// Peru since March" call for different practice. So each country carries a
// REASON, and the sort is by urgency rather than by a single blended score.
//
// A country never seen at all is NOT "needs study" — it is `unseen`, a fourth
// state. Marking all 196 countries as weak on day one would make the surface
// useless exactly when a new player first opens it, and would drown the
// handful they actually just got wrong.
//
// Pure: no React, no network, and `now` is a parameter so recency is testable
// without waiting a fortnight. Same contract marathon.js uses for its clock.

import { COUNTRIES } from "../data/countries";
import { REGIONS } from "./countryIndex";
import {
  REVIEW_WEAK_ACCURACY,
  REVIEW_STALE_DAYS,
  REVIEW_MIN_ATTEMPTS,
  REVIEW_PRACTICE_SIZE,
} from "../constants";

const DAY_MS = 24 * 60 * 60 * 1000;
const STUDY_REGIONS = REGIONS.filter((region) => region !== "All");

// Fold every row into per-country totals.
//
// Rows are tolerated in the sparse shapes the rest of the app already
// produces: a row with no `countries` (rounds recorded before M2.5 step 6.1)
// contributes nothing rather than throwing, and a missing `played_at` is
// treated as "no recency information" rather than as the epoch — dating a row
// to 1970 would mark every old round's countries permanently stale.
export function countryStats(results, now = Date.now()) {
  const stats = new Map();
  for (const row of results ?? []) {
    const playedAt = row?.played_at ? Date.parse(row.played_at) : null;
    const when = Number.isFinite(playedAt) ? playedAt : null;
    for (const entry of row?.countries ?? []) {
      if (!entry?.code) continue;
      const s = stats.get(entry.code) ?? {
        code: entry.code,
        seen: 0,
        right: 0,
        lastSeen: null,
        lastMiss: null,
      };
      s.seen += 1;
      if (entry.correct) s.right += 1;
      if (when !== null) {
        if (s.lastSeen === null || when > s.lastSeen) s.lastSeen = when;
        if (!entry.correct && (s.lastMiss === null || when > s.lastMiss)) s.lastMiss = when;
      }
      stats.set(entry.code, s);
    }
  }

  for (const s of stats.values()) {
    s.accuracy = s.seen > 0 ? s.right / s.seen : 0;
    s.daysSinceSeen = s.lastSeen === null ? null : Math.floor((now - s.lastSeen) / DAY_MS);
    s.daysSinceMiss = s.lastMiss === null ? null : Math.floor((now - s.lastMiss) / DAY_MS);
  }
  return stats;
}

// Why this country is on the list — or null if it is not.
//
// Ordered by urgency, and the order is the point: a country you missed
// yesterday AND have poor accuracy on is reported as a recent miss, because
// that is the more actionable of the two.
export function studyReason(stat, now = Date.now()) {
  if (!stat || stat.seen === 0) return "unseen";

  // A miss inside the recent window. No attempt minimum: getting something
  // wrong once IS the signal, and waiting for a third data point to admit it
  // would be the surface arriving too late to be useful.
  if (stat.daysSinceMiss !== null && stat.daysSinceMiss <= REVIEW_STALE_DAYS) {
    return "recent-miss";
  }

  // Poor accuracy over enough attempts to mean something. The minimum is what
  // stops one unlucky first answer from branding a country weak forever.
  if (stat.seen >= REVIEW_MIN_ATTEMPTS && stat.accuracy < REVIEW_WEAK_ACCURACY) {
    return "low-accuracy";
  }

  // Decay. Known, but not lately — the case a pure accuracy metric cannot see
  // at all, because the numbers look perfect.
  if (stat.daysSinceSeen !== null && stat.daysSinceSeen >= REVIEW_STALE_DAYS) {
    return "stale";
  }

  return null; // solid
}

// Urgency order, most urgent first. Used for both the sort and the practice
// set, so the countries you practise are the countries the list showed you.
const REASON_RANK = { "recent-miss": 0, "low-accuracy": 1, stale: 2 };

// Every country that needs work, most urgent first.
//
// `unseen` is deliberately excluded: a country you have never met is not
// something you are forgetting, and including them would bury a handful of
// real misses under everything you have not played yet.
export function needsStudy(results, { now = Date.now(), countries = COUNTRIES } = {}) {
  const stats = countryStats(results, now);
  const known = new Map(countries.map((c) => [c.code, c]));

  const rows = [];
  for (const stat of stats.values()) {
    const country = known.get(stat.code);
    if (!country) continue; // a code from a retired dataset
    const reason = studyReason(stat, now);
    if (!reason || reason === "unseen") continue;
    rows.push({ ...stat, name: country.name, region: country.region, reason });
  }

  return rows.sort((a, b) => {
    const byReason = REASON_RANK[a.reason] - REASON_RANK[b.reason];
    if (byReason !== 0) return byReason;
    // Within a reason: worse accuracy first, then the one seen longest ago.
    if (a.accuracy !== b.accuracy) return a.accuracy - b.accuracy;
    return (b.daysSinceSeen ?? 0) - (a.daysSinceSeen ?? 0);
  });
}

// The same analysis rolled up per region, so the surface can say "South
// America needs work" rather than listing nineteen countries.
//
// `studied` counts what this player has actually met, NOT the region size:
// "3 of 5 seen need work" is a useful sentence, "3 of 12 countries" when you
// have only played 5 of them is a misleading one.
export function studyByRegion(results, { now = Date.now(), countries = COUNTRIES } = {}) {
  const weak = needsStudy(results, { now, countries });
  const stats = countryStats(results, now);
  const byCode = new Map(countries.map((c) => [c.code, c]));

  const seenPerRegion = new Map();
  for (const stat of stats.values()) {
    const region = byCode.get(stat.code)?.region;
    if (!region) continue;
    seenPerRegion.set(region, (seenPerRegion.get(region) ?? 0) + 1);
  }

  return STUDY_REGIONS.map((region) => {
    const rows = weak.filter((w) => w.region === region);
    const seen = seenPerRegion.get(region) ?? 0;
    const total = countries.filter((c) => c.region === region).length;
    return {
      region,
      weak: rows.length,
      seen,
      total,
      // Of what you have actually met in this region, how much is solid.
      strength: seen > 0 ? (seen - rows.length) / seen : 0,
      countries: rows,
    };
  })
    .filter((entry) => entry.seen > 0)
    .sort((a, b) => a.strength - b.strength);
}

// The codes a "practice your weak spots" round should draw from.
//
// Capped, because a round is 8 questions and handing the builder 140 codes
// just means 132 of them are ignored — and the cap keeps the practice set the
// TOP of the urgency order rather than an arbitrary slice of it.
export function practiceSet(
  results,
  { now = Date.now(), countries = COUNTRIES, limit = REVIEW_PRACTICE_SIZE } = {}
) {
  return needsStudy(results, { now, countries })
    .slice(0, limit)
    .map((row) => row.code);
}

// One line for the top of the surface. Returns a shape, never a sentence —
// the component owns the wording, this owns the decision about which of the
// three states the player is in.
export function reviewSummary(results, { now = Date.now(), countries = COUNTRIES } = {}) {
  const stats = countryStats(results, now);
  const weak = needsStudy(results, { now, countries });
  const seen = stats.size;
  if (seen === 0) return { state: "empty", seen: 0, weak: 0, solid: 0 };
  if (weak.length === 0) return { state: "clear", seen, weak: 0, solid: seen };
  return { state: "work", seen, weak: weak.length, solid: seen - weak.length };
}
