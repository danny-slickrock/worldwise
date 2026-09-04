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

// --- The durable daily cap (M2.9 step 4) -----------------------------------
// The rate limit above is an abuse brake on one isolate. THIS is the cost
// ceiling: a per-user, per-UTC-day request budget backed by public.ask_usage,
// so it survives isolate recycling, restarts, and a determined user.
//
// Requests rather than dollars, on purpose. "25 questions a day" is something
// a learner can understand from a UI string; "$0.03 of inference" is not. With
// MAX_TOKENS capping each answer, requests are a good enough proxy for spend —
// the worst case is bounded at cap × (max input + max output).
export const DAILY_CAP = 25;

// Decide whether a request is within today's budget.
//
// `usedToday` is the count AFTER this request has been recorded, because the
// increment is atomic in Postgres (bump_ask_usage returns the new count) — a
// read-then-write from the Edge Function would race two concurrent questions
// into a free extra request every time.
//
// That ordering means the cap check is "did recording this push me over?",
// which is why the comparison is `>` and not `>=`.
export function checkDailyCap(usedToday, cap = DAILY_CAP) {
  const used = Number.isFinite(usedToday) ? usedToday : 0;
  return {
    allowed: used <= cap,
    used,
    cap,
    remaining: Math.max(0, cap - used),
  };
}

// When the budget refills, as an ISO string — UTC midnight, matching the
// usage_date column. The UI can say "resets at ..." instead of leaving someone
// to guess, which is the difference between a limit and a wall.
export function dailyCapResetsAt(now = new Date()) {
  const next = new Date(now);
  next.setUTCHours(24, 0, 0, 0);
  return next.toISOString();
}
