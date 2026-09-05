// Content enrichment — the drafting call, server-side.
//
// Exists for one reason: ANTHROPIC_API_KEY lives only in Edge secrets and must
// never reach a developer machine or a repo. So the local driver posts source
// excerpts here, this calls Claude, and the drafted JSON goes back. Same shape
// as ingest-embeddings, and for the same reason — the model is only reachable
// from Edge.
//
// This writes nothing. Drafts land in content-sources/drafts/ on the driver's
// machine so a git diff stays the review surface, and nothing auto-publishes.
import Anthropic from "npm:@anthropic-ai/sdk@0.71.0";

// Sonnet, not Haiku. Drafting is a one-time, human-reviewed pass over 196
// countries where prose quality compounds into every future answer; the in-app
// `ask` path stays on Haiku. Named here alone so it can be changed in one place.
const MODEL = "claude-sonnet-5";

// Five prose fields at a few hundred words. 2000 leaves room without inviting
// an essay — the chunker caps a chunk at 1200 characters anyway.
const MAX_TOKENS = 2000;

const FIELDS = ["hook", "physicalGeography", "climate", "economy", "peopleAndCulture"] as const;

// The editorial contract, lifted from docs/content-response-policy.md. Written
// as rules the model can follow literally; vague guidance ("be engaging") does
// nothing under pressure.
function systemPrompt() {
  return [
    "You are drafting reference content for Worldwise, a geography learning product.",
    "",
    "GROUNDING (overrides everything else):",
    "1. Write ONLY from the source excerpts provided. They are the entirety of what you know.",
    "2. Never add a fact, figure, date, name or superlative that is not in the excerpts — not even one you are confident about.",
    "3. If an excerpt is thin, write less. A shorter accurate paragraph beats a padded one.",
    "4. Do not speculate about significance, causes, or consequences beyond what the excerpts state.",
    "",
    "AUDIENCE AND TONE:",
    "- Capable adults who are curious about geography but are not specialists. Be direct and substantive.",
    "- Do not simplify for its own sake, do not over-explain, and do not hand-hold.",
    "- Curiosity-first: answer 'why should I care?', not just 'what is it?'. Lead with what is genuinely interesting.",
    "- Plain prose. No emoji, no headings, no bullet lists, no rhetorical questions.",
    "- Do not open with the country's name as a bare label, and vary sentence openings between fields.",
    "",
    "SCOPE — this pass covers uncontested factual content only:",
    "- Physical geography, climate, economy, people and culture.",
    "- Do NOT write about wars, coups, colonial administration, independence struggles, genocide, insurgency, terrorism, territorial disputes, or party politics. These are legitimate topics deferred to a later pass; silently omit them here.",
    "- If an excerpt is mostly political history, use only its non-political content, or return an empty string for that field.",
    "",
    "ACCURACY RULES THAT HAVE ALREADY CAUSED BUGS:",
    "- Never call a territory a country. French Guiana, Greenland, the Faroe Islands and similar are territories.",
    "- If a country has no land borders, say so plainly. Do not invent maritime neighbours.",
    "- When the source offers a cleaner framing than a raw list — for example 'borders every South American country except Chile and Ecuador' — prefer it.",
    "",
    "OUTPUT: a single JSON object with exactly these keys, each a string of 2-4 sentences:",
    `${FIELDS.join(", ")}. No markdown fence, no commentary, no other keys.`,
  ].join("\n");
}

function userMessage(payload: { name: string; landBorders: string[]; excerpts: Record<string, string> }) {
  const borders = payload.landBorders.length
    ? payload.landBorders.join(", ")
    : "NONE — this country has no land borders with any country.";
  const blocks = FIELDS.map(
    (f) => `### ${f}\n${payload.excerpts[f]?.trim() || "(no source text — return an empty string for this field)"}`
  ).join("\n\n");
  return [
    `COUNTRY: ${payload.name}`,
    `LAND BORDERS (authoritative — from the CIA World Factbook): ${borders}`,
    "",
    "SOURCE EXCERPTS, one per field:",
    "",
    blocks,
  ].join("\n");
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const ingestToken = Deno.env.get("INGEST_TOKEN") ?? "";
  const presented = (req.headers.get("Authorization") ?? "").replace(/^Bearer /, "");
  if (!((serviceKey && presented === serviceKey) || (ingestToken && presented === ingestToken))) {
    return json({ error: "unauthorized — service-role key or INGEST_TOKEN required" }, 401);
  }

  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!anthropicKey) return json({ error: "ANTHROPIC_API_KEY is not set" }, 500);

  let body: { name?: string; landBorders?: string[]; excerpts?: Record<string, string> };
  try {
    body = await req.json();
  } catch {
    return json({ error: "expected a JSON body" }, 400);
  }
  if (!body?.name || !body?.excerpts) return json({ error: "name and excerpts are required" }, 400);

  const anthropic = new Anthropic({ apiKey: anthropicKey });
  try {
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt(),
      messages: [{
        role: "user",
        content: userMessage({
          name: body.name,
          landBorders: body.landBorders ?? [],
          excerpts: body.excerpts,
        }),
      }],
    });

    if (message.stop_reason === "refusal") {
      return json({ error: "model declined to draft this country", country: body.name }, 422);
    }

    const text = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();

    // Tolerate a stray fence even though the prompt forbids one — a whole
    // country's draft is not worth losing to a formatting slip.
    const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
    let prose: Record<string, string>;
    try {
      prose = JSON.parse(cleaned);
    } catch {
      return json({ error: "model did not return valid JSON", raw: cleaned.slice(0, 400) }, 502);
    }

    // Return only the expected keys, as strings. An unexpected key would flow
    // into a draft file and quietly become part of the review surface.
    const out: Record<string, string> = {};
    for (const f of FIELDS) out[f] = typeof prose[f] === "string" ? prose[f].trim() : "";

    return json({ prose: out, model: MODEL, usage: message.usage });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) return json({ error: "rate limited" }, 429);
    if (err instanceof Anthropic.AuthenticationError) {
      return json({ error: "ANTHROPIC_API_KEY rejected" }, 500);
    }
    console.error("[worldwise:draft] failed", err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 502);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
