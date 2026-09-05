// M2.9 content enrichment — step 2: scaffold reviewable per-country drafts.
//
// Splits the work by who can be trusted with what:
//   `structured`  is derived from the cached raw sources by this script alone.
//   Deterministic, never hand-typed, and overwritten on every run — so a
//   Wikidata correction propagates without anyone re-keying a number.
//
//   `prose`       is model-authored from the Factbook text and is PRESERVED on
//   re-run. That asymmetry is the point: re-fetching sources must never silently
//   clobber prose a human has already reviewed and approved.
//
// The `_sourceExcerpts` block carries the Factbook text each prose field is
// drafted from, so the reviewer can check a claim against its source inside the
// same diff instead of going hunting.
//
// Run:  node scripts/draft-country-content.mjs br jp ng is in cl
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { parseBorderNames, resolveBorderName } from "../src/data/borderAliases.js";
import { COUNTRIES } from "../src/data/countries.js";

// Name -> ISO from BOTH naming systems, because neither alone is enough. Our
// dataset says "China"; Wikidata's label is "People's Republic of China"; the
// Factbook writes "China". Indexing only Wikidata labels silently dropped
// China from India's borders on the first run over the full corpus.
async function buildNameIndex() {
  const map = new Map();
  for (const c of COUNTRIES) map.set(c.name.toLowerCase(), c.code);
  const files = (await readdir(RAW_DIR)).filter((f) => f.endsWith(".json") && !f.startsWith("_"));
  for (const f of files) {
    const d = JSON.parse(await readFile(path.join(RAW_DIR, f), "utf8"));
    if (d?.wikidata?.name && d?.iso && !map.has(d.wikidata.name.toLowerCase())) {
      map.set(d.wikidata.name.toLowerCase(), d.iso);
    }
  }
  return map;
}

const RAW_DIR = "content-sources/raw";
const DRAFT_DIR = "content-sources/drafts";

const codes = process.argv.slice(2).map((c) => c.toLowerCase());
if (!codes.length) {
  console.error("usage: node scripts/draft-country-content.mjs <iso2>...");
  process.exit(1);
}

// Factbook prose arrives with HTML entities and stray <p> tags from the source
// conversion. Left alone these reach the model as literal "Esp&iacute;rita",
// which it would faithfully carry into published text.
function clean(text) {
  if (!text) return null;
  return String(text)
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&iacute;/g, "í").replace(/&eacute;/g, "é").replace(/&aacute;/g, "á")
    .replace(/&oacute;/g, "ó").replace(/&uacute;/g, "ú").replace(/&ntilde;/g, "ñ")
    .replace(/&ccedil;/g, "ç").replace(/&atilde;/g, "ã").replace(/&otilde;/g, "õ")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    // The Factbook's notes fields carry "note 1:" / "note 2:" markers that
    // survive tag stripping and would otherwise reach the model as text.
    .replace(/\bnote\s*\d*\s*:/gi, " ")
    .replace(/\s+/g, " ")
    .trim() || null;
}

const t = (node) => clean(node?.text);

// Land borders, from the Factbook's explicit field rather than Wikidata P47 —
// which counts maritime borders and would give Japan six neighbours. Absence of
// the field is meaningful: it means no land border, which is a fact worth
// stating rather than a gap.
// Resolve land borders into three lists, because they answer different needs:
// codes drive the app's neighbour relations, names drive prose, and territories
// must be named accurately without ever being called countries.
function landBorders(fb, BY_NAME) {
  const raw = t(fb?.Geography?.["Land boundaries"]?.["border countries"]);
  const names = parseBorderNames(raw);
  const codes = [];
  const countries = [];
  const territories = [];
  const unknown = [];
  for (const n of names) {
    const r = resolveBorderName(n, BY_NAME);
    if (!r.known) unknown.push(n);
    else if (r.code) { codes.push(r.code); countries.push(n); }
    else territories.push(n);
  }
  return { names, codes, countries, territories, unknown };
}

async function main() {
  await mkdir(DRAFT_DIR, { recursive: true });
  const BY_NAME = await buildNameIndex();

  for (const iso of codes) {
    const rawPath = path.join(RAW_DIR, `${iso}.json`);
    if (!existsSync(rawPath)) {
      console.error(`  ${iso}: no cached source — run fetch-country-sources.mjs first`);
      continue;
    }
    const raw = JSON.parse(await readFile(rawPath, "utf8"));
    const w = raw.wikidata;
    const fb = raw.factbook ?? {};
    const geo = fb.Geography ?? {};
    const people = fb["People and Society"] ?? {};
    const econ = fb.Economy ?? {};

    const draftPath = path.join(DRAFT_DIR, `${iso}.json`);
    const existing = existsSync(draftPath) ? JSON.parse(await readFile(draftPath, "utf8")) : null;

    const borders = landBorders(fb, BY_NAME);
    const structured = {
      code: iso,
      name: w.name,
      capital: w.capital,
      continent: w.continent,
      areaKm2: w.areaKm2,
      population: w.population,
      officialLanguages: w.officialLanguages,
      currencies: w.currencies,
      landBorderNames: borders.countries,
      landBorderCodes: borders.codes,
      // Named separately and never given a code. French Guiana is France's, not a
      // country Brazil borders — the distinction the pilot review caught.
      landBorderTerritories: borders.territories,
      landBorderUnresolved: borders.unknown,
      naturalResources: t(geo["Natural resources"]),
      _source: "wikidata (CC0); landBorders + naturalResources from CIA World Factbook (public domain)",
    };

    // Every prose field the drafter may write, each with the source text it must
    // be traceable to. An empty string means "not yet drafted".
    const proseFields = {
      // The "why it matters" hook deliberately does NOT draft from
      // Introduction > Background. That field is almost entirely political
      // history — coups, colonial administration, military regimes — which this
      // pass defers (for sequencing, per the response policy). Drafting a hook
      // from it would smuggle exactly the content we scoped out.
      //
      // Instead the hook draws on the uncontested material: where the country
      // sits, what it is made of, what it sends to the world. Background stays
      // cached in the raw source for the later history pass.
      hook: {
        from: "Geography > Location, Terrain, Natural resources; Economy > Exports",
        excerpt: [
          t(geo.Location),
          t(geo.Terrain),
          t(geo["Geography - note"]),
          t(geo["Natural resources"]) && `Resources: ${t(geo["Natural resources"])}`,
          t(econ["Exports - commodities"]) && `Exports: ${t(econ["Exports - commodities"])}`,
        ].filter(Boolean).join(" || "),
      },
      physicalGeography: {
        from: "Geography > Terrain, Location, Elevation",
        excerpt: [t(geo.Terrain), t(geo.Location), t(geo.Elevation)].filter(Boolean).join(" || "),
      },
      climate: {
        from: "Geography > Climate",
        excerpt: [t(geo.Climate), t(geo["Natural hazards"])].filter(Boolean).join(" || "),
      },
      economy: {
        from: "Economy > Economic overview, Exports, Industries",
        excerpt: [
          t(econ["Economic overview"]),
          t(econ["Exports - commodities"]) && `Exports: ${t(econ["Exports - commodities"])}`,
          t(econ.Industries) && `Industries: ${t(econ.Industries)}`,
        ].filter(Boolean).join(" || "),
      },
      peopleAndCulture: {
        from: "People and Society > Languages, Religions, Ethnic groups, Urbanization",
        excerpt: [
          t(people.Languages), t(people.Religions), t(people["Ethnic groups"]), t(people.Urbanization),
        ].filter(Boolean).join(" || "),
      },
    };

    const prose = {};
    const excerpts = {};
    for (const [key, meta] of Object.entries(proseFields)) {
      // Preserve anything already written. This is what makes a re-fetch safe.
      prose[key] = existing?.prose?.[key] ?? "";
      excerpts[key] = meta;
    }

    const draft = {
      iso,
      status: existing?.status ?? "draft",
      scaffoldedAt: existing?.scaffoldedAt ?? new Date().toISOString(),
      structured,
      prose,
      proseSources: Object.fromEntries(
        Object.entries(proseFields).map(([k, v]) => [k, v.from])
      ),
      _sourceExcerpts: excerpts,
    };

    await writeFile(draftPath, JSON.stringify(draft, null, 2) + "\n");
    const written = Object.values(prose).filter(Boolean).length;
    console.log(
      `  ${iso}: ${w.name} — ${written}/${Object.keys(prose).length} prose` +
        `, borders=${structured.landBorderCodes.length}` +
        (structured.landBorderTerritories.length ? `+${structured.landBorderTerritories.length}terr` : "") +
        (structured.landBorderUnresolved.length ? ` UNRESOLVED:${structured.landBorderUnresolved.join(",")}` : "")
    );
  }
  console.log("\nDrafts in content-sources/drafts/ — prose fields are authored, not generated here.");

}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
