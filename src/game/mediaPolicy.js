// Country photos — every decision, none of the plumbing (see
// docs/adr/0002-country-photos.md).
//
// Pure by design, and load-bearingly so: this module is imported by BOTH ends
// of the photo pipeline. `scripts/fetch-country-photos.mjs` uses it in Node to
// turn a Wikimedia Commons API response into a content.country_media row, and
// the app uses it in React Native to turn that row back into something a
// country page can render. Keeping the two directions adjacent is what stops a
// credit line drifting away from the licence data it credits — the same reason
// contentSync.js holds both page↔row directions.
//
// No storage, no network, no React. test/engine.test.js drives all of it.

// The one representative image that leads a country page. 'landmark' is the
// future many-per-country kind; the hero is deliberately singular, and the
// migration enforces that with a partial unique index.
export const HERO_KIND = "hero";

// Width we ask Commons for. Big enough to look right on a desktop hero, small
// enough that 196 of them is a modest bucket — and it means the stored object
// is already a thumbnail, so the page is not dependent on Storage transforms
// (a Pro-plan feature) to avoid shipping a 4MB JPEG to a phone.
export const SOURCE_IMAGE_WIDTH = 1600;

// What we are willing to store. Anything else is skipped at ingest rather than
// uploaded and discovered later by a broken <Image>.
const ALLOWED_EXTENSIONS = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

// ---------------------------------------------------------------------------
// Wikidata / Commons → row
// ---------------------------------------------------------------------------

// A Wikidata P18 value is a Special:FilePath URL, not a file title:
//   http://commons.wikimedia.org/wiki/Special:FilePath/Rio%20de%20Janeiro.jpg
// The Commons API wants "File:Rio de Janeiro.jpg". Returns null for anything
// that isn't recognisably a Commons file reference, so a malformed claim is
// skipped rather than turned into a 404 fetch.
export function commonsFileTitle(p18Value) {
  if (typeof p18Value !== "string" || !p18Value.trim()) return null;
  const raw = p18Value.trim();

  // Already a title.
  if (/^File:/i.test(raw)) return normalizeFileTitle(raw.slice(5));

  const match = raw.match(/Special:FilePath\/(.+)$/);
  const name = match ? match[1] : null;
  if (!name) return null;

  let decoded;
  try {
    decoded = decodeURIComponent(name);
  } catch {
    // A stray % in a filename makes decodeURIComponent throw; the raw name is
    // still a usable title far more often than not.
    decoded = name;
  }
  return normalizeFileTitle(decoded);
}

function normalizeFileTitle(name) {
  // Commons stores underscores; the API accepts either, and spaces read better
  // in a log line and in the source URL we hand a reviewer.
  const clean = name.replace(/_/g, " ").trim();
  return clean ? `File:${clean}` : null;
}

// Where a reviewer (or a lawyer) goes to check the claim a row makes.
export function commonsSourceUrl(fileTitle) {
  if (!fileTitle) return null;
  return `https://commons.wikimedia.org/wiki/${encodeURIComponent(fileTitle.replace(/ /g, "_"))}`;
}

// Commons' extmetadata.Artist is HTML — typically an <a> to a user page, often
// with nested spans, occasionally a whole vCard. A credit line is plain text,
// so tags come out, entities are decoded, and whitespace is collapsed.
export function stripCommonsHtml(value) {
  if (typeof value !== "string") return null;
  const text = value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
  return text || null;
}

// Pull the three things a licence obligation actually needs out of Commons'
// extmetadata blob. Every field is optional upstream, so every field is
// nullable here — and `isPublishable()` below is what refuses to display a
// photo we cannot credit.
export function attributionFromExtMetadata(extmetadata) {
  const get = (key) => {
    const entry = extmetadata && typeof extmetadata === "object" ? extmetadata[key] : null;
    const value = entry && typeof entry === "object" ? entry.value : entry;
    return typeof value === "string" ? value : null;
  };

  return {
    author: stripCommonsHtml(get("Artist")),
    // LicenseShortName is the human string ("CC BY-SA 4.0", "Public domain").
    // `License` is the machine slug ("cc-by-sa-4.0") and is the fallback, upper-
    // cased, because a caption reading "cc-by-sa-4.0" looks like a bug.
    license:
      stripCommonsHtml(get("LicenseShortName")) || upperSlug(stripCommonsHtml(get("License"))),
    licenseUrl: stripCommonsHtml(get("LicenseUrl")),
  };
}

function upperSlug(slug) {
  if (!slug) return null;
  return slug.toUpperCase().replace(/-/g, " ");
}

// The Storage object key for one country's hero. Stable and derivable, so
// re-running the ingest overwrites the same object rather than accumulating a
// new one per run — the reason the script can be idempotent at all.
//
// The extension comes from the source URL rather than being assumed .jpg:
// Commons thumbnails of a PNG are PNGs, and a mislabelled object gets served
// with the wrong Content-Type.
export function storageObjectPath(code, sourceUrl, kind = HERO_KIND) {
  if (typeof code !== "string" || !/^[a-z]{2}$/.test(code)) return null;
  return `${kind}/${code}.${extensionFor(sourceUrl)}`;
}

export function extensionFor(sourceUrl) {
  const match =
    typeof sourceUrl === "string" ? sourceUrl.toLowerCase().match(/\.([a-z0-9]+)(?:$|\?)/) : null;
  const ext = match ? match[1] : null;
  return ext && ALLOWED_EXTENSIONS[ext] ? ext : "jpg";
}

export function contentTypeFor(sourceUrl) {
  return ALLOWED_EXTENSIONS[extensionFor(sourceUrl)];
}

// The public URL of a Storage object in a public bucket. Built here rather than
// read back from the upload response so the script and the tests agree on one
// shape, and so a bucket rename is a single edit.
export function storagePublicUrl(supabaseUrl, bucket, objectPath) {
  if (!supabaseUrl || !bucket || !objectPath) return null;
  const base = String(supabaseUrl).replace(/\/+$/, "");
  return `${base}/storage/v1/object/public/${bucket}/${objectPath}`;
}

// Assemble the content.country_media row. Everything it needs has already been
// resolved by the caller; this exists so the row's SHAPE is asserted in tests
// rather than living inline in a script nothing imports.
//
// `status` is not settable: a freshly ingested image is a draft, full stop.
export function mediaRowFromCommons({
  code,
  url,
  storagePath,
  sourceUrl,
  author = null,
  license = null,
  licenseUrl = null,
  width = null,
  height = null,
  kind = HERO_KIND,
}) {
  return {
    country_code: code,
    kind,
    url,
    storage_path: storagePath,
    source_url: sourceUrl ?? null,
    author: author ?? null,
    license: license ?? null,
    license_url: licenseUrl ?? null,
    width: positiveInt(width),
    height: positiveInt(height),
    status: "pending",
  };
}

function positiveInt(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

// May this row ever be shown? An image we cannot credit is a licensing
// problem, not a cosmetic one: CC BY and CC BY-SA both require attribution, and
// BY-SA requires the licence be named. The approval path checks this so a
// reviewer cannot publish an un-creditable photo by accident.
export function isPublishable(row) {
  if (!row || typeof row !== "object") return false;
  if (!row.url) return false;
  return Boolean(nonEmpty(row.author) && nonEmpty(row.license));
}

function nonEmpty(v) {
  return typeof v === "string" && v.trim().length > 0;
}

// ---------------------------------------------------------------------------
// Row → what the app renders
// ---------------------------------------------------------------------------

// The credit line, and the reason the licence obligation is met. One function,
// so no screen has to remember the wording — the same discipline as
// theme.js's onFill().
//
// Returns null when there is nothing creditable, which callers read as "render
// no caption" — but `isPublishable()` should have kept such a row unapproved
// long before it reached here.
export function formatPhotoCredit({ author, license } = {}) {
  const who = nonEmpty(author) ? author.trim() : null;
  const lic = nonEmpty(license) ? license.trim() : null;
  if (!who && !lic) return null;
  if (!who) return `Photo: Wikimedia (${lic})`;
  if (!lic) return `Photo: ${who} / Wikimedia`;
  return `Photo: ${who} / Wikimedia (${lic})`;
}

// Pick the hero out of whatever country_media rows came back with a country,
// and reshape it for the UI.
//
// Defensive about status even though RLS already hides pending rows: the same
// function runs against a service-role fetch in the review script, where every
// row is visible.
export function heroFromMediaRows(rows) {
  if (!Array.isArray(rows)) return null;
  const row = rows.find(
    (r) => r && r.kind === HERO_KIND && (r.status == null || r.status === "approved")
  );
  if (!row || !row.url) return null;

  return {
    url: row.url,
    author: row.author ?? null,
    license: row.license ?? null,
    licenseUrl: row.license_url ?? null,
    sourceUrl: row.source_url ?? null,
    width: positiveInt(row.width),
    height: positiveInt(row.height),
    // Pre-composed rather than left to the screen, so the credit is identical
    // everywhere the photo appears.
    credit: formatPhotoCredit(row),
  };
}

// Supabase Storage can resize and re-encode on the fly, which is how one stored
// 1600px original serves a phone without shipping all of it. The endpoint
// differs from the plain object endpoint by one path segment.
//
// This is an OPTIMISATION, never a dependency: image transformation is a
// Pro-plan feature, so the caller must fall back to the untransformed `url` if
// a request for a variant fails. That is why this returns the input unchanged
// for anything it doesn't recognise, rather than constructing a URL that might
// not resolve.
export function imageVariantUrl(url, { width, quality = 75 } = {}) {
  if (typeof url !== "string" || !url.includes("/storage/v1/object/public/")) return url ?? null;
  const w = Number(width);
  if (!Number.isFinite(w) || w <= 0) return url;

  const rendered = url.replace("/storage/v1/object/public/", "/storage/v1/render/image/public/");
  const q = Number.isFinite(Number(quality))
    ? Math.min(100, Math.max(20, Math.round(Number(quality))))
    : 75;
  // resize=cover matches how the hero is displayed (a fixed-ratio crop), so the
  // transform and the layout can't disagree about aspect ratio.
  return `${rendered}?width=${Math.round(w)}&quality=${q}&resize=cover`;
}

// Which pixel width to ask for, given the layout width the hero will occupy.
// Snapped to a small ladder rather than passed through raw: a continuous width
// would mint a new CDN cache entry for every viewport, which is slower for
// everyone and free for no one.
export const IMAGE_WIDTH_LADDER = [400, 640, 960, 1280, 1600];

export function heroImageWidth(layoutWidth, pixelRatio = 1) {
  const target = Number(layoutWidth) * (Number(pixelRatio) || 1);
  if (!Number.isFinite(target) || target <= 0) return IMAGE_WIDTH_LADDER[0];
  return (
    IMAGE_WIDTH_LADDER.find((w) => w >= target) ?? IMAGE_WIDTH_LADDER[IMAGE_WIDTH_LADDER.length - 1]
  );
}
