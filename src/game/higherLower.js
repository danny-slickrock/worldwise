// PURE logic for Higher or Lower. No React, no data imports beyond the bundled
// metric table — the round builder and the comparison, so both are testable
// without a renderer.
//
// The mode: two countries, one metric, pick the bigger; a run of correct
// answers is the point. A single question is close to a coin flip, so the
// streak is where the actual signal is, and the bonus below is shaped to say so.
import {
  HIGHER_LOWER_METRICS,
  HIGHER_LOWER_MIN_RATIO,
  HIGHER_LOWER_MAX_ATTEMPTS,
  HIGHER_LOWER_STREAK,
  HIGHER_LOWER_TIERS,
} from "../constants";

export const METRIC_BY_KEY = Object.fromEntries(HIGHER_LOWER_METRICS.map((m) => [m.key, m]));

// The band a tier plays in (M2.12 step 6): how far apart the two values may be,
// and which countries it draws from.
//
// An unknown or missing tier resolves to the widest FAIR band rather than to a
// tier's own settings — a round with no tier (the Daily, a country round) must
// behave exactly as it did before this milestone, which means the original
// floor and no ceiling.
const OPEN_BAND = {
  minRatio: HIGHER_LOWER_MIN_RATIO,
  maxRatio: Infinity,
  minGap: 1,
  maxGap: Infinity,
  difficulties: null, // null = draw from everything
};

export function higherLowerBand(tier) {
  return HIGHER_LOWER_TIERS[tier] ?? OPEN_BAND;
}

// Which of two countries wins on a metric, or null if it is not a fair ask.
//
// Two different reasons to return null, and conflating them would produce
// unanswerable questions:
//   · A tie. There is no correct answer, so there is no question.
//   · Too close to call on a continuous metric. The player cannot know that one
//     country is 3% larger, and marking them wrong for it teaches nothing.
//     Border counts are exempt: they are small integers a player can actually
//     hold, so 4 against 5 is a real question.
// `band` may be a plain number (the old minRatio signature, kept because the
// Daily and the country round still call it that way) or a full band object.
export function compareMetric(a, b, metric, band = HIGHER_LOWER_MIN_RATIO) {
  const field = metric?.field;
  if (!field || !a || !b || a.code === b.code) return null;

  const av = a[field];
  const bv = b[field];
  if (typeof av !== "number" || typeof bv !== "number") return null;
  if (av === bv) return null;

  const limits = typeof band === "number" ? { ...OPEN_BAND, minRatio: band } : band;
  const [hi, lo] = av > bv ? [av, bv] : [bv, av];
  const discrete = metric.key === "borders";

  if (discrete) {
    // Small integers: band on the DIFFERENCE. A ratio is the wrong measure
    // here — 4 borders against 5 is a perfectly real question but only a 1.25
    // ratio, which a continuous band would throw away.
    const gap = hi - lo;
    if (gap < (limits.minGap ?? 1)) return null;
    if (gap > (limits.maxGap ?? Infinity)) return null;
  } else {
    if (lo <= 0) return null; // a ratio against zero is meaningless
    const ratio = hi / lo;
    // The floor is the fairness rule and is never relaxed by a tier; the
    // ceiling is what makes a harder tier harder — a pair that is TOO obvious
    // for this tier is rejected and another is drawn.
    if (ratio < Math.max(limits.minRatio ?? HIGHER_LOWER_MIN_RATIO, HIGHER_LOWER_MIN_RATIO)) {
      return null;
    }
    if (ratio > (limits.maxRatio ?? Infinity)) return null;
  }

  return av > bv ? a.code : b.code;
}

// Build one question. `pick` is injected so the caller owns randomness — the
// Daily is seeded and must stay deterministic.
//
// Returns null if no fair pair turned up within the attempt budget, which the
// caller treats as "try another metric" rather than as an error.
export function buildHigherLowerQuestion(pool, metric, pick, band = HIGHER_LOWER_MIN_RATIO) {
  if (!pool || pool.length < 2) return null;

  for (let attempt = 0; attempt < HIGHER_LOWER_MAX_ATTEMPTS; attempt++) {
    const [a, b] = pick(pool, 2);
    if (!a || !b) continue;
    const winner = compareMetric(a, b, metric, band);
    if (!winner) continue;

    const winnerCountry = winner === a.code ? a : b;
    return {
      type: "higherLower",
      metric: metric.key,
      a,
      b,
      // `correct` is the winning NAME rather than its code, because QuizScreen
      // compares the tapped option against it directly and the options a player
      // sees are names. Locator is the exception that uses codes, and it pays
      // for that with a lookup on every comparison.
      correct: winnerCountry.name,
      prompt: metric.prompt,
      options: [a.name, b.name],
      // The context card wants a country; the winner is the one the answer is
      // about, so that is the one worth reading about afterwards.
      country: winnerCountry,
    };
  }
  return null;
}

// Streak bonus XP, awarded once per round on the best run achieved.
//
// Superlinear on purpose. The mode is about chaining, and a linear reward would
// make eight scattered singles worth the same as a run of eight — precisely the
// wrong incentive for a game whose whole premise is the chain.
export function streakBonusXp(bestStreak, config = HIGHER_LOWER_STREAK) {
  const streak = Number.isFinite(bestStreak) ? Math.floor(bestStreak) : 0;
  if (streak < config.bonusFrom) return 0;
  const steps = streak - config.bonusFrom + 1;
  return Math.min(config.maxBonus, ((steps * (steps + 1)) / 2) * config.xpPerStep);
}

// Read a metric value back for the answer reveal. This is the teaching moment:
// "Brazil 216 million, Argentina 46 million" is the thing worth remembering,
// and without it the mode is a coin flip with no payoff.
export function metricReadout(question) {
  const metric = METRIC_BY_KEY[question?.metric];
  if (!metric) return null;
  const format = (country) => `${country.name} ${formatMetric(country[metric.field], metric)}`;
  return `${format(question.a)} · ${format(question.b)}`;
}

export function formatMetric(value, metric) {
  if (typeof value !== "number") return "—";
  if (metric.key === "borders") return `${value}`;
  if (value >= 1e9) return `${(value / 1e9).toFixed(1)}bn ${metric.unit}`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}m ${metric.unit}`;
  if (value >= 1e3) return `${Math.round(value / 1e3)}k ${metric.unit}`;
  return `${value} ${metric.unit}`;
}
