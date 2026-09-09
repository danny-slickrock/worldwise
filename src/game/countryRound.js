// "Play with Brazil" — a round about ONE country.
//
// The Play buttons on a country page used to start an ordinary mixed round of
// that mode. The country in the label wasn't even guaranteed to come up: you
// tapped "Play with Brazil" and got asked about Latvia. This turns them into
// what they always claimed to be.
//
// PURE: no RN, no theme, no network, no module-level dataset. Everything comes
// in through `deps`, which is what lets the whole question set be driven from
// tests with fixtures rather than against the live 196 countries — the same
// discipline as higherLower.js, which is the other builder that had to invent
// its own question shapes.
//
// What this module does NOT build: flag, shape and locator questions. Those
// already exist in questions.js with their own media and answer surfaces, and
// the assembling caller interleaves them. Rebuilding them here would fork the
// locator's candidate-picking, which is the one genuinely subtle piece.

// A land border is the fact this game is most about, so it gets two questions
// of different shapes — counting them, and recognising one.
export const COUNTRY_FACT_TYPES = ["region", "borderCount", "neighbor", "population", "area"];

// 216422446 → "216 million". Spelled out rather than abbreviated: these are
// answer OPTIONS, read side by side under time pressure, and "216M" next to
// "21.6M" is a misread waiting to happen where "216 million" next to
// "22 million" is not.
export function compactNumber(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v < 0) return null;
  if (v >= 1_000_000_000) return `${trim(v / 1_000_000_000)} billion`;
  if (v >= 1_000_000) return `${trim(v / 1_000_000)} million`;
  if (v >= 1_000) return `${trim(v / 1_000)} thousand`;
  return String(Math.round(v));
}

function trim(v) {
  // One decimal below 10, none above: "8.5 million" but "216 million".
  return v < 10 ? String(Math.round(v * 10) / 10) : String(Math.round(v));
}

export function formatArea(km2) {
  const n = compactNumber(km2);
  return n ? `${n} km²` : null;
}

// Plausible wrong magnitudes for a numeric answer.
//
// Multiplicative, not additive: the question is "what order of magnitude is
// this country?", and ±10% distractors would make it a reading test with no
// geography in it. Any factor whose FORMATTED value collides with the correct
// one (or with another distractor) is dropped — two identical options is a
// broken question, and rounding makes that easy to hit.
export function magnitudeDistractors(value, format, count, factors = [0.1, 0.25, 0.4, 2.5, 4, 10]) {
  const correct = format(value);
  const seen = new Set([correct]);
  const out = [];
  for (const f of factors) {
    if (out.length >= count) break;
    const candidate = format(value * f);
    if (!candidate || seen.has(candidate)) continue;
    seen.add(candidate);
    out.push(candidate);
  }
  return out;
}

// Wrong answers for "how many countries does it border?".
//
// Small integers, so this is the one place additive distractors are right — a
// player can actually hold "does Brazil border 9 or 11 countries?" in their
// head, which is the question. Never negative, and never the true answer.
export function borderCountDistractors(actual, count) {
  const out = [];
  for (const delta of [1, -1, 2, -2, 3, -3, 4, 5]) {
    if (out.length >= count) break;
    const n = actual + delta;
    if (n < 0 || n === actual || out.includes(n)) continue;
    out.push(n);
  }
  return out;
}

// Build the fact questions for one country.
//
// deps:
//   countries      the full country list, for names/regions to draw wrong
//                  answers from
//   page           this country's content page (neighbors, population, areaKm2)
//   sample(arr, n) random n, injected so a test can make it deterministic
//   shuffle(arr)   likewise
//   optionCount    total options per question, correct included
//   nameFor(code)  ISO code → display name, for neighbour questions
//
// A question whose data this country doesn't carry is simply not built —
// returning a question with two options, or with "undefined" as an answer, is
// far worse than a shorter round.
export function buildCountryFactQuestions(country, deps) {
  const { countries = [], page = {}, sample, shuffle, optionCount = 4, nameFor } = deps;
  const distractorCount = optionCount - 1;
  const out = [];

  const others = countries.filter((c) => c.code !== country.code);
  const neighbors = Array.isArray(page.neighbors) ? page.neighbors : [];

  // Region. The easiest question in the round on purpose: every round should
  // open a door for a player who knows almost nothing about this place yet.
  const regions = [...new Set(countries.map((c) => c.region).filter(Boolean))];
  const otherRegions = regions.filter((r) => r !== country.region);
  // Enough OTHER regions to fill every slot, or no question. A four-option
  // question rendered with two options is not an easier question, it is a
  // broken one — and the real dataset's five regions make this a guard against
  // a future data change rather than a live case.
  if (country.region && otherRegions.length >= distractorCount) {
    const wrong = sample(otherRegions, distractorCount);
    out.push({
      type: "region",
      country,
      prompt: `Which part of the world is ${country.name} in?`,
      correct: country.region,
      options: shuffle([country.region, ...wrong]),
    });
  }

  // How many land borders. Uses the same neighbour list the country page's
  // Borders section renders, so the game and the page can never disagree.
  if (neighbors.length > 0) {
    const actual = neighbors.length;
    const wrong = borderCountDistractors(actual, distractorCount);
    if (wrong.length === distractorCount) {
      out.push({
        type: "borderCount",
        country,
        prompt: `How many countries share a land border with ${country.name}?`,
        correct: String(actual),
        options: shuffle([String(actual), ...wrong.map(String)]).map(String),
      });
    }
  }

  // Recognising one neighbour. Distractors come from the same region where
  // possible: "does Peru border Brazil?" is a geography question, "does Norway
  // border Brazil?" is not.
  if (neighbors.length > 0 && nameFor) {
    const [correctCode] = sample(neighbors, 1);
    const correctName = nameFor(correctCode);
    const neighborSet = new Set(neighbors);
    const sameRegion = others.filter(
      (c) => c.region === country.region && !neighborSet.has(c.code)
    );
    const farAfield = others.filter((c) => !neighborSet.has(c.code));
    const pool = sameRegion.length >= distractorCount ? sameRegion : farAfield;
    const wrong = sample(pool, distractorCount).map((c) => c.name);
    if (correctName && wrong.length === distractorCount) {
      out.push({
        type: "neighbor",
        country,
        prompt: `Which of these shares a border with ${country.name}?`,
        correct: correctName,
        options: shuffle([correctName, ...wrong]),
      });
    }
  }

  // Population and area, as orders of magnitude.
  const population = numeric(page.population);
  if (population) {
    const correct = compactNumber(population);
    const wrong = magnitudeDistractors(population, compactNumber, distractorCount);
    if (correct && wrong.length === distractorCount) {
      out.push({
        type: "population",
        country,
        prompt: `About how many people live in ${country.name}?`,
        correct,
        options: shuffle([correct, ...wrong]),
      });
    }
  }

  const area = numeric(page.areaKm2);
  if (area) {
    const correct = formatArea(area);
    const wrong = magnitudeDistractors(area, formatArea, distractorCount);
    if (correct && wrong.length === distractorCount) {
      out.push({
        type: "area",
        country,
        prompt: `Roughly how large is ${country.name}?`,
        correct,
        options: shuffle([correct, ...wrong]),
      });
    }
  }

  return out;
}

function numeric(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}
