// PURE sync-health state. No storage, no network, no React — the decision half
// of "did the player's last round actually reach Postgres?", tested in
// test/engine.test.js with plain objects.
//
// Why this exists. cloudProgress.js deliberately swallows sync errors so a
// failed write can never interrupt play, and returns { ok, error } for a caller
// to deal with. Nothing ever dealt with it. On 2026-09-04 that combination hid
// a total sync outage in production: every user_stats and game_results write
// was failing with 23503 (no profiles row behind a pre-trigger auth user) while
// the results screen still showed "+55 XP" and Profile still said "✓ Synced".
// All four user tables held zero rows and nothing on screen said so.
//
// The fix is not to start throwing — swallowing is right, gameplay must not
// depend on the network. The fix is to keep a record of what happened and let
// the UI read it. This module owns that record and what it means; the IO that
// feeds it lives in storage/cloudProgress.js.

// A write can be in one of four places. `idle` is "nothing has been attempted
// this session", which is distinct from `ok` — we have not confirmed anything.
export const SYNC_IDLE = "idle";
export const SYNC_OK = "ok";
export const SYNC_RETRYING = "retrying";
export const SYNC_FAILED = "failed";

// How many consecutive failures before we stop calling it a blip. The first
// failure is genuinely often transient (a tunnel, a sleeping laptop), and
// crying wolf on it would train players to ignore the indicator — which is the
// exact failure mode this module exists to prevent.
export const FAILURE_ESCALATION = 3;

export const INITIAL_SYNC_STATE = Object.freeze({
  status: SYNC_IDLE,
  lastOkAt: null,
  lastFailedAt: null,
  lastError: null,
  failureCount: 0,
});

// Errors arrive from three places — a PostgrestError ({ code, message }), a
// thrown Error, or something a library invented. Narrow all three to a plain
// serializable shape so the state stays storable and comparable.
export function describeError(error) {
  if (!error) return null;
  return {
    code: error.code ?? null,
    message: String(error.message ?? error) || "Unknown error",
  };
}

// A write landed. Clears the failure run entirely: what matters to a player is
// whether their data is safe *now*, and it is.
export function recordSyncSuccess(state = INITIAL_SYNC_STATE, now = null) {
  return {
    ...INITIAL_SYNC_STATE,
    status: SYNC_OK,
    lastOkAt: now,
    // A previous failure timestamp is kept as history; the count is what drives
    // display, and that resets.
    lastFailedAt: state?.lastFailedAt ?? null,
  };
}

// A write failed. `lastOkAt` survives, so the UI can still say when data was
// last known safe — the single most useful thing to tell someone whose sync is
// broken.
export function recordSyncFailure(state = INITIAL_SYNC_STATE, error = null, now = null) {
  const failureCount = (state?.failureCount ?? 0) + 1;
  return {
    status: failureCount >= FAILURE_ESCALATION ? SYNC_FAILED : SYNC_RETRYING,
    lastOkAt: state?.lastOkAt ?? null,
    lastFailedAt: now,
    lastError: describeError(error),
    failureCount,
  };
}

// What the Profile screen should say, if anything.
//
// Returns { visible, tone, message, detail }. `tone` is a semantic name the
// screen maps to a theme token — this module never names a colour, so it stays
// importable by the pure test suite.
//
// Signed out there is nothing to sync and nothing to report: a signed-out
// player's progress living only on the device is the documented design, not a
// fault, so the indicator stays hidden rather than claiming a problem.
export function describeSyncState(state = INITIAL_SYNC_STATE, { signedIn = false } = {}) {
  if (!signedIn) return { visible: false, tone: "none", message: "", detail: null };

  const status = state?.status ?? SYNC_IDLE;

  if (status === SYNC_RETRYING) {
    return {
      visible: true,
      tone: "warning",
      message: "Couldn't save your last round — we'll retry.",
      detail: lastSafeDetail(state),
    };
  }

  if (status === SYNC_FAILED) {
    return {
      visible: true,
      tone: "error",
      message: "Your progress isn't saving to the cloud.",
      detail: lastSafeDetail(state),
    };
  }

  if (status === SYNC_OK) {
    return {
      visible: true,
      tone: "ok",
      message: "Synced — your progress is safe on every device.",
      detail: null,
    };
  }

  // Idle: signed in, but nothing has been written yet this session. Saying
  // "synced" here would be the same unearned reassurance that hid the outage,
  // so the row stays quiet until a write actually confirms one way or another.
  return { visible: false, tone: "none", message: "", detail: null };
}

// "Last saved ..." only means something if a write has ever landed. On a device
// that has never synced successfully there is nothing honest to put here.
function lastSafeDetail(state) {
  return state?.lastOkAt ? `Last saved ${state.lastOkAt}` : "No round has saved yet.";
}
