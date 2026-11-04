// Country photo GALLERY — ingest. See docs/adr/0006-country-photo-gallery.md.
//
// The hero pipeline (fetch-country-photos.js), widened from one image per
// country to a handful of LANDMARKS: the country's UNESCO World Heritage Sites
// (Wikidata P1435 = Q9259, located in the country via P17) that have a
// representative image (P18), ranked by how many Wikipedias cover them
// (sitelinks) and capped at GALLERY_MAX. Stable for the same reason P18 is:
// the same query returns the same places and the same images run after run,
// which is what makes ingest idempotent and review finite — this is never an
// image search of the day.
//
// Every guarantee the hero has, unchanged:
//   · RE-HOSTED: a 1600px Commons rendition is uploaded to our bucket; the
//     row's url is ours, never a hotlink.
//   · LICENSED: author / license / license_url / source_url are structured
//     columns, and a row missing an author or licence can never be approved
//     (mediaPolicy.isPublishable, enforced by approve-country-media.js).
//   · REVIEWED AT THE DATABASE: every row is written status='pending', which
//     RLS hides from the app entirely. Nothing displays until a human approves.
//   · IDEMPOTENT per landmark (country + Wikidata Q-id): an unchanged image is
//     skipped; a CHANGED image replaces the object and resets the row to
//     'pending' — a new photo is a new review.
//
// Run (needs the secret key; local stack or production):
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run media:gallery -- pe eg jp
//   npm run media:gallery -- --dry-run pe          (no key; writes nothing)
import { COUNTRIES } from "../src/data/countries.js";
import {
  GALLERY_KIND,
  GALLERY_MAX,
  SOURCE_IMAGE_WIDTH,
  commonsFileTitle,
  commonsSourceUrl,
  attributionFromExtMetadata,
  galleryObjectPath,
  storagePublicUrl,
  contentTypeFor,
  mediaRowFromCommons,
  isPublishable,
  formatPhotoCredit,
} from "../src/game/mediaPolicy.js";
import { requireServiceConfig } from "./lib/env.mjs";
import { announceTarget } from "./lib/target-banner.mjs";

const BUCKET = "country-media";
const UA = "Worldwise/0.1 (geography learning app; contact via github.com/danny-slickrock/worldwise)";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const force = args.includes("--force");
const codes = args.filter((a) => !a.startsWith("--")).map((c) => c.toLowerCase());
if (!codes.length) {
  console.error("usage: npm run media:gallery -- [--dry-run] [--force] <iso2>...");
  process.exit(1);
}

const config = dryRun ? { url: null, serviceKey: null } : requireServiceConfig("npm run media:gallery");
const restUrl = config.url ? `${config.url}/rest/v1` : null;
const contentHeaders = config.serviceKey
  ? {
      apikey: config.serviceKey,
      Authorization: `Bearer ${config.serviceKey}`,
      "Accept-Profile": "content",
      "Content-Profile": "content",
    }
  : null;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// The country's World Heritage Sites with an image, most-covered first.
async function landmarks(isos) {
  const values = isos.map((i) => `"${i.toUpperCase()}"`).join(" ");
  const query = `SELECT ?iso ?site ?siteLabel ?image ?links WHERE {
    VALUES ?iso { ${values} }
    ?c wdt:P297 ?iso .
    ?site wdt:P1435 wd:Q9259 ; wdt:P17 ?c ; wdt:P18 ?image ; wikibase:sitelinks ?links .
    SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
  }`;
  const res = await fetch("https://query.wikidata.org/sparql", {
    method: "POST",
    headers: {
      "User-Agent": UA,
      Accept: "application/sparql-results+json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ query }),
  });
  if (!res.ok) throw new Error(`Wikidata HTTP ${res.status}: ${await res.text()}`);
  const rows = (await res.json()).results.bindings;
  const bySite = new Map();
  for (const r of rows) {
    const iso = r.iso.value.toLowerCase();
    const entity = r.site.value.split("/").pop();
    const key = `${iso}|${entity}`;
    // A site with several P18 values: keep the first, deterministically sorted
    // below, so a re-run picks the same one.
    const prev = bySite.get(key);
    const image = r.image.value;
    if (!prev || image < prev.image) {
      bySite.set(key, { iso, entity, title: r.siteLabel.value, image, links: Number(r.links.value) });
    }
  }
  const out = {};
  for (const s of bySite.values()) (out[s.iso] ??= []).push(s);
  for (const iso of Object.keys(out)) {
    // Most-covered first; ties broken by Q-id so the order is fully stable.
    out[iso].sort((a, b) => b.links - a.links || a.entity.localeCompare(b.entity));
    // A site whose label is just its Q-id has no English name to caption it.
    out[iso] = out[iso].filter((s) => !/^Q\d+$/.test(s.title)).slice(0, GALLERY_MAX);
  }
  return out;
}

async function commonsImageInfo(titles) {
  const out = {};
  for (let i = 0; i < titles.length; i += 50) {
    const batch = titles.slice(i, i + 50);
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
    if (!res.ok) throw new Error(`Commons HTTP ${res.status}`);
    const json = await res.json();
    // Commons normalises titles ("File:A_b.jpg" -> "File:A b.jpg"); map back.
    const norm = new Map((json.query?.normalized ?? []).map((n) => [n.to, n.from]));
    for (const page of json.query?.pages ?? []) {
      const info = page.imageinfo?.[0];
      if (info) out[norm.get(page.title) ?? page.title] = info;
    }
    await sleep(300);
  }
  return out;
}

async function existingGalleryRows(code) {
  const res = await fetch(
    `${restUrl}/country_media?kind=eq.${GALLERY_KIND}&country_code=eq.${code}` +
      "&select=id,source_entity,source_url,status",
    { headers: contentHeaders }
  );
  if (!res.ok) throw new Error(`Reading gallery rows failed (HTTP ${res.status}): ${await res.text()}`);
  return new Map((await res.json()).map((r) => [r.source_entity, r]));
}

async function uploadObject(objectPath, bytes, contentType) {
  const res = await fetch(`${config.url}/storage/v1/object/${BUCKET}/${objectPath}`, {
    method: "POST",
    headers: {
      apikey: config.serviceKey,
      Authorization: `Bearer ${config.serviceKey}`,
      "Content-Type": contentType,
      "x-upsert": "true",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
    body: bytes,
  });
  if (!res.ok) throw new Error(`Storage upload failed (HTTP ${res.status}): ${await res.text()}`);
}

async function writeRow(row, existingId) {
  const url = existingId ? `${restUrl}/country_media?id=eq.${existingId}` : `${restUrl}/country_media`;
  const res = await fetch(url, {
    method: existingId ? "PATCH" : "POST",
    headers: { ...contentHeaders, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(row),
  });
  if (!res.ok) {
    const body = await res.text();
    const hint = /column .*(title|position|source_entity)/i.test(body)
      ? "\nThe gallery migration (20261104150000) hasn't been applied to this database."
      : "";
    throw new Error(`Writing ${row.country_code} ${row.source_entity} failed (HTTP ${res.status}): ${body}${hint}`);
  }
}

// A gallery pulls several images per country, so Wikimedia's upload servers
// do rate-limit it (HTTP 429). Back off and retry, honouring Retry-After.
async function download(url) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (res.ok) return Buffer.from(await res.arrayBuffer());
    if (res.status !== 429 && res.status < 500) {
      throw new Error(`Download failed (HTTP ${res.status}): ${url}`);
    }
    const wait = Number(res.headers.get("retry-after")) * 1000 || 4000 * 2 ** attempt;
    console.log(`      (rate-limited, retrying in ${Math.round(wait / 1000)}s)`);
    await sleep(wait);
  }
  throw new Error(`Download kept failing (rate-limited): ${url}`);
}

async function main() {
  const known = new Set(COUNTRIES.map((c) => c.code));
  for (const c of codes) if (!known.has(c)) console.warn(`  ! unknown country code: ${c}`);
  if (dryRun) console.log("\nDRY RUN — nothing is uploaded or written.\n");
  else announceTarget(config.url);

  const sites = await landmarks(codes);
  const allTitles = Object.values(sites)
    .flat()
    .map((s) => commonsFileTitle(s.image))
    .filter(Boolean);
  const info = await commonsImageInfo([...new Set(allTitles)]);

  let written = 0;
  let unchanged = 0;
  let unpublishable = 0;
  for (const code of codes) {
    const list = sites[code] ?? [];
    const name = COUNTRIES.find((c) => c.code === code)?.name ?? code;
    console.log(`\n${code}  ${name} — ${list.length} landmark candidate(s)`);
    if (!list.length) {
      console.log("    (no World Heritage Site with an image — no gallery for now)");
      continue;
    }
    const existing = dryRun ? new Map() : await existingGalleryRows(code);
    for (const [position, site] of list.entries()) {
      const title = commonsFileTitle(site.image);
      const image = info[title];
      if (!image?.thumburl) {
        console.log(`  - ${site.title}: Commons returned no rendition for ${title}`);
        continue;
      }
      const attribution = attributionFromExtMetadata(image.extmetadata);
      const sourceUrl = commonsSourceUrl(title);
      const objectPath = galleryObjectPath(code, site.entity, image.thumburl);
      const row = mediaRowFromCommons({
        code,
        kind: GALLERY_KIND,
        url: storagePublicUrl(config.url ?? "https://<project>.supabase.co", BUCKET, objectPath),
        storagePath: objectPath,
        sourceUrl,
        author: attribution.author,
        license: attribution.license,
        licenseUrl: attribution.licenseUrl,
        width: image.thumbwidth,
        height: image.thumbheight,
        title: site.title,
        position,
        sourceEntity: site.entity,
      });
      const publishable = isPublishable(row);
      if (!publishable) unpublishable++;
      const credit = formatPhotoCredit(row) ?? "NO CREDIT — cannot be approved";
      const mark = publishable ? " " : "!";
      if (dryRun) {
        console.log(`${mark} ${position + 1}. ${site.title}  (${site.entity}, ${site.links} sitelinks)`);
        console.log(`      ${credit}`);
        console.log(`      ${sourceUrl}`);
        continue;
      }
      const prior = existing.get(site.entity);
      if (prior && prior.source_url === sourceUrl && !force) {
        unchanged++;
        continue;
      }
      await uploadObject(objectPath, await download(image.thumburl), contentTypeFor(image.thumburl));
      // A changed image is a new review: status goes back to pending.
      await writeRow(row, prior?.id ?? null);
      const note = prior ? (prior.status === "approved" ? " (image changed — reset to pending)" : " (redrafted)") : "";
      console.log(`${mark} ${position + 1}. ${site.title}${note}`);
      console.log(`      ${credit}`);
      written++;
      await sleep(1000);
    }
  }
  console.log(
    `\n${dryRun ? "Dry run" : "Done"}. ${written} drafted, ${unchanged} unchanged, ${unpublishable} un-creditable ('!').`
  );
  if (!dryRun) {
    console.log("Every row is status='pending' and invisible to the app until approved.");
    console.log("Review, then:  npm run media:approve -- --gallery --list");
  }
}

main().catch((err) => {
  console.error(`\n${err.message ?? err}`);
  process.exit(1);
});
