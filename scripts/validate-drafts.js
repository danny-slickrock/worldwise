// Validation over every drafted country. This is the pilot's hand-review turned
// into checks that run over 196 × 5 fields, because nobody is reading that by
// hand and "it looked fine on the six I checked" does not scale.
//
// Each check corresponds to a mistake that actually happened or was one step
// away during the pilot. Failures are grouped by severity:
//
//   ERROR — do not promote. A grounding or accuracy violation.
//   WARN  — look at it. Probably fine, occasionally not.
//
// Run:  npm run content:validate
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { chunkCountry, MAX_CHUNK_CHARS } from "../src/game/contentChunks.js";
import { NON_COUNTRY_BORDERS } from "../src/data/borderAliases.js";

const DRAFT_DIR = "content-sources/drafts";
const FIELDS = ["hook", "physicalGeography", "climate", "economy", "peopleAndCulture"];

// This pass is scoped to uncontested factual content. History and conflict are
// deferred for sequencing, not because they are off-limits — so a hit here is
// "wrong pass", not "forbidden". Matched as whole words to avoid catching
// "warm", "coupling", "Republic of…" and similar.
const DEFERRED_TERMS = [
  "war", "wars", "civil war", "coup", "coups", "genocide", "insurgency",
  "insurgent", "insurgents", "terrorism", "terrorist", "dictatorship",
  "dictator", "junta", "colonial", "colonialism", "colonized", "colonised",
  "independence", "annexed", "annexation", "invasion", "invaded", "occupation",
  "regime", "revolution", "uprising", "rebellion", "massacre", "apartheid",
  "disputed territory", "separatist",
];

// Prose must never call a territory a country. This is the pilot review's
// finding, generalised: for each non-country name, the phrasings that would
// misclassify it.
function territoryMiscallPatterns(name) {
  const n = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return [
    new RegExp(`\\b${n}\\b[^.]{0,30}\\bis a (?:country|nation|state)\\b`, "i"),
    new RegExp(`\\bcountries?\\b[^.]{0,40}\\b${n}\\b`, "i"),
    new RegExp(`\\b${n}\\b[^.]{0,20}\\band \\d+ other countries\\b`, "i"),
  ];
}

async function main() {
  const files = (await readdir(DRAFT_DIR)).filter((f) => f.endsWith(".json")).sort();
  const report = [];
  let drafted = 0, undrafted = [];
  let totalChunks = 0, longestChunk = 0;

  for (const file of files) {
    const d = JSON.parse(await readFile(path.join(DRAFT_DIR, file), "utf8"));
    const iso = d.iso;
    const s = d.structured;
    const errors = [], warns = [];

    const filled = FIELDS.filter((f) => (d.prose?.[f] ?? "").trim());
    if (!filled.length) { undrafted.push(iso); continue; }
    drafted += 1;

    // 1. Every prose field has a source excerpt behind it. A field written with
    //    no source is by definition ungrounded, whatever it says.
    for (const f of FIELDS) {
      const text = (d.prose?.[f] ?? "").trim();
      const excerpt = (d._sourceExcerpts?.[f]?.excerpt ?? "").trim();
      if (text && !excerpt) errors.push(`${f}: prose written with NO source excerpt`);
      if (!text && excerpt) warns.push(`${f}: source available but field left empty`);
    }

    // 2. Deferred-scope leakage. History and conflict belong to a later pass.
    for (const f of FIELDS) {
      const text = (d.prose?.[f] ?? "").toLowerCase();
      const hits = DEFERRED_TERMS.filter((t) => new RegExp(`\\b${t}\\b`).test(text));
      if (hits.length) warns.push(`${f}: deferred-scope terms [${[...new Set(hits)].join(", ")}]`);
    }

    // 3. No territory described as a country.
    for (const terr of s.landBorderTerritories ?? []) {
      for (const f of FIELDS) {
        const text = d.prose?.[f] ?? "";
        if (territoryMiscallPatterns(terr).some((re) => re.test(text))) {
          errors.push(`${f}: describes territory "${terr}" as a country`);
        }
      }
    }
    // Also catch a known non-country named as a country anywhere in the prose.
    for (const f of FIELDS) {
      const text = d.prose?.[f] ?? "";
      for (const terr of NON_COUNTRY_BORDERS) {
        if (!new RegExp(`\\b${terr}\\b`, "i").test(text)) continue;
        if (territoryMiscallPatterns(terr).some((re) => re.test(text))) {
          errors.push(`${f}: describes "${terr}" as a country`);
        }
      }
    }

    // 4. Border lists internally consistent.
    if ((s.landBorderUnresolved ?? []).length) {
      errors.push(`unresolved border names: ${s.landBorderUnresolved.join(", ")}`);
    }
    if (s.landBorderCodes?.length !== s.landBorderNames?.length) {
      errors.push(`border codes (${s.landBorderCodes?.length}) != names (${s.landBorderNames?.length})`);
    }
    if (new Set(s.landBorderCodes ?? []).size !== (s.landBorderCodes ?? []).length) {
      errors.push("duplicate border codes");
    }
    if ((s.landBorderCodes ?? []).includes(iso)) errors.push("country borders itself");
    // A country with no land borders must not have prose claiming neighbours.
    if (!(s.landBorderCodes ?? []).length && !(s.landBorderTerritories ?? []).length) {
      const claims = FIELDS.filter((f) =>
        /\b(shares? (?:a )?(?:land )?border|borders? (?:with )?[A-Z])/.test(d.prose?.[f] ?? "")
      );
      for (const f of claims) {
        if (!/\bno land border/i.test(d.prose[f])) {
          warns.push(`${f}: mentions borders though this country has none`);
        }
      }
    }

    // 5. Chunking invariants, run through the real chunker rather than a copy.
    const row = {
      code: iso, name: s.name, capital: s.capital, region: s.continent,
      summary: d.prose.hook, population: s.population, area_km2: s.areaKm2,
      lat: null, lng: null, neighbors: s.landBorderCodes ?? [],
      facts: {
        physical_geography: d.prose.physicalGeography,
        climate: d.prose.climate,
        economy: d.prose.economy,
        people_and_culture: d.prose.peopleAndCulture,
      },
    };
    const chunks = chunkCountry(row, {});
    totalChunks += chunks.length;
    for (const c of chunks) {
      longestChunk = Math.max(longestChunk, c.content.length);
      if (c.content.length > MAX_CHUNK_CHARS) {
        errors.push(`chunk ${c.chunkIndex} is ${c.content.length} chars, over the ${MAX_CHUNK_CHARS} cap`);
      }
      if (!c.content.includes(s.name)) {
        errors.push(`chunk ${c.chunkIndex} (${c.source}) does not name the country`);
      }
    }
    if (!chunks.length) errors.push("produces no chunks at all");

    // 6. Shape sanity — cheap checks that catch a mangled draft early.
    for (const f of FIELDS) {
      const text = (d.prose?.[f] ?? "").trim();
      if (!text) continue;
      if (text.length < 60) warns.push(`${f}: suspiciously short (${text.length} chars)`);
      if (/^```|^\{|^\[/.test(text)) errors.push(`${f}: looks like unparsed markup`);
      if (/&[a-z]+;|&#\d+;/i.test(text)) errors.push(`${f}: contains unescaped HTML entities`);
      if (/<[a-z/][^>]*>/i.test(text)) errors.push(`${f}: contains HTML tags`);
    }

    if (errors.length || warns.length) report.push({ iso, name: s.name, errors, warns });
  }

  const withErrors = report.filter((r) => r.errors.length);
  const withWarns = report.filter((r) => !r.errors.length && r.warns.length);

  console.log(`Validated ${drafted} drafted countries (${undrafted.length} not yet drafted).`);
  console.log(`Chunks: ${totalChunks} total, longest ${longestChunk} / ${MAX_CHUNK_CHARS} cap.`);
  console.log(`\n  ERRORS in ${withErrors.length} countries · warnings in ${withWarns.length}\n`);

  for (const r of withErrors) {
    console.log(`ERROR  ${r.iso} ${r.name}`);
    for (const e of r.errors) console.log(`         ${e}`);
    for (const w of r.warns) console.log(`   warn  ${w}`);
  }
  for (const r of withWarns) {
    console.log(`warn   ${r.iso} ${r.name}`);
    for (const w of r.warns) console.log(`         ${w}`);
  }
  if (undrafted.length) {
    console.log(`\nNot yet drafted (${undrafted.length}): ${undrafted.slice(0, 30).join(" ")}${undrafted.length > 30 ? " ..." : ""}`);
  }
  process.exit(withErrors.length ? 1 : 0);

}

main().catch((e) => { console.error(e); process.exit(1); });
