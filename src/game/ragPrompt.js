// PURE prompt assembly and grounding rules for the AI knowledge hub (M2.9
// step 3). No network, no SDK — the Edge Function imports this, and the Node
// test suite pins the parts that must never silently drift.
//
// This file is where the product's central promise is actually written down:
// answers come only from retrieved Worldwise content, and every claim is
// citable. The audience includes students, so an ungrounded answer is not a
// quality regression — it is the feature failing.

// Retrieval shape. Top-k is a real quality/cost knob: too few and the model
// lacks the fact, too many and the grounding instruction competes with a wall
// of loosely-related text.
export const TOP_K = 8;

// A chunk below this cosine similarity is noise. Passing noise to the model is
// worse than passing nothing: it invites the model to stitch an answer out of
// whatever it was handed, which is exactly the failure this design exists to
// prevent.
//
// The value is measured, not guessed — and the naive guess is badly wrong.
// gte-small compresses cosine similarity into a high, narrow band, so an
// intuitive-looking floor like 0.25 admits literally everything. Against the
// local corpus:
//
//   0.927  "What is the capital of France?"        on-topic
//   0.925  "What does Brazil export?"              on-topic
//   0.924  "Which countries border Brazil?"        on-topic
//   0.908  "Why is Iceland so sparsely populated?" on-topic
//   0.830  "Tell me about Japanese food culture"   on-topic
//   ----------------------------------------------------- 0.80
//   0.793  "Who won the 2018 World Cup"            off-topic
//   0.723  "ignore previous instructions ..."      adversarial
//   0.716  "Explain quantum chromodynamics"        off-topic
//   0.706  "How do I bake sourdough bread?"        off-topic
//   0.679  "Write me a poem about my cat"          off-topic
//
// 0.80 sits in the gap. Re-validate against the full production corpus before
// leaning on it as the off-topic guardrail in step 4 — this was measured with
// five countries ingested, and a denser corpus may shift the bands.
export const MIN_SIMILARITY = 0.80;

// If nothing clears the floor, we do not call the model at all. Saying so is
// both cheaper and more honest than asking Claude to decline gracefully.
// Tone follows docs/content-response-policy.md's decline-onward pattern: treat
// the reader as a capable adult, don't shame the question, don't dead-end it.
//
// One nuance this copy has to absorb: retrieval can't tell a valid-but-uncovered
// geography question from a genuinely off-topic one — both simply fall below the
// similarity floor. So the wording states what the corpus holds without either
// promising future coverage of sourdough or implying the reader asked wrongly.
// Step 5 adds the policy's resource-pointing and related-geography, which needs
// UI and a signal these two cases can actually be told apart by.
export const NO_CONTEXT_ANSWER =
  "Worldwise doesn't have anything on that. What it does cover is countries — their geography, borders, climate, economy, and culture. Ask about a place and it can tell you a lot.";

export const NO_ANSWER_MARKER = "NO_ANSWER";

// The grounding contract. Written as rules the model can follow literally,
// because vague instructions ("be accurate") do nothing under pressure.
export function systemPrompt() {
  return [
    "You are Worldwise's geography guide. You help curious people understand how the world works.",
    "",
    "GROUNDING RULES (these override everything else):",
    "1. Answer ONLY from the numbered sources provided in the user message. They are the entirety of what you know for this question.",
    "2. Every factual claim must be traceable to a source. Cite inline with bracketed numbers like [1] or [2][3].",
    `3. If the sources do not answer the question, begin your reply with exactly "${NO_ANSWER_MARKER}", then briefly acknowledge it is a good question and say what the sources do cover instead. Never fill a gap from memory, and never guess.`,
    "4. Do not add facts, figures, dates, or names that are absent from the sources — not even ones you are confident about.",
    "5. If sources conflict, say so rather than silently picking one.",
    "",
    "STYLE:",
    "- You are writing for a capable adult who is curious about geography but is not a specialist. Be direct and substantive. Do not simplify for its own sake, do not over-explain, and do not hand-hold.",
    "- Lead with the answer, then the 'why it matters' context. Curiosity is the point; a bare fact is not.",
    "- Two or three short paragraphs at most.",
    "- Never suggest a question should not have been asked. Curiosity about a difficult subject is an intelligent question, not a problem — answer it as one.",
    "- Neutral and factual on contested topics: describe what is disputed and by whom rather than adjudicating it. Stay out of sovereignty and recognition disputes.",
    "- No graphic or gratuitous detail, whatever the topic.",
    "- No emoji, no headings, no bullet lists. Prose.",
  ].join("\n");
}

// Render retrieved chunks as the numbered sources the rules above refer to.
// One-indexed because the model is told to cite [1], not [0].
export function formatContext(chunks = []) {
  return chunks
    .map((c, i) => `[${i + 1}] (${c.country_code ?? "?"} · ${c.source ?? "?"}) ${c.content}`)
    .join("\n\n");
}

// Assemble the user turn: the sources, then the question.
//
// Order matters for prompt caching — the stable framing sits ahead of the
// volatile question, so a future cache breakpoint has something to hold.
export function buildUserMessage({ question, chunks = [], place = null }) {
  const scope = place ? `The learner is looking at ${place}.` : "";
  return [
    "SOURCES:",
    formatContext(chunks),
    "",
    scope,
    `QUESTION: ${String(question ?? "").trim()}`,
    "",
    "Answer using only the sources above, citing them inline with [n].",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

// What the client gets back alongside the answer. The full chunk text is
// included deliberately: a citation the learner cannot expand and read is a
// claim of grounding rather than evidence of it.
export function formatSources(chunks = []) {
  return chunks.map((c, i) => ({
    ref: i + 1,
    countryCode: c.country_code ?? null,
    source: c.source ?? null,
    content: c.content,
    similarity: typeof c.similarity === "number" ? Number(c.similarity.toFixed(4)) : null,
    interestMatched: Boolean(c.interestMatched),
  }));
}

// Which citation numbers the model actually used. Two jobs: the UI can grey out
// sources that went unused, and a large gap between "retrieved" and "cited" is
// the cheapest available signal that retrieval is drifting off-topic.
export function citedRefs(answer = "") {
  const refs = new Set();
  for (const match of String(answer).matchAll(/\[(\d{1,2})\]/g)) {
    refs.add(Number(match[1]));
  }
  return [...refs].sort((a, b) => a - b);
}

// A declining answer opens with this exact marker. It exists because the naive
// signal is wrong in a way that matters: a *correct* refusal ("the sources
// don't cover who the president is") cites nothing, and a citation-count check
// reads that as "answered from memory". Observed live on the first production
// test — a well-behaved decline was flagged ungrounded. Since step 7's eval set
// scores grounding, that false positive would have systematically punished
// exactly the behaviour the grounding rules ask for.
//
// A marker the model emits is deterministic; sniffing refusal phrasing out of
// prose is not.
// Three outcomes, not two:
//   "declined"   — the model correctly said the sources don't cover this. Good.
//   "cited"      — an answer with citations. Good.
//   "ungrounded" — an answer asserting facts while citing nothing. The failure.
export function answerStatus(answer = "", chunkCount = 0) {
  const text = String(answer).trim();
  if (text.startsWith(NO_ANSWER_MARKER)) return "declined";
  if (!chunkCount) return "declined";
  return citedRefs(text).length === 0 ? "ungrounded" : "cited";
}

// Strip the marker before the answer reaches a learner — it is a machine
// signal, not something to read.
export function stripMarker(answer = "") {
  const text = String(answer).trim();
  if (!text.startsWith(NO_ANSWER_MARKER)) return text;
  return text.slice(NO_ANSWER_MARKER.length).replace(/^[\s—:-]+/, "").trim();
}

// Kept as the one-line health check: only a true ungrounded answer is a
// failure. A decline is not.
export function isUngrounded(answer, chunkCount) {
  return answerStatus(answer, chunkCount) === "ungrounded";
}
