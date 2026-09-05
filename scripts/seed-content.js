// Repeatable seed: bundled JSON → content.countries (M2.3.5).
//
// The bundled dataset (src/data/countries.js + whyItMatters.js +
// countryPages.js) is the *seed source*, not a thing Postgres replaces. This
// script pushes it up; the app then reads from Postgres and falls back to the
// same bundled data when offline. Re-running is safe and idempotent — every
// row is upserted on `code`, so this is also how a content correction ships.
//
// Run:  npm run seed:content
//
// Requires a service-role key, because content.* grants no writes to anon or
// authenticated (see the migration). That key is a SECRET: it bypasses RLS
// entirely. It must never carry the EXPO_PUBLIC_ prefix, which would inline it
// into the client bundle and hand every visitor full database access.
//
//   SUPABASE_URL=https://<ref>.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=<secret key> \
//   npm run seed:content
//
// Both are also read from .env if present (SUPABASE_URL falls back to
// EXPO_PUBLIC_SUPABASE_URL, which is public and already there).
//
// This talks to PostgREST over plain fetch rather than through supabase-js on
// purpose. The client always constructs a realtime connection, which needs a
// global WebSocket that Node 20 doesn't have — it throws before the first row
// is written. A seed script needs exactly two HTTP calls, so the dependency
// bought nothing and cost portability across Node versions.
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { COUNTRIES } from "../src/data/countries.js";
import { getCountryPage } from "../src/data/countryPages.js";
import { countryRowFromPage } from "../src/game/contentSync.js";
import { announceTarget } from "./lib/target-banner.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..");

// PostgREST rejects an over-large payload and the CLI gets slow past a few
// hundred rows; 100 keeps each round trip small and the progress log useful.
const BATCH_SIZE = 100;

// ---------------------------------------------------------------------------
// Config. A tiny .env reader rather than a dotenv dependency — this is the only
// script that needs it, and Expo already loads .env for the app itself.
// ---------------------------------------------------------------------------
function readDotEnv() {
  const path = join(repoRoot, ".env");
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    // Strip one layer of surrounding quotes, which .env files commonly carry.
    out[trimmed.slice(0, eq).trim()] = trimmed
      .slice(eq + 1)
      .trim()
      .replace(/^["'](.*)["']$/, "$1");
  }
  return out;
}

const fileEnv = readDotEnv();
// Real environment wins over .env, so a one-off override doesn't need an edit.
const env = (key) => process.env[key] || fileEnv[key];

const url = env("SUPABASE_URL") || env("EXPO_PUBLIC_SUPABASE_URL");
const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");

if (!url || !serviceKey) {
  console.error(
    "Missing config.\n\n" +
      "  SUPABASE_URL                (or EXPO_PUBLIC_SUPABASE_URL — already in .env)\n" +
      "  SUPABASE_SERVICE_ROLE_KEY   Dashboard → Project Settings → API Keys → secret key\n\n" +
      "The service-role key bypasses RLS. Keep it out of .env.example, out of\n" +
      "version control, and never behind an EXPO_PUBLIC_ prefix.\n\n" +
      "  SUPABASE_SERVICE_ROLE_KEY=sb_secret_... npm run seed:content"
  );
  process.exit(1);
}

// PostgREST addresses a non-default schema through profile headers rather than
// the path: Accept-Profile selects it for reads, Content-Profile for writes.
const restUrl = `${url.replace(/\/$/, "")}/rest/v1`;
const baseHeaders = {
  apikey: serviceKey,
  Authorization: `Bearer ${serviceKey}`,
  "Accept-Profile": "content",
  "Content-Profile": "content",
};

// Decode the two failures we expect into the actual fix, rather than leaving a
// raw PostgREST code on screen. Both are traps this milestone already hit once.
function explain(status, body) {
  if (/permission denied/i.test(body)) {
    return (
      "That reads like a grants problem — confirm the migration applied, and that\n" +
      "this is the service-role (secret) key rather than the publishable one."
    );
  }
  if (status === 404 || /PGRST106|schema must be one of/i.test(body)) {
    return (
      "That reads like the `content` schema isn't exposed to the Data API.\n" +
      "Dashboard → Project Settings → API → Exposed schemas → add `content`.\n" +
      "(Locally, that's the [api] schemas list in supabase/config.toml.)"
    );
  }
  return null;
}

// ---------------------------------------------------------------------------
// Build the rows. getCountryPage() already merges the hand-authored entry with
// the base record and the whyItMatters blurb, so seeding through it guarantees
// Postgres holds exactly what the app renders offline today — no second merge
// rule that could drift from the first.
// ---------------------------------------------------------------------------
function buildRows() {
  const rows = [];
  for (const country of COUNTRIES) {
    const page = getCountryPage(country.code);
    if (!page) {
      console.warn(`  ! skipping ${country.code} — getCountryPage returned null`);
      continue;
    }
    rows.push(countryRowFromPage(page, country.difficulty));
  }
  return rows;
}

async function main() {
  const rows = buildRows();
  announceTarget(url);
  console.log(`Seeding ${rows.length} countries → content.countries`);

  let written = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    // merge-duplicates is PostgREST's upsert: conflicting `code` rows are
    // updated rather than rejected, which is what makes re-running safe.
    const res = await fetch(`${restUrl}/countries`, {
      method: "POST",
      headers: {
        ...baseHeaders,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(batch),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`\nFailed on the batch starting at row ${i} (HTTP ${res.status}):\n${body}`);
      const hint = explain(res.status, body);
      if (hint) console.error(`\n${hint}`);
      process.exit(1);
    }

    written += batch.length;
    console.log(`  ${written}/${rows.length}`);
  }

  // The statement-level trigger bumps this a few times per seed (an upsert
  // fires both the insert and update triggers); the exact count is irrelevant
  // since the version is opaque and monotonic. Reading it back confirms the
  // write landed and is the signal that invalidates every client's cache.
  const versionRes = await fetch(`${restUrl}/content_version?select=version,updated_at`, {
    headers: baseHeaders,
  });

  if (!versionRes.ok) {
    console.warn(`\nSeeded, but couldn't read content_version (HTTP ${versionRes.status}).`);
    return;
  }

  const [version] = await versionRes.json();
  console.log(`\nDone. content_version is now ${version?.version} (${version?.updated_at}).`);
  console.log("Clients will refetch on their next launch.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
