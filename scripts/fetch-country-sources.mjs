// M2.9 content enrichment — step 1 of the pipeline: fetch and cache raw sources.
//
// Deterministic and re-runnable. Nothing here calls a model and nothing here
// writes app content; it only pulls the two upstream sources into
// content-sources/raw/ so drafting works from a fixed, reviewable snapshot.
// Cached files are skipped unless --force, so a re-run costs nothing and the
// upstreams aren't hammered.
//
// Sources and why these two (see docs/adr/0001-content-enrichment-sourcing.md):
//   Wikidata  — structured facts. CC0, so no attribution obligation and no
//               share-alike. Queried by SPARQL; values are IDs and numbers, not
//               prose, so nothing is paraphrased and nothing is guessed.
//   CIA World Factbook — prose source. A work of the US federal government and
//               therefore public domain. Fetched via the factbook.json
//               community conversion, which is a format change, not an
//               editorial one.
//
// Run:  node scripts/fetch-country-sources.mjs br jp ng is in cl
//       node scripts/fetch-country-sources.mjs --force br
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const RAW_DIR = "content-sources/raw";
const INDEX_FILE = path.join(RAW_DIR, "_factbook-index.json");
const UA = "Worldwise/0.1 (geography learning app; github.com/danny-slickrock/worldwise)";

const args = process.argv.slice(2);
const force = args.includes("--force");
const codes = args.filter((a) => !a.startsWith("--")).map((c) => c.toLowerCase());
if (!codes.length) {
  console.error("usage: node scripts/fetch-country-sources.mjs [--force] <iso2>...");
  process.exit(1);
}

// Only the fields we actually draft from. Keeping the cache trimmed matters:
// it is committed, so it is part of the review surface, and a full Factbook
// dump per country would bury the parts a human needs to check.
const FACTBOOK_FIELDS = {
  Introduction: ["Background"],
  Geography: [
    "Location", "Area", "Land boundaries", "Coastline", "Climate", "Terrain",
    "Elevation", "Natural resources", "Land use", "Natural hazards",
    "Geography - note",
  ],
  "People and Society": [
    "Population", "Languages", "Religions", "Ethnic groups", "Urbanization",
    "Population distribution",
  ],
  Economy: [
    "Economic overview", "Agricultural products", "Industries",
    "Exports - commodities", "Exports - partners", "Imports - commodities",
  ],
  Environment: ["Environment - current issues", "Climate"],
};

async function getJson(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

// GEC code -> "region/xx" path. The factbook.json repo has no ISO index, so we
// build one from its directory listing and cache it. This is the piece that
// makes scaling past the pilot possible at all.
async function factbookIndex() {
  if (!force && existsSync(INDEX_FILE)) {
    return JSON.parse(await readFile(INDEX_FILE, "utf8"));
  }
  console.log("Building Factbook index...");
  const root = await getJson("https://api.github.com/repos/factbook/factbook.json/contents/");
  const regions = root
    .filter((e) => e.type === "dir" && !["meta", "world", "oceans", "antarctica"].includes(e.name))
    .map((e) => e.name);

  const index = {};
  for (const region of regions) {
    const files = await getJson(
      `https://api.github.com/repos/factbook/factbook.json/contents/${region}`
    );
    for (const f of files) {
      if (f.name.endsWith(".json")) index[f.name.replace(/\.json$/, "")] = `${region}/${f.name}`;
    }
  }
  await writeFile(INDEX_FILE, JSON.stringify(index, null, 2) + "\n");
  console.log(`  indexed ${Object.keys(index).length} Factbook entries`);
  return index;
}

// Structured facts. P901 (FIPS 10-4 / GEC) is fetched alongside because it is
// how an ISO code is resolved to a Factbook file.
// Batched: one SPARQL query per 40 countries. A single 196-country query times
// out against the public endpoint often enough to be unreliable, and a partial
// failure there would cost the whole run.
async function wikidata(isoCodes) {
  const BATCH = 40;
  if (isoCodes.length > BATCH) {
    const merged = {};
    for (let i = 0; i < isoCodes.length; i += BATCH) {
      const slice = isoCodes.slice(i, i + BATCH);
      process.stdout.write(`\r  wikidata ${Math.min(i + BATCH, isoCodes.length)}/${isoCodes.length}`);
      Object.assign(merged, await wikidataBatch(slice));
      await new Promise((r) => setTimeout(r, 500));
    }
    process.stdout.write("\n");
    return merged;
  }
  return wikidataBatch(isoCodes);
}

async function wikidataBatch(isoCodes) {
  const values = isoCodes.map((c) => `"${c.toUpperCase()}"`).join(" ");
  const query = `
SELECT ?iso ?gec ?countryLabel ?capitalLabel ?area ?population ?continentLabel
  (GROUP_CONCAT(DISTINCT ?langLabel; separator="|") AS ?languages)
  (GROUP_CONCAT(DISTINCT ?currLabel; separator="|") AS ?currencies)
  (GROUP_CONCAT(DISTINCT ?borderIso; separator="|") AS ?bordersAny)
WHERE {
  VALUES ?iso { ${values} }
  ?country wdt:P297 ?iso .
  OPTIONAL { ?country wdt:P901 ?gec }
  OPTIONAL { ?country wdt:P36 ?capital . ?capital rdfs:label ?capitalLabel . FILTER(lang(?capitalLabel)="en") }
  OPTIONAL { ?country wdt:P2046 ?area }
  OPTIONAL { ?country wdt:P1082 ?population }
  OPTIONAL { ?country wdt:P30 ?continent . ?continent rdfs:label ?continentLabel . FILTER(lang(?continentLabel)="en") }
  OPTIONAL { ?country wdt:P37 ?lang . ?lang rdfs:label ?langLabel . FILTER(lang(?langLabel)="en") }
  OPTIONAL { ?country wdt:P38 ?curr . ?curr rdfs:label ?currLabel . FILTER(lang(?currLabel)="en") }
  OPTIONAL { ?country wdt:P47 ?border . ?border wdt:P297 ?borderIso }
  ?country rdfs:label ?countryLabel . FILTER(lang(?countryLabel)="en")
}
GROUP BY ?iso ?gec ?countryLabel ?capitalLabel ?area ?population ?continentLabel`;

  const res = await fetch("https://query.wikidata.org/sparql", {
    method: "POST",
    headers: {
      "User-Agent": UA,
      Accept: "application/sparql-results+json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ query }),
  });
  if (!res.ok) throw new Error(`Wikidata HTTP ${res.status}`);
  const json = await res.json();

  const out = {};
  for (const b of json.results.bindings) {
    const v = (k) => b[k]?.value ?? null;
    const list = (k) => (v(k) ? v(k).split("|").filter(Boolean) : []);
    out[v("iso").toLowerCase()] = {
      name: v("countryLabel"),
      gec: v("gec"),
      capital: v("capitalLabel"),
      areaKm2: v("area") ? Number(v("area")) : null,
      population: v("population") ? Number(v("population")) : null,
      continent: v("continentLabel"),
      officialLanguages: list("languages"),
      currencies: list("currencies"),
      // NOTE: P47 is "shares border with" and includes MARITIME borders — it
      // lists six neighbours for Japan and two for Iceland, both of which have
      // no land border at all. Captured for provenance, but land borders are
      // taken from the Factbook's explicit "Land boundaries" instead. See the
      // ADR; this is the single biggest accuracy trap in the structured source.
      sharesBorderWithAnyType: list("bordersAny").map((c) => c.toLowerCase()),
    };
  }
  return out;
}

function pick(section, fields) {
  if (!section) return null;
  const out = {};
  for (const f of fields) if (section[f] !== undefined) out[f] = section[f];
  return Object.keys(out).length ? out : null;
}

async function factbook(gec, index) {
  const rel = index[gec?.toLowerCase()];
  if (!rel) return null;
  const raw = await getJson(
    `https://raw.githubusercontent.com/factbook/factbook.json/master/${rel}`
  );
  const out = { _path: rel };
  for (const [section, fields] of Object.entries(FACTBOOK_FIELDS)) {
    const picked = pick(raw[section], fields);
    if (picked) out[section] = picked;
  }
  return out;
}

await mkdir(RAW_DIR, { recursive: true });
const index = await factbookIndex();

const todo = codes.filter((c) => force || !existsSync(path.join(RAW_DIR, `${c}.json`)));
if (!todo.length) {
  console.log("All requested countries already cached (use --force to refetch).");
  process.exit(0);
}

console.log(`Fetching ${todo.length} of ${codes.length} requested (rest cached)...`);
const wd = await wikidata(todo);

let done = 0;
for (const iso of todo) {
  done += 1;
  if (todo.length > 12 && done % 20 === 0) console.log(`  ...${done}/${todo.length}`);
  const w = wd[iso];
  if (!w) {
    console.error(`  ${iso}: no Wikidata match — skipped`);
    continue;
  }
  let fb = null;
  try {
    fb = await factbook(w.gec, index);
  } catch (err) {
    console.error(`  ${iso}: Factbook fetch failed — ${err.message}`);
  }

  const record = {
    iso,
    fetchedAt: new Date().toISOString(),
    sources: {
      wikidata: { license: "CC0-1.0", endpoint: "https://query.wikidata.org/sparql" },
      factbook: {
        license: "public-domain (US Government work)",
        via: "github.com/factbook/factbook.json",
        path: fb?._path ?? null,
      },
    },
    wikidata: w,
    factbook: fb,
  };
  await writeFile(path.join(RAW_DIR, `${iso}.json`), JSON.stringify(record, null, 2) + "\n");
  const landBorders = fb?.Geography?.["Land boundaries"]?.["border countries"]?.text;
  console.log(
    `  ${iso}: ${w.name} — wikidata ok, factbook ${fb ? "ok" : "MISSING"}` +
      (landBorders ? `, land borders present` : ", NO land-border field")
  );
}
console.log("\nDone. Raw sources cached in content-sources/raw/");
