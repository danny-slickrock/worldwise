// M2.9 step 2 — ingestion: chunk every country's content and embed it.
//
// This is an Edge Function rather than the `npm run` script the roadmap
// imagined, and not by preference: `Supabase.ai.Session` is part of the Edge
// runtime and has no Node equivalent, so the only way to use the built-in
// gte-small model — and thus the only way to avoid an external embedding
// vendor and a second API key — is to run here.
//
// The chunking itself is deliberately NOT in this file. It lives in
// ../../../src/game/contentChunks.js, pure and covered by the Node test suite,
// so there is one implementation rather than one per runtime. This file is the
// IO half: read rows, call the model, write vectors.
//
// Re-runnable by design. It is meant to be invoked after a content_version
// bump, and running it twice must be indistinguishable from running it once.
import { createClient } from "jsr:@supabase/supabase-js@2";
import { chunkCountry, staleChunkIndexes } from "../../../src/game/contentChunks.js";

// gte-small, via the Edge runtime's built-in model host. 384 dimensions,
// normalized — which is what makes the cosine index in the migration correct.
const EMBEDDING_MODEL = "gte-small";

// Measured locally at ~80ms per chunk in steady state (the first call adds ~5s
// of one-off model load), so today's ~400 chunks finish in about 35 seconds —
// comfortably one invocation. That is only true while most countries carry no
// facts, though, and this job is meant to be re-run for years as content grows.
//
// Wall clock is not the binding constraint, though. The binding constraint is
// **isolate CPU time**: gte-small inference runs in-process, and the runtime
// kills the worker with WORKER_LIMIT ("CPU time hard limit reached") well
// before any timeout. Measured against the local runtime: 5 countries / 10
// chunks succeeds in ~770ms, 10 countries reproducibly does not. Speed is not
// the issue — cumulative CPU is.
//
// So the batch is bounded by *count* first, and the function reports
// `nextOffset` so the caller loops. The hosted runtime's budget is more
// generous than the local one, but the loop is correct either way and needs no
// retuning if that ever changes: pass a bigger `limit` if prod allows it, and
// the same loop simply finishes in fewer round trips.
const DEFAULT_LIMIT = 5;
const MAX_RUN_MS = 45_000;

type CountryRow = {
  code: string;
  name: string;
  capital: string | null;
  region: string | null;
  summary: string | null;
  population: number | null;
  area_km2: number | null;
  lat: number | null;
  lng: number | null;
  neighbors: string[] | null;
  facts: Record<string, string> | null;
};

Deno.serve(async (req) => {
  // Service-role only. The function talks to Postgres with the service key, so
  // *any* caller that got past the door would trigger a full ingestion run —
  // this check is what stops an authenticated end user from burning compute,
  // not the table grants.
  //
  // Two accepted credentials, because Supabase projects are mid-migration
  // between key formats. SUPABASE_SERVICE_ROLE_KEY is injected by the platform
  // as the legacy JWT; a project handed the newer `sb_secret_…` key would
  // otherwise fail this comparison even though it is the right key. Setting an
  // INGEST_TOKEN secret sidesteps the whole question:
  //   supabase secrets set INGEST_TOKEN="$(openssl rand -hex 32)"
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const ingestToken = Deno.env.get("INGEST_TOKEN") ?? "";
  const auth = req.headers.get("Authorization") ?? "";
  const presented = auth.startsWith("Bearer ") ? auth.slice(7) : "";

  const authorized =
    (serviceKey && presented === serviceKey) || (ingestToken && presented === ingestToken);
  if (!authorized) {
    return json(
      {
        error:
          "unauthorized — present the project's service-role key, or the INGEST_TOKEN secret, as a Bearer token",
      },
      401,
    );
  }

  const url = Deno.env.get("SUPABASE_URL")!;
  const db = createClient(url, serviceKey, { db: { schema: "content" } });

  // `only` ingests a single country, which makes verifying a deploy cheap.
  // `offset` resumes a run that hit the deadline below.
  let only: string | null = null;
  let offset = 0;
  let limit = DEFAULT_LIMIT;
  try {
    const body = await req.json();
    only = typeof body?.only === "string" ? body.only.toLowerCase() : null;
    offset = Number.isInteger(body?.offset) && body.offset > 0 ? body.offset : 0;
    if (Number.isInteger(body?.limit) && body.limit > 0) limit = body.limit;
  } catch {
    /* no body is fine — one default-sized batch from the start */
  }

  const started = Date.now();

  // Ordered by code so `offset` means the same thing across invocations —
  // an unordered read could revisit or skip countries between resumes.
  let countries = db.from("countries").select(
    "code, name, capital, region, summary, population, area_km2, lat, lng, neighbors, facts",
  ).order("code");
  if (only) countries = countries.eq("code", only);
  const { data: rows, error: readError } = await countries.returns<CountryRow[]>();
  if (readError) return json({ error: `reading countries: ${readError.message}` }, 500);
  if (!rows?.length) return json({ error: "no countries matched" }, 404);

  // Neighbour display names, so a borders chunk reads "Argentina and Bolivia"
  // rather than "ar, bo". One read for the whole run.
  const { data: allNames } = await db.from("countries").select("code, name")
    .returns<{ code: string; name: string }[]>();
  const neighborNames: Record<string, string> = {};
  for (const n of allNames ?? []) neighborNames[n.code] = n.name;

  // The version this run reflects, read *before* any writing. Recorded per
  // chunk so a later run can tell which rows are behind.
  const { data: versionRow } = await db.from("content_version").select("version").maybeSingle();
  const contentVersion = versionRow?.version ?? null;

  const model = new Supabase.ai.Session(EMBEDDING_MODEL);
  const report = {
    countries: 0,
    chunks: 0,
    deleted: 0,
    failed: [] as string[],
    contentVersion,
    nextOffset: null as number | null,
  };

  const queue = rows.slice(offset, offset + limit);
  const moreAfterBatch = offset + limit < rows.length;

  for (const [index, row] of queue.entries()) {
      // Stop cleanly rather than being killed mid-country. Checked before
      // starting one, so a country is never half-embedded.
      if (index > 0 && Date.now() - started > MAX_RUN_MS) {
        report.nextOffset = offset + index;
        break;
      }
      report.nextOffset = null;
      try {
        const chunks = chunkCountry(row, neighborNames);

        const embedded = [];
        for (const chunk of chunks) {
          // mean_pool + normalize is the documented gte-small invocation, and
          // normalize is load-bearing: the index is cosine, which assumes it.
          const embedding = await model.run(chunk.content, { mean_pool: true, normalize: true });
          embedded.push({
            country_code: chunk.countryCode,
            chunk_index: chunk.chunkIndex,
            content: chunk.content,
            source: chunk.source,
            embedding: JSON.stringify(embedding),
          });
        }

        if (embedded.length) {
          const { error } = await db.from("embeddings")
            .upsert(embedded, { onConflict: "country_code,chunk_index" });
          if (error) throw new Error(error.message);
        }

        // Delete the tail left behind if this country now yields fewer chunks
        // than the stored run. Without this, retired text stays retrievable —
        // and citable — indefinitely. chunkCountry() is positional, so
        // "everything at or past the new count" is exactly the orphan set.
        const { data: existing } = await db.from("embeddings")
          .select("chunk_index").eq("country_code", row.code)
          .returns<{ chunk_index: number }[]>();
        const stale = staleChunkIndexes(
          (existing ?? []).map((e) => e.chunk_index),
          embedded.length,
        );
        if (stale.length) {
          const { error } = await db.from("embeddings").delete()
            .eq("country_code", row.code).in("chunk_index", stale);
          if (error) throw new Error(error.message);
          report.deleted += stale.length;
        }

        report.countries += 1;
        report.chunks += embedded.length;
      } catch (err) {
        // One bad country must not abandon the other 195. Collected and
        // reported so a partial run is visible rather than silently partial.
        report.failed.push(`${row.code}: ${err instanceof Error ? err.message : String(err)}`);
      }
  }

  // If the batch completed but there are more countries behind it, say where
  // to resume. `nextOffset: null` is the caller's signal to stop looping.
  if (report.nextOffset === null && moreAfterBatch && !only) {
    report.nextOffset = offset + queue.length;
  }
  return json({ ...report, total: rows.length, elapsedMs: Date.now() - started });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
