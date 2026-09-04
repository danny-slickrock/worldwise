// M2.9 step 3 — `ask`: retrieval + grounded generation.
//
// The whole pipeline runs server-side for two reasons. ANTHROPIC_API_KEY must
// never reach a client bundle; and the grounding rules are the product's
// central promise, so they cannot live anywhere a client could edit them.
//
// Flow: validate → rate-limit → embed the question (gte-small, the same model
// that embedded the corpus) → vector search → re-rank by the caller's own
// interests → build a grounded prompt → call Claude → return a cited answer
// plus the exact chunks it was given.
//
// Every *decision* here is pure and tested in test/engine.test.js:
// game/askLimits.js (validation, rate limiting), game/ragRanking.js
// (interest re-ranking), game/ragPrompt.js (the grounding contract, citation
// parsing). This file wires IO to them and owns nothing else.
import Anthropic from "npm:@anthropic-ai/sdk@0.71.0";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { checkRateLimit, validateQuestion, RATE_LIMIT } from "../../../src/game/askLimits.js";
import { rerankByInterests } from "../../../src/game/ragRanking.js";
import {
  TOP_K,
  MIN_SIMILARITY,
  NO_CONTEXT_ANSWER,
  systemPrompt,
  buildUserMessage,
  formatSources,
  citedRefs,
  isUngrounded,
} from "../../../src/game/ragPrompt.js";

// --- Config ----------------------------------------------------------------
// The one place the model is named, so swapping Haiku for Sonnet is a one-line
// change (see CLAUDE.md — this was an explicit requirement).
const MODEL = "claude-haiku-4-5";

// A deliberate cost ceiling rather than a guess. Haiku 4.5 is $1/$5 per MTok,
// and a "dive deeper" answer is two or three short paragraphs — roughly 300
// tokens. 700 leaves headroom for a longer answer without letting a pathological
// generation run up a bill. This is the output half of step 4's cost controls.
const MAX_TOKENS = 700;

// Same model that embedded the corpus. Mixing embedding models would silently
// destroy retrieval — the vectors would not share a space.
const EMBEDDING_MODEL = "gte-small";

// Rate limiting is per-isolate and in-memory. Honest about what that buys: it
// stops one client hammering one worker, not a distributed abuser. The durable
// per-user daily cap is step 4, and needs a table.
const rateBuckets = new Map<string, number[]>();

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!anthropicKey) {
    // A missing secret is a deploy mistake, not a user error — say which.
    return json({ error: "ANTHROPIC_API_KEY is not set on this project" }, 500);
  }

  let body: { question?: string; country?: string | null } = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: "expected a JSON body" }, 400);
  }

  const invalid = validateQuestion(body.question);
  if (invalid) return json({ error: `question ${invalid}` }, 400);
  const question = String(body.question).trim();
  const country = typeof body.country === "string" ? body.country.toLowerCase() : null;

  // Identify the caller. The user's own JWT, not a client-supplied id — a
  // client that could name its own user could both read someone else's
  // interests and evade the rate limit.
  const authHeader = req.headers.get("Authorization") ?? "";
  const db = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  let userId: string | null = null;
  if (authHeader.startsWith("Bearer ")) {
    const { data } = await db.auth.getUser();
    userId = data?.user?.id ?? null;
  }

  // Anonymous callers share a bucket keyed by IP. Coarse, and deliberately so:
  // a signed-out abuser should be throttled even if that occasionally throttles
  // a shared network too.
  const rateKey =
    userId ?? `anon:${req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"}`;
  const gate = checkRateLimit(rateBuckets.get(rateKey) ?? [], Date.now(), RATE_LIMIT);
  rateBuckets.set(rateKey, gate.kept);
  if (!gate.allowed) {
    return json(
      { error: "rate limited", retryAfterMs: gate.retryAfterMs },
      429,
      { "Retry-After": String(Math.ceil(gate.retryAfterMs / 1000)) },
    );
  }

  // Interests steer ranking only, and only for a signed-in learner. Read
  // server-side under that user's own RLS, never taken from the request.
  let interests: string[] = [];
  if (userId) {
    const { data } = await db
      .from("profile_interests")
      .select("interest_slug")
      .returns<{ interest_slug: string }[]>();
    interests = (data ?? []).map((r) => r.interest_slug);
  }

  const started = Date.now();

  // Embed the question with the corpus's own model.
  let queryEmbedding: number[];
  try {
    const model = new Supabase.ai.Session(EMBEDDING_MODEL);
    queryEmbedding = (await model.run(question, {
      mean_pool: true,
      normalize: true,
    })) as number[];
  } catch (err) {
    console.error("[worldwise:ask] embedding failed", err);
    return json({ error: "could not process the question" }, 502);
  }

  // Retrieve. Over-fetch relative to TOP_K so re-ranking has room to reorder
  // rather than merely relabel what was already the top-k.
  const content = createClient(supabaseUrl, anonKey, { db: { schema: "content" } });
  const { data: matches, error: matchError } = await content.rpc("match_country_chunks", {
    query_embedding: JSON.stringify(queryEmbedding),
    match_count: TOP_K * 2,
    filter_country: country,
    min_similarity: MIN_SIMILARITY,
  });
  if (matchError) {
    console.error("[worldwise:ask] retrieval failed", matchError);
    return json({ error: "could not search Worldwise content" }, 502);
  }

  const ranked = rerankByInterests(matches ?? [], interests).slice(0, TOP_K);

  // Nothing relevant: answer honestly without paying for a model call. Cheaper
  // and more truthful than asking Claude to decline over an empty context.
  if (!ranked.length) {
    console.log(
      `[worldwise:ask] no-context q=${question.length}ch country=${country ?? "-"} user=${userId ? "yes" : "no"}`,
    );
    return json({
      answer: NO_CONTEXT_ANSWER,
      sources: [],
      citedRefs: [],
      grounded: true,
      model: null,
      elapsedMs: Date.now() - started,
    });
  }

  console.log(
    `[worldwise:ask] retrieved=${ranked.length} topSim=${(ranked[0]?.similarity ?? 0).toFixed(3)} ` +
      `q="${question.slice(0, 60)}"`,
  );

  const anthropic = new Anthropic({ apiKey: anthropicKey });
  let answer = "";
  let usage: unknown = null;
  try {
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt(),
      messages: [{ role: "user", content: buildUserMessage({ question, chunks: ranked, place: country }) }],
    });

    // content is a discriminated union — narrow before reading .text.
    answer = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    usage = message.usage;

    // A refusal is a 200 with stop_reason "refusal", not a thrown error.
    if (message.stop_reason === "refusal") {
      return json({ error: "that question can't be answered here", sources: [] }, 422);
    }
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      console.error("[worldwise:ask] anthropic rate limited");
      return json({ error: "busy right now — try again shortly" }, 429);
    }
    if (err instanceof Anthropic.AuthenticationError) {
      console.error("[worldwise:ask] anthropic auth failed — check ANTHROPIC_API_KEY");
      return json({ error: "generation is misconfigured" }, 500);
    }
    console.error("[worldwise:ask] generation failed", err);
    return json({ error: "could not generate an answer" }, 502);
  }

  const refs = citedRefs(answer);
  const grounded = !isUngrounded(answer, ranked.length);

  // The log line that makes quality measurable before step 6's eval set exists:
  // retrieved vs. actually-cited is the cheapest signal that retrieval is
  // drifting, and `grounded=false` means the model answered from memory.
  console.log(
    `[worldwise:ask] country=${country ?? "-"} user=${userId ? "yes" : "no"} ` +
      `interests=${interests.length} retrieved=${ranked.length} ` +
      `topSim=${(ranked[0]?.similarity ?? 0).toFixed(3)} cited=${refs.length} ` +
      `grounded=${grounded} ms=${Date.now() - started}`,
  );

  return json({
    answer,
    sources: formatSources(ranked),
    citedRefs: refs,
    grounded,
    model: MODEL,
    usage,
    elapsedMs: Date.now() - started,
  });
});

function json(body: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "Content-Type": "application/json", ...extraHeaders },
  });
}
