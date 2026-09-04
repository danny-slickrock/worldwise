// PURE rate limiting for the ask endpoint (M2.9 step 3's "rate-limit + log").
// The per-user DAILY spend cap is step 4; this is the abuse brake that stops
// one client hammering the endpoint, and it is deliberately separate — they
// answer different questions and want different storage.
//
// Pure so the window arithmetic is testable without a clock or a database.

// A burst allowance rather than a spend limit: enough that a curious learner
// asking several follow-ups in a row never notices, low enough that a script
// does immediately.
export const RATE_LIMIT = { max: 6, windowMs: 60_000 };

// Decide whether one more request is allowed.
//
// `timestamps` is this caller's recent request times (ms). Returns
// { allowed, remaining, retryAfterMs, kept } — `kept` being the pruned list the
// caller stores back, so eviction is decided here rather than at each call site.
export function checkRateLimit(timestamps = [], now = Date.now(), limit = RATE_LIMIT) {
  const windowStart = now - limit.windowMs;
  const kept = (Array.isArray(timestamps) ? timestamps : [])
    .filter((t) => typeof t === "number" && t > windowStart)
    .sort((a, b) => a - b);

  if (kept.length >= limit.max) {
    // Retry when the oldest request in the window falls out of it.
    const retryAfterMs = Math.max(0, kept[0] + limit.windowMs - now);
    return { allowed: false, remaining: 0, retryAfterMs, kept };
  }

  return {
    allowed: true,
    remaining: limit.max - kept.length - 1,
    retryAfterMs: 0,
    kept: [...kept, now],
  };
}

// Reject junk before it costs an embedding call, let alone a model call.
// Returns null when the question is fine, or a reason string when it is not.
export function validateQuestion(question) {
  const text = String(question ?? "").trim();
  if (!text) return "empty";
  if (text.length < 3) return "too-short";
  // gte-small truncates at 512 tokens and no genuine question runs this long;
  // anything past it is padding, an injection attempt, or a mistake.
  if (text.length > 600) return "too-long";
  return null;
}
