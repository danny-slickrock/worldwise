// Fetch the globe's terrain basemap and bake it into a bundled asset.
//
// Run:  node scripts/build-globe-texture.mjs
//
// The source is NASA's Blue Marble composite, mirrored on Wikimedia Commons as
// "Whole world - land and oceans" (8192x4096, PUBLIC DOMAIN — a work of the US
// federal government, so no attribution obligation, though the credit is
// recorded anyway). It is an equirectangular projection, which is the one
// projection the globe can resample cheaply: pixel x maps linearly to longitude
// and pixel y linearly to latitude, so a lookup is two multiplies.
//
// Committed rather than fetched at runtime, deliberately, and this is the one
// place the repo's "prefer runtime data sources over large embedded assets"
// rule is knowingly broken: the basemap is not enrichment, it IS the globe, and
// a globe that renders only when online would fail the offline promise the
// content layer works hard to keep. The cost is bounded — one file, checked
// here — and the fallback is the classified per-country fills.
import { mkdir, writeFile, stat } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";

const run = promisify(execFile);

const TITLE = "File:Whole world - land and oceans.jpg";
// 4096 across is one texel per ~0.088° of longitude. At 1x zoom that is far
// more than the screen can show, which is the point: the detail is spent on
// ZOOM. A hemisphere fills roughly 800 device pixels, so 4096 holds a clean
// image out to about 5x before the source itself becomes the limit.
//
// It costs ~800 KB against ~360 KB for 2048. That is the single largest thing
// the app bundles and it is a deliberate trade: the globe is the product, it
// is cached after first load, and a soft basemap the moment anyone zooms was
// the complaint this replaced.
const WIDTH = 4096;
const OUT_DIR = "assets/globe";
const OUT = path.join(OUT_DIR, "earth-relief.jpg");
// A bundled asset that grows without anyone noticing is how an app gets heavy.
const MAX_BYTES = 900 * 1024;
const UA = "Worldwise/0.1 (geography learning app; contact via github.com/danny-slickrock/worldwise)";

async function main() {
  const url =
    "https://commons.wikimedia.org/w/api.php?" +
    new URLSearchParams({
      action: "query",
      format: "json",
      formatversion: "2",
      prop: "imageinfo",
      iiprop: "url|size|extmetadata",
      iiurlwidth: String(WIDTH),
      titles: TITLE,
    });

  const meta = await (await fetch(url, { headers: { "User-Agent": UA } })).json();
  const info = meta.query?.pages?.[0]?.imageinfo?.[0];
  if (!info?.thumburl) throw new Error(`Commons returned no rendition for ${TITLE}`);

  const licence = info.extmetadata?.LicenseShortName?.value ?? "unknown";
  console.log(`Source : ${TITLE}`);
  console.log(`Licence: ${licence}`);
  console.log(`Size   : ${info.thumbwidth}x${info.thumbheight}`);
  if (!/public domain/i.test(licence)) {
    // A CC-BY basemap would need a visible credit on every globe, which is a
    // product decision rather than a build one. Stop rather than quietly
    // shipping an attribution obligation nobody has been told about.
    throw new Error("Refusing: the basemap must be public domain. Pick another source.");
  }

  const bytes = Buffer.from(
    await (await fetch(info.thumburl, { headers: { "User-Agent": UA } })).arrayBuffer()
  );
  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(OUT, bytes);

  // Commons honours iiurlwidth as a MINIMUM, not an exact size — it served a
  // 3840px rendition for a 2048px request — so the resample is done here rather
  // than trusted upstream. sips ships with macOS and is the only image tool
  // this repo can assume.
  try {
    await run("sips", ["--resampleWidth", String(WIDTH), OUT, "--out", OUT]);
    await run("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "50", OUT, "--out", OUT]);
  } catch {
    console.warn("  (sips unavailable — keeping the original encoding and size)");
  }

  const { size } = await stat(OUT);
  console.log(`\nWrote ${OUT} — ${(size / 1024).toFixed(0)} KB`);
  if (size > MAX_BYTES) {
    throw new Error(
      `That is over the ${(MAX_BYTES / 1024).toFixed(0)} KB budget for a bundled asset. ` +
        "Lower WIDTH or the JPEG quality."
    );
  }
  console.log("The globe bundles this; nothing fetches it at runtime.");
}

main().catch((err) => {
  console.error(`\n${err.message ?? err}`);
  process.exit(1);
});
