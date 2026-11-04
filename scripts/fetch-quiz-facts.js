// Structured quiz facts — fetch, validate, and stage for HUMAN REVIEW.
//
// Part of the enrichment pipeline (fetch → extract → validate → review →
// promote; see docs/adr/0005-structured-quiz-facts.md). Deterministic: no
// model is called, nothing is paraphrased, nothing is guessed.
//
//   highestPoint   Wikidata P610 (+ P2044 elevation), cross-checked against
//                  the Factbook's Elevation › highest point
//   largestCity    Wikidata cities in the country (P17) by population (P1082)
//   longestRiver   the Factbook's length-ranked "Major rivers" list
//   waters         the Factbook's Coastline (landlocked) + Location line
//   nationalAnimal the Factbook's "National symbol(s)", each symbol classified
//                  by Wikidata (is it an animal?) — best-effort, partial
//
// Every field passes through src/game/quizFactPolicy.js, which resolves it to
// usable / missing / multiple / contested. Every field starts review "pending";
// a human flips it to "approved" or "rejected" in content-sources/quiz-facts/
// <iso>.json, and approval is a git diff — the same review surface as drafts.
// A re-fetch keeps a review decision only if the value is unchanged.
//
// Run:  npx tsx scripts/fetch-quiz-facts.js np br jp tr ng bo
//       npx tsx scripts/fetch-quiz-facts.js --report     (coverage only)
import { mkdir, readFile, writeFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import {
  validateHighestPoint,
  validateLargestCity,
  validateLongestRiver,
  validateWaters,
  parseNationalSymbols,
  validateNationalAnimal,
  coverageReport,
  QUIZ_FACT_FIELDS,
} from "../src/game/quizFactPolicy";

const OUT_DIR = "content-sources/quiz-facts";
const RAW_DIR = "content-sources/raw";
const UA = "Worldwise/0.1 (geography learning app; github.com/danny-slickrock/worldwise)";
const SPARQL = "https://query.wikidata.org/sparql";
const FACTBOOK = "https://raw.githubusercontent.com/factbook/factbook.json/master/";

const args = process.argv.slice(2);
const reportOnly = args.includes("--report");
const codes = args.filter((a) => !a.startsWith("--")).map((c) => c.toLowerCase());

async function getJson(url, init = {}) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, {
      ...init,
      headers: { "User-Agent": UA, Accept: "application/json", ...(init.headers ?? {}) },
    });
    if (res.ok) return res.json();
    if (res.status === 429 || res.status >= 500) {
      await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
      continue;
    }
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  throw new Error(`gave up on ${url}`);
}

async function sparql(query) {
  const url = `${SPARQL}?format=json&query=${encodeURIComponent(query)}`;
  const data = await getJson(url, { headers: { Accept: "application/sparql-results+json" } });
  return data.results.bindings;
}

// Every P610 value, not just one — "multiple" must be visible to the validator.
async function highestPoints(isos) {
  const values = isos.map((i) => `"${i.toUpperCase()}"`).join(" ");
  const rows = await sparql(`SELECT ?iso ?hpLabel ?elev WHERE {
    VALUES ?iso { ${values} } ?c wdt:P297 ?iso . ?c wdt:P610 ?hp .
    OPTIONAL { ?hp wdt:P2044 ?elev }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } }`);
  const out = {};
  for (const r of rows) {
    const iso = r.iso.value.toLowerCase();
    (out[iso] ??= []).push({
      name: r.hpLabel.value,
      elevationM: r.elev ? Number(r.elev.value) : null,
    });
  }
  return out;
}

// The top cities by population. Per country: a single all-country query with
// the city-class path times out.
async function topCities(iso) {
  const rows = await sparql(`SELECT DISTINCT ?city ?cityLabel ?pop WHERE {
    ?c wdt:P297 "${iso.toUpperCase()}" .
    ?city wdt:P17 ?c ; wdt:P1082 ?pop .
    FILTER(?pop > 50000)
    ?city wdt:P31/wdt:P279* wd:Q515 .
    # Largest city means CITY PROPER. Metropolitan/urban-area items (e.g.
    # "Greater Rio de Janeiro") are classed as cities too, and outrank the
    # cities themselves; exclude them rather than let a definition decide.
    # DIRECT instance only: Istanbul is a "metropolitan municipality", which
    # SUBCLASSES metropolitan area — a subclass-path exclusion dropped it.
    FILTER NOT EXISTS { ?city wdt:P31 wd:Q1907114 }
    FILTER NOT EXISTS { ?city wdt:P31 wd:Q702492 }
    FILTER(!STRSTARTS(STR(?cityLabelRaw), "Greater "))
    ?city rdfs:label ?cityLabelRaw . FILTER(LANG(?cityLabelRaw) = "en")
    SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
  } ORDER BY DESC(?pop) LIMIT 8`);
  return rows.map((r) => ({
    name: r.cityLabel.value,
    population: Number(r.pop.value),
    qid: r.city.value.split("/").pop(),
  }));
}

// Is this symbol an animal? Look the words up on Wikidata and ask whether the
// matching item descends from "animal" (Q729) by subclass or parent taxon.
// true / false when Wikidata answers; null when it can't be resolved — and
// null is treated as NOT an animal by the validator. Never assumed.
async function classifySymbol(symbol) {
  const search = await getJson(
    `https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&type=item&limit=5&search=${encodeURIComponent(symbol)}`
  );
  const exact = (search.search ?? []).filter(
    (h) =>
      (h.label ?? "").toLowerCase() === symbol.toLowerCase() ||
      (h.match?.text ?? "").toLowerCase() === symbol.toLowerCase()
  );
  if (!exact.length) return { symbol, isAnimal: null, qid: null };
  for (const hit of exact) {
    // Q729 = animal (Animalia). Taxa reach it by parent taxon (P171); common
    // names ("eagle") by subclass (P279) or instance (P31) of a taxon.
    const rows = await sparql(`SELECT ?x WHERE {
      BIND(1 AS ?x)
      FILTER EXISTS { wd:${hit.id} (wdt:P279|wdt:P171|wdt:P31)* wd:Q729 . }
    }`).catch(() => []);
    if (rows.length) return { symbol, isAnimal: true, qid: hit.id };
  }
  return { symbol, isAnimal: false, qid: exact[0].id };
}

async function factbookFor(iso) {
  const raw = JSON.parse(await readFile(path.join(RAW_DIR, `${iso}.json`), "utf8"));
  const rel = raw.factbook?._path;
  if (!rel) return { rel: null, doc: null };
  return { rel, doc: await getJson(FACTBOOK + rel) };
}

const text = (node) => (node && typeof node === "object" ? (node.text ?? null) : null);

async function readExisting(iso) {
  const file = path.join(OUT_DIR, `${iso}.json`);
  return existsSync(file) ? JSON.parse(await readFile(file, "utf8")) : null;
}

// Keep a human's decision only when the value it was made about is unchanged.
function carryReview(field, previous) {
  const same = previous && JSON.stringify(previous.value) === JSON.stringify(field.value);
  return { ...field, review: same && previous.review ? previous.review : "pending" };
}

async function run() {
  await mkdir(OUT_DIR, { recursive: true });
  if (!reportOnly) {
    if (!codes.length) {
      console.error("usage: npx tsx scripts/fetch-quiz-facts.js <iso2>...  |  --report");
      process.exit(1);
    }
    console.log(`Fetching structured quiz facts for ${codes.join(", ")}`);
    const hp = await highestPoints(codes);
    for (const iso of codes) {
      const raw = JSON.parse(await readFile(path.join(RAW_DIR, `${iso}.json`), "utf8"));
      const { rel, doc } = await factbookFor(iso);
      const geo = doc?.Geography ?? {};
      const gov = doc?.Government ?? {};
      const cities = await topCities(iso);
      const symbolsText = text(gov["National symbol(s)"]);
      const symbols = parseNationalSymbols(symbolsText);
      const classified = [];
      for (const s of symbols) classified.push(await classifySymbol(s));

      const evidence = {
        wikidataHighestPoints: hp[iso] ?? [],
        factbookHighestPoint: text(geo.Elevation?.["highest point"]),
        wikidataTopCities: cities,
        factbookUrbanAreas: text(doc?.["People and Society"]?.["Major urban areas - population"]),
        factbookRivers: text(geo["Major rivers (by length in km)"]),
        factbookCoastline: text(geo.Coastline),
        factbookLocation: text(geo.Location),
        factbookNationalSymbols: symbolsText,
        symbolClassification: classified,
      };
      const previous = (await readExisting(iso))?.fields ?? {};
      const fields = {
        highestPoint: validateHighestPoint(
          evidence.wikidataHighestPoints,
          evidence.factbookHighestPoint
        ),
        largestCity: validateLargestCity(cities, evidence.factbookUrbanAreas ?? null),
        longestRiver: validateLongestRiver(evidence.factbookRivers),
        waters: validateWaters(evidence.factbookCoastline, evidence.factbookLocation),
        nationalAnimal: validateNationalAnimal(classified),
      };
      for (const k of QUIZ_FACT_FIELDS) fields[k] = carryReview(fields[k], previous[k]);

      const doc_ = {
        iso,
        name: raw.wikidata?.name ?? iso,
        fetchedAt: new Date().toISOString(),
        sources: {
          wikidata: { license: "CC0 1.0", url: "https://www.wikidata.org" },
          factbook: {
            license: "Public domain (US Government work)",
            path: rel,
            via: "github.com/factbook/factbook.json",
          },
        },
        fields,
        evidence,
      };
      await writeFile(path.join(OUT_DIR, `${iso}.json`), JSON.stringify(doc_, null, 2) + "\n");
      const line = QUIZ_FACT_FIELDS.map((k) => `${k}:${fields[k].status}`).join("  ");
      console.log(`  ${iso}  ${line}`);
    }
  }

  // Coverage over everything staged so far.
  const all = {};
  for (const f of (await readdir(OUT_DIR)).filter((f) => /^[a-z]{2}\.json$/.test(f))) {
    all[f.slice(0, 2)] = JSON.parse(await readFile(path.join(OUT_DIR, f), "utf8"));
  }
  const report = coverageReport(all);
  const rows = QUIZ_FACT_FIELDS.map((k) => {
    const r = report[k];
    return `| ${k} | ${r.usable} | ${r.approved} | ${r.missing} | ${r.multiple} | ${r.contested} | ${r.checked} |`;
  });
  const md = `# Quiz-fact coverage

Generated by \`scripts/fetch-quiz-facts.js\`. A field is **usable** only when it
has exactly one value the sources agree on; **approved** is usable AND signed off
by a human in \`<iso>.json\`. Only approved values are ever promoted.

Checked so far: ${Object.keys(all).length} of 196 countries (${Object.keys(all).sort().join(", ")}).

| field | usable | approved | missing | multiple | contested | checked |
|---|---|---|---|---|---|---|
${rows.join("\n")}

## Per country

| country | ${QUIZ_FACT_FIELDS.join(" | ")} |
|---|${QUIZ_FACT_FIELDS.map(() => "---").join("|")}|
${Object.values(all)
  .sort((a, b) => a.iso.localeCompare(b.iso))
  .map((c) => `| ${c.name} | ${QUIZ_FACT_FIELDS.map((k) => describe(c.fields[k])).join(" | ")} |`)
  .join("\n")}
`;
  await writeFile(path.join(OUT_DIR, "_coverage.md"), md);
  console.log(`\n${md}`);
}

function describe(f) {
  if (!f) return "—";
  if (f.status !== "usable") return `✗ ${f.status}: ${(f.reasons ?? []).join("; ")}`;
  const v = f.value;
  const shown =
    v?.landlocked === true
      ? "landlocked"
      : v?.bodies
        ? v.bodies.join(", ")
        : v?.elevationM
          ? `${v.name} (${v.elevationM.toLocaleString("en")} m)`
          : v?.population
            ? `${v.name} (${v.population.toLocaleString("en")})`
            : v?.km
              ? `${v.name} (${v.km.toLocaleString("en")} km)`
              : v?.name;
  return `✓ ${shown} — ${f.review}`;
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
