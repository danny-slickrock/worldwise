// Quiz engine — builds rounds of multiple-choice questions from the dataset.
import { COUNTRIES } from "../data/countries";

export const MODES = {
  flag: { key: "flag", title: "Flag Guesser", blurb: "Whose flag is this?", icon: "⚑", accent: "#2E6E7E" },
  capital: { key: "capital", title: "Capital Quiz", blurb: "Name the capital", icon: "★", accent: "#9C6B3C" },
  shape: { key: "shape", title: "Shape Guesser", blurb: "Identify the outline", icon: "◇", accent: "#1F3A5F" },
  daily: { key: "daily", title: "Daily Challenge", blurb: "A mixed round every day", icon: "◉", accent: "#2F8F5B" },
};

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const sample = (arr, n) => shuffle(arr).slice(0, n);

// Seeded RNG so the Daily Challenge is identical for everyone on a given date.
function seededPick(arr, seed, n) {
  let s = seed;
  const pool = [...arr];
  const out = [];
  while (out.length < n && pool.length) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    out.push(pool.splice(s % pool.length, 1)[0]);
  }
  return out;
}

function buildOne(type, target) {
  if (type === "capital") {
    const distractors = sample(
      COUNTRIES.filter((c) => c.code !== target.code),
      3
    ).map((c) => c.capital);
    return {
      type,
      country: target,
      prompt: `What is the capital of ${target.name}?`,
      correct: target.capital,
      options: shuffle([target.capital, ...distractors]),
    };
  }
  // flag & shape both ask "which country?"
  const distractors = sample(
    COUNTRIES.filter((c) => c.code !== target.code),
    3
  ).map((c) => c.name);
  return {
    type,
    country: target,
    prompt: type === "flag" ? "Which country's flag is this?" : "Which country is this?",
    correct: target.name,
    options: shuffle([target.name, ...distractors]),
  };
}

// Build a standard single-mode round.
export function buildRound(mode, count = 8) {
  const targets = sample(COUNTRIES, count);
  return targets.map((t) => buildOne(mode, t));
}

// Build the mixed Daily Challenge, deterministic per date.
export function buildDaily(count = 6, date = new Date()) {
  const seed =
    date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
  const targets = seededPick(COUNTRIES, seed, count);
  const types = ["flag", "capital", "shape"];
  return targets.map((t, i) => buildOne(types[i % types.length], t));
}
