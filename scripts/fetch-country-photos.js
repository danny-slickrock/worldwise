// Country hero photos — ingest. See docs/adr/0002-country-photos.md.
//
// For each country: resolve its Wikidata entity from the ISO 3166-1 alpha-2
// code we already store (P297), read the canonical representative image (P18),
// pull the Commons licensing metadata, download a 1600px rendition, upload it
// to the `country-media` Storage bucket, and write a content.country_media row.
//
// EVERY ROW IS WRITTEN status='pending'. RLS hides pending rows from the app
// entirely, so running this against production shows nothing to anyone until a
// human approves specific countries (npm run media:approve). That is the point:
// P18 is a community-curated *draft*, and this is a product used by children.
//
// Idempotent. A country whose stored row already points at the same Commons
// file is skipped, so a re-run costs a few API calls and nothing else. When the
// upstream image HAS changed, the object is replaced and the row is reset to
// 'pending' — a new photo is a new review, and inheriting the old approval
// would put an unreviewed image on the page through the back door.
//
// Run (from your own terminal — it needs the secret key):
//
//   SUPABASE_SERVICE_ROLE_KEY=sb_secret_... npm run media:photos
//   SUPABASE_SERVICE_ROLE_KEY=sb_secret_... npm run media:photos -- br cl jp
//   npm run media:photos -- --dry-run br        (no key needed; writes nothing)
//
// Flags:  --dry-run   resolve + report, upload and write nothing
//         --force     re-upload and re-draft even if the row is unchanged
//         --limit N   stop after N countries (a cheap first pass)
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { COUNTRIES } from "../src/data/countries.js";
import {
  HERO_KIND,
  SOURCE_IMAGE_WIDTH,
  commonsFileTitle,
  commonsSourceUrl,
  attributionFromExtMetadata,
  storageObjectPath,
  storagePublicUrl,
  contentTypeFor,
  mediaRowFromCommons,
  isPublishable,
  formatPhotoCredit,
} from "../src/game/mediaPolicy.js";
import { requireServiceConfig } from "./lib/env.mjs";
import { announceTarget } from "./lib/target-banner.mjs";

const BUCKET = "country-media";
const CACHE_FILE = "content-sources/raw/_wikidata-country-images.json";
const UA =
  "Worldwise/0.1 (geography learning app; contact via github.com/danny-slickrock/worldwise)";
// Commons accepts up to 50 titles per query for a non-bot client.
const TITLE_BATCH = 50;

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const force = args.includes("--force");
const limitArg = args.findIndex((a) => a === "--limit");
const limit = limitArg >= 0 ? Number(args[limitArg + 1]) : null;
const only = args
  .filter((a, i) => !a.startsWith("--") && !(limitArg >= 0 && i === limitArg + 1))
  .map((c) => c.toLowerCase());

// ---------------------------------------------------------------------------
// Config. --dry-run resolves upstream data only, so it deliberately does not
// require the secret key: anyone can inspect what WOULD be ingested.
// ---------------------------------------------------------------------------
const config = dryRun
  ? { url: null, serviceKey: null }
  : requireServiceConfig("npm run media:photos");

const restUrl = config.url ? `${config.url}/rest/v1` : null;
const contentHeaders = config.serviceKey
  ? {
      apikey: config.serviceKey,
      Authorization: `Bearer ${config.serviceKey}`,
      "Accept-Profile": "content",
      "Content-Profile": "content",
    }
  : null;

// ---------------------------------------------------------------------------
// Wikidata: one SPARQL query for all 196, not 196 lookups.
//
// P297 is the ISO 3166-1 alpha-2 code — the same key content.countries is
// keyed on — and P18 is the entity's representative image. Cached to
// content-sources/raw/ alongside the other upstream snapshots, so re-runs and
// --dry-run cost the endpoint nothing.
// ---------------------------------------------------------------------------
const SPARQL = `
SELECT ?iso ?item ?itemLabel ?image WHERE {
  ?item wdt:P297 ?iso .
  ?item wdt:P18 ?image .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}`;

async function wikidataImages() {
  if (!force && existsSync(CACHE_FILE)) {
    return JSON.parse(await readFile(CACHE_FILE, "utf8"));
  }

  console.log("Querying Wikidata for P18 (representative image) by ISO code...");
  const res = await fetch("https://query.wikidata.org/sparql", {
    method: "POST",
    headers: {
      "User-Agent": UA,
      Accept: "application/sparql-results+json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ query: SPARQL }),
  });
  if (!res.ok) throw new Error(`Wikidata HTTP ${res.status}: ${await res.text()}`);

  const json = await res.json();
  const byIso = {};
  for (const row of json.results.bindings) {
    const iso = row.iso?.value?.toLowerCase();
    if (!iso || byIso[iso]) continue; // first claim wins; P18 is rarely multi-valued
    byIso[iso] = {
      entity: row.item?.value ?? null,
      label: row.itemLabel?.value ?? null,
      image: row.image?.value ?? null,
    };
  }

  await mkdir(path.dirname(CACHE_FILE), { recursive: true });
  await writeFile(CACHE_FILE, `${JSON.stringify(byIso, null, 2)}\n`);
  console.log(`  cached ${Object.keys(byIso).length} entries → ${CACHE_FILE}`);
  return byIso;
}

// ---------------------------------------------------------------------------
// Commons: licensing metadata + a resized rendition, batched by title.
// ---------------------------------------------------------------------------
async function commonsImageInfo(titles) {
  const out = {};
  for (let i = 0; i < titles.length; i += TITLE_BATCH) {
    const batch = titles.slice(i, i + TITLE_BATCH);
    const url =
      "https://commons.wikimedia.org/w/api.php?" +
      new URLSearchParams({
        action: "query",
        format: "json",
        formatversion: "2",
        prop: "imageinfo",
        iiprop: "url|size|extmetadata|mime",
        iiurlwidth: String(SOURCE_IMAGE_WIDTH),
        titles: batch.join("|"),
      });

    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (!res.ok) throw new Error(`Commons HTTP ${res.status}: ${await res.text()}`);
    const json = await res.json();

    for (const page of json.query?.pages ?? []) {
      const info = page.imageinfo?.[0];
      if (!info) continue;
      out[page.title] = info;
    }
    // Courtesy, not a rate limit we've hit. 196 countries is four batches.
    if (i + TITLE_BATCH < titles.length) await sleep(300);
  }
  return out;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// Supabase IO. Plain fetch rather than supabase-js, for the same reason
// seed-content.js gives: the client always opens a realtime connection, which
// needs a global WebSocket Node doesn't reliably have, and this needs HTTP.
// ---------------------------------------------------------------------------
async function existingHeroRows() {
  const res = await fetch(
    `${restUrl}/country_media?kind=eq.${HERO_KIND}&select=id,country_code,url,source_url,status`,
    { headers: contentHeaders }
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `Reading existing hero rows failed (HTTP ${res.status}):\n${body}\n${explain(res.status, body)}`
    );
  }
  const rows = await res.json();
  return new Map(rows.map((r) => [r.country_code, r]));
}

async function uploadObject(objectPath, bytes, contentType) {
  const res = await fetch(`${config.url}/storage/v1/object/${BUCKET}/${objectPath}`, {
    method: "POST",
    headers: {
      apikey: config.serviceKey,
      Authorization: `Bearer ${config.serviceKey}`,
      "Content-Type": contentType,
      // Replace in place, so a re-run overwrites one object rather than
      // accumulating a new one per run.
      "x-upsert": "true",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
    body: bytes,
  });
  if (!res.ok) {
    const body = await res.text();
    if (/Bucket not found/i.test(body)) {
      throw new Error(
        `Storage upload failed: bucket '${BUCKET}' does not exist.\n` +
          "Apply the country-media migration first (supabase db push)."
      );
    }
    throw new Error(`Storage upload failed (HTTP ${res.status}): ${body}`);
  }
}

async function writeRow(row, existingId) {
  const url = existingId
    ? `${restUrl}/country_media?id=eq.${existingId}`
    : `${restUrl}/country_media`;
  const res = await fetch(url, {
    method: existingId ? "PATCH" : "POST",
    headers: { ...contentHeaders, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(row),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `Writing ${row.country_code} failed (HTTP ${res.status}):\n${body}\n${explain(res.status, body)}`
    );
  }
}

function explain(status, body) {
  if (/permission denied/i.test(body)) {
    return "\nThat reads like a grants problem — confirm the migration applied and that this is the service-role (secret) key.";
  }
  if (status === 404 || /PGRST106|schema must be one of/i.test(body)) {
    return "\nThat reads like the `content` schema isn't exposed to the Data API.\nDashboard → Project Settings → API → Exposed schemas → add `content`.";
  }
  if (/country_media_kind_check|column .* does not exist/i.test(body)) {
    return "\nThat reads like the country-media review migration hasn't been applied yet.";
  }
  return "";
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  let countries = COUNTRIES.filter((c) => (only.length ? only.includes(c.code) : true));
  if (only.length) {
    const known = new Set(countries.map((c) => c.code));
    for (const code of only)
      if (!known.has(code)) console.warn(`  ! unknown country code: ${code}`);
  }
  if (Number.isFinite(limit) && limit > 0) countries = countries.slice(0, limit);

  if (dryRun) {
    console.log("\nDRY RUN — resolving upstream data only. Nothing is uploaded or written.\n");
  } else {
    announceTarget(config.url);
  }

  const images = await wikidataImages();

  // Resolve every Commons title up front so the batched API call is actually
  // batched, rather than one request per country.
  const resolved = [];
  const skipped = [];
  for (const country of countries) {
    const entry = images[country.code];
    const title = commonsFileTitle(entry?.image);
    if (!title) {
      skipped.push({ code: country.code, name: country.name, why: "no Wikidata P18 image" });
      continue;
    }
    resolved.push({ country, title });
  }

  const info = resolved.length
    ? await commonsImageInfo([...new Set(resolved.map((r) => r.title))])
    : {};

  const existing = dryRun ? new Map() : await existingHeroRows();

  let written = 0;
  let unchanged = 0;
  for (const { country, title } of resolved) {
    const image = info[title];
    if (!image?.thumburl) {
      skipped.push({
        code: country.code,
        name: country.name,
        why: `Commons returned no rendition for ${title}`,
      });
      continue;
    }

    const attribution = attributionFromExtMetadata(image.extmetadata);
    const sourceUrl = commonsSourceUrl(title);
    const objectPath = storageObjectPath(country.code, image.thumburl);
    const publicUrl = storagePublicUrl(
      config.url ?? "https://<project>.supabase.co",
      BUCKET,
      objectPath
    );

    const row = mediaRowFromCommons({
      code: country.code,
      url: publicUrl,
      storagePath: objectPath,
      sourceUrl,
      author: attribution.author,
      license: attribution.license,
      licenseUrl: attribution.licenseUrl,
      width: image.thumbwidth,
      height: image.thumbheight,
    });

    const credit = formatPhotoCredit(row) ?? "NO CREDIT — cannot be approved";
    const flag = isPublishable(row) ? " " : "!";

    if (dryRun) {
      console.log(`${flag} ${country.code}  ${country.name}`);
      console.log(`    ${title}`);
      console.log(`    ${credit}`);
      continue;
    }

    const prior = existing.get(country.code);
    if (prior && prior.source_url === sourceUrl && !force) {
      unchanged++;
      continue;
    }

    const bytes = await download(image.thumburl);
    await uploadObject(objectPath, bytes, contentTypeFor(image.thumburl));
    await writeRow(row, prior?.id ?? null);

    const note = prior
      ? prior.status === "approved"
        ? " (image changed — reset to pending)"
        : " (redrafted)"
      : "";
    console.log(`${flag} ${country.code}  ${country.name}${note}`);
    console.log(`    ${credit}`);
    written++;
    await sleep(120);
  }

  if (skipped.length) {
    console.log(`\nSkipped ${skipped.length}:`);
    for (const s of skipped) console.log(`  - ${s.code} ${s.name} — ${s.why}`);
  }

  if (dryRun) {
    console.log(`\nDry run complete. ${resolved.length} resolvable, ${skipped.length} skipped.`);
    console.log("Lines marked '!' have no author or licence and could never be approved.");
    return;
  }

  console.log(
    `\nDone. ${written} drafted, ${unchanged} already current, ${skipped.length} skipped.`
  );
  console.log("Every row is status='pending' and invisible to the app until approved.");
  console.log("Review, then:  npm run media:approve -- <iso2>...");
}

async function download(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`Download failed (HTTP ${res.status}): ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

main().catch((err) => {
  console.error(`\n${err.message ?? err}`);
  process.exit(1);
});
