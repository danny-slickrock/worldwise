// PURE safety screen for the ask endpoint (M2.9 step 4). No network, no
// storage — just the decision, so the false-positive cases can be pinned in
// test/engine.test.js.
//
// **This is a narrow pre-filter, not a safety system.** Three things actually
// keep answers safe, in order of load-bearing-ness:
//   1. The retrieval floor. Answers come only from our own country content, and
//      anything that doesn't look like that content scores below 0.80 and never
//      reaches the model. A prompt injection measured 0.723 in production.
//   2. The grounding rules in ragPrompt.js — answer only from sources, cite
//      everything, decline rather than guess.
//   3. Claude's own safety training.
// This file exists to catch the small set of requests that should never reach a
// model at all, and to say so in a way a 12-year-old isn't alarmed by.
//
// The design constraint that shapes everything here: **geography is full of
// war.** Borders, invasions, military spending, colonial violence, genocide,
// famine — these are the subject matter, not abuse of it. A keyword blocklist
// containing "weapon", "kill", "war" or "attack" would block the curriculum
// while barely inconveniencing anyone acting in bad faith. So the patterns
// below match *requests for harmful instructions*, not topics, and the test
// suite asserts the legitimate questions pass.

// Matched against the lowercased question. Each entry is deliberately a phrase
// with an imperative shape ("how to make a bomb"), not a bare noun ("bomb").
const HARMFUL_INSTRUCTION_PATTERNS = [
  // Weapons/explosives construction — the imperative, not the history.
  /\b(how (to|do i|can i) (make|build|create|construct|synthesi[sz]e))\b[^?]{0,40}\b(bomb|explosive|grenade|firearm|gun|silencer|nerve agent|sarin|napalm|molotov)\b/,
  /\b(how (to|do i|can i))\b[^?]{0,40}\b(make|manufacture|cook|synthesi[sz]e)\b[^?]{0,20}\b(meth|methamphetamine|fentanyl|heroin|cocaine|lsd)\b/,
  // Violence directed at a person.
  /\b(how (to|do i|can i) (kill|murder|poison|stab|shoot|hurt|harm))\b[^?]{0,30}\b(someone|somebody|a person|my|him|her|them|people)\b/,
  // Self-harm. Deflected to a human, never answered.
  /\b(how (to|do i|can i))\b[^?]{0,30}\b(kill myself|end my life|commit suicide|hurt myself|harm myself)\b/,
  /\b(i want to (die|kill myself|end it all))\b/,
  // Sexual content involving minors — zero tolerance, no nuance needed.
  /\b(child|minor|kid|underage)\b[^?]{0,20}\b(porn|sexual|nude|naked)\b/,
  /\b(sexual|porn|nude)\b[^?]{0,20}\b(child|minor|kid|underage)\b/,
];

// Self-harm gets its own response. Deflecting it with the same "ask me about
// geography" line as a bomb recipe would be careless toward someone who may
// actually need help.
const SELF_HARM_PATTERNS = [
  /\b(kill myself|end my life|commit suicide|hurt myself|harm myself|want to die)\b/,
];

export const REFUSAL_OFF_LIMITS =
  "I can only help with questions about countries and how the world works. Try asking about a place — its geography, borders, climate, trade, or culture.";

export const REFUSAL_SELF_HARM =
  "I can't help with that, but please talk to someone who can — a trusted adult, or a crisis line in your country. If you're in immediate danger, call your local emergency number.";

// Screen a question before it costs an embedding, a retrieval, or a model call.
//
// Returns { allowed, category, response }. `category` is null when allowed,
// otherwise "self-harm" or "harmful-instructions" — logged, so a spike is
// visible rather than invisible.
export function screenQuestion(question) {
  const text = String(question ?? "").toLowerCase().replace(/\s+/g, " ").trim();
  if (!text) return { allowed: true, category: null, response: null };

  // Self-harm is checked first: it is the case where the *response* matters
  // most, and some phrasings would also match the violence pattern.
  if (SELF_HARM_PATTERNS.some((re) => re.test(text))) {
    return { allowed: false, category: "self-harm", response: REFUSAL_SELF_HARM };
  }

  if (HARMFUL_INSTRUCTION_PATTERNS.some((re) => re.test(text))) {
    return { allowed: false, category: "harmful-instructions", response: REFUSAL_OFF_LIMITS };
  }

  return { allowed: true, category: null, response: null };
}
