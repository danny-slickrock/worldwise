// Drives the draft-content Edge Function over the scaffolded drafts.
//
// The split exists to keep ANTHROPIC_API_KEY in Edge secrets and nowhere else:
// this script sends source excerpts up, the function calls Claude, and the
// prose comes back here to be written into content-sources/drafts/<iso>.json —
// so a git diff stays the review surface and nothing auto-publishes.
//
// Run:
//   SUPABASE_SERVICE_ROLE_KEY=sb_secret_... npm run content:generate
//   ONLY=jp SUPABASE_SERVICE_ROLE_KEY=... npm run content:generate
//   FORCE=1 SUPABASE_SERVICE_ROLE_KEY=... npm run content:generate   # redraft everything
//
// Resumable by default: a country whose prose is already written is skipped, so
// an interrupted run costs nothing to restart, and approved prose is never
// silently overwritten unless FORCE is set.
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const DRAFT_DIR = "content-sources/drafts";
const url = (
  process.env.SUPABASE_URL ??
  process.env.EXPO_PUBLIC_SUPABASE_URL ??
  "https://dqqeovezddeyzndrkksq.supabase.co"
).replace(/\/$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.INGEST_TOKEN;
const only = process.env.ONLY ? process.env.ONLY.toLowerCase().split(",") : null;
const force = Boolean(process.env.FORCE);
const limit = process.env.LIMIT ? Number(process.env.LIMIT) : Infinity;

if (!key) {
  console.error("SUPABASE_SERVICE_ROLE_KEY (or INGEST_TOKEN) is required.");
  console.error("  SUPABASE_SERVICE_ROLE_KEY=sb_secret_... npm run content:generate");
  process.exit(1);
}

const endpoint = `${url}/functions/v1/draft-content`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function draftOne(draft) {
  const excerpts = Object.fromEntries(
    Object.entries(draft._sourceExcerpts ?? {}).map(([k, v]) => [k, v.excerpt ?? ""])
  );
  const body = {
    name: draft.structured.name,
    // Only real countries are offered as borders. Territories are deliberately
    // withheld from this list so the model cannot describe one as a country;
    // it is told separately when a country has none.
    landBorders: draft.structured.landBorderNames ?? [],
    excerpts,
  };

  // Up to four attempts. A 429 from Anthropic and a transient 5xx are both
  // worth retrying; a 4xx from our own validation is not.
  for (let attempt = 1; attempt <= 4; attempt++) {
    let res, text;
    try {
      res = await fetch(endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      text = await res.text();
    } catch (err) {
      if (attempt === 4) return { error: `network: ${err.message}` };
      await sleep(attempt * 2000);
      continue;
    }

    let json = null;
    try { json = JSON.parse(text); } catch { /* handled below */ }

    if (res.ok && json?.prose) return { prose: json.prose, usage: json.usage, model: json.model };
    if (res.status >= 400 && res.status < 500 && res.status !== 429) {
      return { error: `HTTP ${res.status}: ${json?.error ?? text.slice(0, 160)}` };
    }
    if (attempt === 4) return { error: `HTTP ${res.status}: ${json?.error ?? text.slice(0, 160)}` };
    await sleep(attempt * 2500);
  }
  return { error: "exhausted retries" };
}

async function main() {
  const files = (await readdir(DRAFT_DIR)).filter((f) => f.endsWith(".json")).sort();
  const targets = files.filter((f) => !only || only.includes(f.replace(/\.json$/, "")));

  let drafted = 0, skipped = 0, failed = [];
  let inTok = 0, outTok = 0;

  for (const file of targets) {
    if (drafted >= limit) break;
    const p = path.join(DRAFT_DIR, file);
    const draft = JSON.parse(await readFile(p, "utf8"));
    const already = Object.values(draft.prose ?? {}).filter(Boolean).length;

    if (already && !force) { skipped += 1; continue; }

    const result = await draftOne(draft);
    if (result.error) {
      failed.push(`${draft.iso}: ${result.error}`);
      console.log(`  ${draft.iso}: FAILED — ${result.error}`);
      continue;
    }

    draft.prose = result.prose;
    draft.status = "drafted";
    draft.draftedAt = new Date().toISOString();
    draft.draftModel = result.model;
    await writeFile(p, JSON.stringify(draft, null, 2) + "\n");

    inTok += result.usage?.input_tokens ?? 0;
    outTok += result.usage?.output_tokens ?? 0;
    drafted += 1;
    const filled = Object.values(result.prose).filter(Boolean).length;
    process.stdout.write(`\r  drafted ${drafted} (${draft.iso} ${filled}/5 fields)   `);
  }

  // Sonnet 5 is $3/MTok in, $15/MTok out. Printed because a 196-country run is
  // the single largest model spend in the project so far and should not be a
  // surprise on a bill.
  const cost = (inTok / 1e6) * 3 + (outTok / 1e6) * 15;
  console.log(
    `\n\nDrafted ${drafted}, skipped ${skipped} already-written, ${failed.length} failed.` +
      `\nTokens: ${inTok} in / ${outTok} out — approx $${cost.toFixed(2)} on Sonnet.`
  );
  if (failed.length) {
    console.log("\nFailures:");
    for (const f of failed) console.log(`  - ${f}`);
    process.exit(1);
  }

}

main().catch((e) => { console.error(e); process.exit(1); });
