// Drives the `ingest-embeddings` Edge Function to completion (M2.9 step 2).
//
// Why a loop and not one call: gte-small inference runs inside the Edge
// isolate and burns CPU time, so a full 196-country run trips the runtime's
// WORKER_LIMIT ("CPU time hard limit reached") long before any timeout.
// Measured locally, ~10 chunks per invocation is the ceiling. The function
// therefore does one small batch and reports `nextOffset`; this script follows
// that until it comes back null.
//
// Run:
//   SUPABASE_SERVICE_ROLE_KEY=sb_secret_... npm run ingest:embeddings
//
// The service-role key is a SECRET — it bypasses RLS entirely. Pass it inline
// as above; never put it in .env, and never behind an EXPO_PUBLIC_ prefix,
// which would ship full database access to every visitor.
//
// Re-runnable by design: chunks upsert on (country_code, chunk_index) and the
// function deletes any tail left behind when a country's content shrinks. Run
// it after every content_version bump.
import { announceTarget } from "./lib/target-banner.mjs";

const url =
  process.env.SUPABASE_URL ??
  process.env.EXPO_PUBLIC_SUPABASE_URL ??
  "http://127.0.0.1:54321";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const only = process.env.ONLY ?? null;
const limit = process.env.BATCH ? Number(process.env.BATCH) : null;

if (!key) {
  console.error("SUPABASE_SERVICE_ROLE_KEY is required.");
  console.error("  SUPABASE_SERVICE_ROLE_KEY=sb_secret_... npm run ingest:embeddings");
  process.exit(1);
}

const endpoint = `${url.replace(/\/$/, "")}/functions/v1/ingest-embeddings`;
announceTarget(url);
console.log("Ingesting embeddings...");

// A full run is ~40 sequential invocations, and the Edge runtime will
// occasionally answer one with a transient 503 (an isolate recycling, a cold
// start). Retrying a batch is always safe — every write is an upsert keyed on
// (country_code, chunk_index) — so a blip should cost a second, not the run.
const MAX_ATTEMPTS = 4;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let offset = 0;
let batches = 0;
let retries = 0;
const totals = { countries: 0, chunks: 0, deleted: 0, failed: [] };

for (;;) {
  const body = { offset };
  if (only) body.only = only;
  if (limit) body.limit = limit;

  let res = null;
  let text = "";
  let report = null;
  let transient = "";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    transient = "";
    try {
      res = await fetch(endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      text = await res.text();
    } catch (err) {
      transient = `network error: ${err.message}`;
    }

    if (!transient) {
      try {
        report = JSON.parse(text);
      } catch {
        report = null;
        // An empty or non-JSON 5xx is the runtime, not our function.
        transient = `HTTP ${res.status} with no JSON body`;
      }
    }

    // A CPU-limit rejection is deterministic for a given batch size — retrying
    // it unchanged just fails again, so fall straight through to the advice.
    if (!transient || report?.code === "WORKER_LIMIT") break;

    if (attempt < MAX_ATTEMPTS) {
      retries += 1;
      await sleep(attempt * 1500);
    }
  }

  if (transient && report === null) {
    console.error(`\nFailed at offset ${offset} after ${MAX_ATTEMPTS} attempts — ${transient}.`);
    console.error(`Progress so far: ${totals.countries} countries, ${totals.chunks} chunks.`);
    console.error(`Re-run to resume; completed countries simply upsert again.`);
    process.exit(1);
  }

  if (!res.ok) {
    // WORKER_LIMIT means the batch was too big for the runtime's CPU budget.
    // Say so specifically — "resource limit" alone sends people hunting for a
    // memory leak that isn't there.
    // Two different ceilings, and they want different responses.
    // WORKER_LIMIT is CPU: a smaller batch genuinely helps.
    // WORKER_RESOURCE_LIMIT is memory, and a smaller batch may not help at all
    // if the function loads more than it processes — which is exactly the bug
    // that produced it here. Say which one it is rather than offering the same
    // advice for both.
    if (report?.code === "WORKER_LIMIT") {
      console.error(`\nHit the Edge runtime CPU limit at offset ${offset}.`);
      console.error(`Retry with a smaller batch:  BATCH=1 SUPABASE_SERVICE_ROLE_KEY=... npm run ingest:embeddings`);
    } else if (report?.code === "WORKER_RESOURCE_LIMIT") {
      console.error(`\nHit the Edge runtime MEMORY limit at offset ${offset}.`);
      console.error(`A smaller batch only helps if the function loads no more than it processes.`);
      console.error(`If BATCH is already small and this persists, the function is over-fetching.`);
    } else {
      console.error(`\nFailed at offset ${offset} (HTTP ${res.status}): ${report?.error ?? text}`);
    }
    console.error(`Progress so far: ${totals.countries} countries, ${totals.chunks} chunks.`);
    console.error(`Resume from this point by re-running — completed countries simply upsert again.`);
    process.exit(1);
  }

  totals.countries += report.countries ?? 0;
  totals.chunks += report.chunks ?? 0;
  totals.deleted += report.deleted ?? 0;
  if (report.failed?.length) totals.failed.push(...report.failed);
  batches += 1;

  const scope = report.total ? `/${report.total}` : "";
  process.stdout.write(`\r  ${totals.countries}${scope} countries · ${totals.chunks} chunks`);

  if (report.nextOffset == null) {
    console.log(
      `\n\nDone. ${totals.countries} countries, ${totals.chunks} chunks` +
        (totals.deleted ? `, ${totals.deleted} stale chunks removed` : "") +
        ` across ${batches} batch${batches === 1 ? "" : "es"}` +
        (retries ? ` (${retries} transient retr${retries === 1 ? "y" : "ies"})` : "") +
        `.`
    );
    if (totals.failed.length) {
      console.log(`\n${totals.failed.length} country/countries failed:`);
      for (const f of totals.failed) console.log(`  - ${f}`);
      process.exit(1);
    }
    break;
  }
  offset = report.nextOffset;
}
