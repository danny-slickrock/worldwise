// PURE validation for the structured quiz facts (highest point, largest city,
// longest river, bordering waters, national animal).
//
// THE RULE, and the reason this module exists: a fair quiz question needs
// exactly ONE unambiguous answer per country. So every field resolves to one
// of four statuses, and only `usable` may ever be promoted:
//
//   usable     one value, agreed by the sources that can check it
//   missing    no value — the source has nothing, or nothing that qualifies
//   multiple   more than one value, and nothing principled picks one
//   contested  a value exists but the sources disagree, or it is too close to
//              call (two cities within a few percent of each other)
//
// A human still approves every usable value before promotion (kids-adjacent
// product). This module never guesses: when in doubt it says which doubt.
//
// Imported by scripts/fetch-quiz-facts.mjs (Node) and the test suite. No RN.
import { normalize, similarity } from "./answerMatch";

export const STATUSES = ["usable", "missing", "multiple", "contested"];
export const QUIZ_FACT_FIELDS = [
  "highestPoint",
  "largestCity",
  "longestRiver",
  "waters",
  "nationalAnimal",
];

// Two sources' elevations count as agreeing within this fraction (Everest is
// 8,848.86 m on Wikidata and 8,849 m in the Factbook — the same mountain).
export const ELEVATION_AGREEMENT = 0.015;
// Two cities within this fraction of each other's population are too close to
// call: "largest" then depends on city-proper vs metro definitions and census
// year, not on geography.
export const CITY_CONTEST_RATIO = 0.05;

const result = (status, value = null, reasons = []) => ({ status, value, reasons });

// Name tokens that say nothing about WHICH mountain.
const GENERIC = new Set([
  "mount",
  "mountain",
  "peak",
  "pico",
  "monte",
  "on",
  "the",
  "of",
  "nevado",
  "mt",
]);
function tokens(name) {
  return normalize(name)
    .replace(/[()]/g, " ")
    .split(/\s+/)
    .filter((t) => t && !GENERIC.has(t));
}

// Do two names plausibly name the same feature? A shared distinctive token, or
// two tokens one transliteration apart ("Khuiten" / "Hüiten").
export function namesAgree(a, b) {
  const ta = tokens(a);
  const tb = tokens(b);
  if (!ta.length || !tb.length) return false;
  return ta.some((x) => tb.some((y) => x === y || (x.length >= 5 && similarity(x, y) >= 0.8)));
}

// "Mount Everest (highest peak in Asia ...) 8,849 m" → { name, elevationM }.
export function parseFactbookHighest(text) {
  if (!text || typeof text !== "string") return null;
  const m = text.match(/^(.*?)\s+(-?[\d,]+(?:\.\d+)?)\s*m\b/);
  if (!m) return null;
  const name = m[1].replace(/\s*\([^)]*\)\s*$/, "").trim();
  return { name, elevationM: Number(m[2].replace(/,/g, "")) };
}

// Highest point: Wikidata P610 (with P2044 elevation), cross-checked against
// the Factbook's own "highest point" line — the same cross-check the physical-
// geography pass relies on.
export function validateHighestPoint(wikidataCandidates, factbookText) {
  const wd = (wikidataCandidates ?? []).filter((c) => c?.name);
  const distinct = [...new Map(wd.map((c) => [normalize(c.name), c])).values()];
  const fb = parseFactbookHighest(factbookText);
  if (!distinct.length && !fb)
    return result("missing", null, ["no highest point in either source"]);
  if (distinct.length > 1) {
    return result("multiple", null, [
      `Wikidata lists ${distinct.length} highest points: ${distinct.map((c) => c.name).join(", ")}`,
    ]);
  }
  if (!distinct.length) {
    return result("contested", null, ["Factbook names one, Wikidata has none to cross-check it"]);
  }
  const w = distinct[0];
  if (!fb)
    return result("contested", null, [
      "Wikidata names one, the Factbook has none to cross-check it",
    ]);
  const elevOk =
    Number.isFinite(w.elevationM) &&
    Number.isFinite(fb.elevationM) &&
    Math.abs(w.elevationM - fb.elevationM) <=
      ELEVATION_AGREEMENT * Math.max(w.elevationM, fb.elevationM);
  const nameOk = namesAgree(w.name, fb.name);
  if (!elevOk || !nameOk) {
    return result("contested", null, [
      `Wikidata: ${w.name} ${w.elevationM ?? "?"} m; Factbook: ${fb.name} ${fb.elevationM} m` +
        (!nameOk ? " — names disagree" : "") +
        (!elevOk ? " — elevations disagree" : ""),
    ]);
  }
  // Wikidata's label (the canonical name) and the Factbook's rounded metre.
  return result("usable", { name: w.name, elevationM: Math.round(fb.elevationM) });
}

// The few HTML entities the factbook.json conversion leaves in its text
// ("S&atilde;o Paulo"). Named Latin-1 accents plus numeric references.
const ENTITY = { amp: "&", quot: '"', apos: "'", nbsp: " " };
const ACCENTS = {
  acute: "\u0301",
  grave: "\u0300",
  circ: "\u0302",
  tilde: "\u0303",
  uml: "\u0308",
  cedil: "\u0327",
  ring: "\u030a",
};
export function decodeEntities(str) {
  return String(str ?? "")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&([A-Za-z])(acute|grave|circ|tilde|uml|cedil|ring);/g, (_, ch, mark) =>
      (ch + ACCENTS[mark]).normalize("NFC")
    )
    .replace(/&(amp|quot|apos|nbsp);/g, (_, e) => ENTITY[e]);
}

// The Factbook's "Major urban areas - population":
//   "15.946 million Lagos, 4.348 million Kano, 3.840 million ABUJA (capital) (2023)"
export function parseUrbanAreas(text) {
  if (!text || typeof text !== "string") return [];
  return decodeEntities(text.split(/<br\s*\/?>/i)[0])
    .split(",")
    .map((part) => {
      const m = part.match(/^\s*([\d.]+)\s*(million|thousand)\s+(.*?)\s*(\(.*)?$/i);
      if (!m) return null;
      const scale = /million/i.test(m[2]) ? 1e6 : 1e3;
      const raw = m[3].trim();
      // ALL CAPS marks the capital; restore ordinary casing for display.
      const name =
        raw === raw.toUpperCase()
          ? raw.toLowerCase().replace(/(^|[\s-])\p{L}/gu, (c) => c.toUpperCase())
          : raw;
      return { name, population: Math.round(Number(m[1]) * scale) };
    })
    .filter(Boolean);
}

// Largest city: Wikidata cities in the country (P17) ordered by population
// (P1082), CROSS-CHECKED against the Factbook's largest urban area — the same
// two-source rule as the highest point. Wikidata alone is not trustworthy
// here: whether "Lagos" or "Greater Rio de Janeiro" is filed as a city or a
// metropolitan area varies item by item, so a single-source #1 can be Kano.
// Usable only when both sources' #1 name the same place. Deduped by name
// (one city can be reached through several classes).
export function validateLargestCity(cities, factbookUrbanText = undefined) {
  const byName = new Map();
  for (const c of cities ?? []) {
    if (!c?.name || !(c.population > 0)) continue;
    const key = normalize(c.name);
    if (!byName.has(key) || byName.get(key).population < c.population) byName.set(key, c);
  }
  const ranked = [...byName.values()].sort((a, b) => b.population - a.population);
  if (!ranked.length) return result("missing", null, ["no city with a population in Wikidata"]);
  const [top, next] = ranked;
  if (next && (top.population - next.population) / top.population < CITY_CONTEST_RATIO) {
    return result("contested", null, [
      `${top.name} (${top.population.toLocaleString("en")}) and ${next.name} (${next.population.toLocaleString("en")}) are within ${Math.round(CITY_CONTEST_RATIO * 100)}% — too close to call`,
    ]);
  }
  if (factbookUrbanText !== undefined) {
    const fb = parseUrbanAreas(factbookUrbanText)[0];
    if (!fb)
      return result("contested", null, [
        `Wikidata names ${top.name}; the Factbook lists no urban areas to cross-check`,
      ]);
    if (!namesAgree(top.name, fb.name)) {
      return result("contested", null, [
        `Wikidata's largest city is ${top.name}; the Factbook's largest urban area is ${fb.name}`,
      ]);
    }
  }
  return result("usable", { name: top.name, population: top.population });
}

// The Factbook's "Major rivers (by length in km)":
//   "Amazon river mouth (shared with Peru [s]) - 6,400 km; Río de la Plata/… - 4,880 km"
export function parseRivers(text) {
  if (!text || typeof text !== "string") return [];
  const body = text.split(/<br\s*\/?>/i)[0];
  return body
    .split(";")
    .map((part) => {
      const m = part.match(/^\s*(.*?)\s*-\s*([\d,]+)\s*km/);
      if (!m) return null;
      const name = m[1]
        .replace(/\s*\(.*$/, "")
        .replace(/\s+river\s+(mouth|source)\s*$/i, "")
        .replace(/\s+(mouth|source)\s*$/i, "")
        .trim();
      return name ? { name, km: Number(m[2].replace(/,/g, "")) } : null;
    })
    .filter(Boolean);
}

// Longest river flowing through the country — the first, longest entry of the
// Factbook's own length-ranked list. A tie at the top is contested.
export function validateLongestRiver(riverText) {
  const rivers = parseRivers(riverText).sort((a, b) => b.km - a.km);
  if (!rivers.length) return result("missing", null, ["the Factbook lists no major river"]);
  if (rivers[1] && rivers[1].km === rivers[0].km) {
    return result("contested", null, [
      `${rivers[0].name} and ${rivers[1].name} tie at ${rivers[0].km} km`,
    ]);
  }
  return result("usable", { name: rivers[0].name, km: rivers[0].km });
}

// Bodies of water named in the Factbook's Location line ("bordering the
// Atlantic Ocean", "between the North Pacific Ocean and the Sea of Japan").
const WATER =
  /\b((?:North |South |Western |Eastern )?(?:[A-Z][\w'-]*\s)*(?:Ocean|Sea|Gulf|Bay|Strait|Channel)(?: of [A-Z][\w'-]*(?: [A-Z][\w'-]*)*)?|(?:Gulf|Bay|Sea) of [A-Z][\w'-]*(?: [A-Z][\w'-]*)*)/g;
export function parseWaters(locationText) {
  if (!locationText || typeof locationText !== "string") return [];
  const found = locationText.match(WATER) ?? [];
  return [...new Set(found.map((s) => s.trim()))];
}

// Waters: landlocked is itself a valid, unambiguous fact. Otherwise exactly one
// named body is usable; more than one is `multiple` (a "which of these does it
// border?" question could still use the set — recorded, not promoted).
export function validateWaters(coastlineText, locationText) {
  const landlocked = /landlocked|^\s*0\s*km/i.test(coastlineText ?? "");
  if (landlocked) return result("usable", { landlocked: true, bodies: [] });
  const bodies = parseWaters(locationText);
  if (!bodies.length) {
    return result("missing", null, ["coastal, but the Location line names no body of water"]);
  }
  if (bodies.length > 1) {
    return { ...result("multiple", null, [`borders ${bodies.join(" and ")}`]), set: bodies };
  }
  return result("usable", { landlocked: false, bodies });
}

// The Factbook's "National symbol(s)" line, split into candidate symbols and
// stripped of the parts that are not symbols ("national colors: red, white").
export function parseNationalSymbols(text) {
  if (!text || typeof text !== "string") return [];
  return (
    text
      .split(/<br\s*\/?>/i)[0]
      .split(";")
      // Whole phrases only: a bare /anthem/ once dropped Japan's "chrysANTHEMum".
      .filter((part) => !/\bnational\s+(colou?rs?|anthem)\b/i.test(part))
      .flatMap((part) => part.split(/,|\band\b/))
      .map((s) =>
        s
          .replace(/\(.*?\)/g, "")
          .replace(/^\s*(two|three|the)\s+national\s+\w+\s*/i, "")
          .replace(/^\s*the\s+/i, "")
          .trim()
      )
      .filter(Boolean)
  );
}

// National animal, best-effort: only when the Factbook's national symbols
// contain EXACTLY ONE thing Wikidata classifies as an animal. `classified` is
// [{ symbol, isAnimal }] — the classification is fetched, never assumed.
export function validateNationalAnimal(classified) {
  const all = (classified ?? []).filter((c) => c?.symbol);
  const animals = all.filter((c) => c.isAnimal === true);
  if (!all.length) return result("missing", null, ["no national symbols listed"]);
  if (!animals.length) {
    return result("missing", null, [
      `no animal among the national symbols (${all.map((c) => c.symbol).join(", ")})`,
    ]);
  }
  if (animals.length > 1) {
    return result("multiple", null, [
      `${animals.length} animals: ${animals.map((c) => c.symbol).join(", ")}`,
    ]);
  }
  return result("usable", { name: animals[0].symbol });
}

// How many countries have a usable value per field, so we can see which
// quizzes have enough countries to be fair BEFORE building them.
export function coverageReport(factsByIso, universe = 196) {
  const report = {};
  for (const field of QUIZ_FACT_FIELDS) {
    const counts = { usable: 0, missing: 0, multiple: 0, contested: 0, approved: 0 };
    for (const facts of Object.values(factsByIso ?? {})) {
      const f = facts?.fields?.[field];
      if (!f) continue;
      counts[f.status] = (counts[f.status] ?? 0) + 1;
      if (f.status === "usable" && f.review === "approved") counts.approved += 1;
    }
    report[field] = { ...counts, checked: Object.keys(factsByIso ?? {}).length, universe };
  }
  return report;
}

// May this field be promoted into the app? Usable AND approved by a human.
export const isPromotable = (field) => field?.status === "usable" && field?.review === "approved";
