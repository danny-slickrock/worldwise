// The session's sync-health store. Mutable and observable — but deliberately
// free of React Native, expo and network imports, so test/engine.test.js can
// drive it directly. The *rules* live in syncStatus.js beside it; this file is
// only "hold the current value and tell subscribers when it changes".
//
// It lives on the pure side of the split rather than inside cloudProgress.js
// for one reason: a store buried in a module that imports AsyncStorage is a
// store no test can reach, and the whole point of this milestone is that a
// failed write must never again go unnoticed. That guarantee deserves a test.
//
// In-memory on purpose. This answers "is sync working right now?" — a question
// about this session. Persisting it would mean greeting someone with
// yesterday's failure on a morning when their network is fine.
import {
  INITIAL_SYNC_STATE,
  recordSyncSuccess,
  recordSyncFailure,
} from "./syncStatus";

let state = INITIAL_SYNC_STATE;
const listeners = new Set();

// Injectable clock and logger, so a test can assert on both without a network
// or a real console. Production wiring passes neither.
let clock = () => new Date().toISOString();
let log = (...args) => console.error(...args);

export function getSyncState() {
  return state;
}

// Returns an unsubscribe function, so a React effect can
// `return subscribeSyncState(fn)` directly.
export function subscribeSyncState(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function publish(next) {
  state = next;
  listeners.forEach((fn) => fn(state));
}

// A write landed.
export function noteSyncOk() {
  publish(recordSyncSuccess(state, clock()));
}

// A write failed. `where` names which write, so a console reader can tell a
// stats upsert from a results insert from the first-sign-in migration. This is
// the log line whose absence let the 2026-09-04 outage hide.
export function noteSyncFailure(where, error) {
  log(
    `[worldwise:sync] ${where} failed — ${error?.code ?? "no code"}: ${error?.message ?? error}`,
    error
  );
  publish(recordSyncFailure(state, error, clock()));
}

// Clear everything — used on sign-out, so one account's failures are never
// reported against the next person to sign in on this device.
export function resetSyncState() {
  publish(INITIAL_SYNC_STATE);
}

// Test seam. Lets the pure suite drive a deterministic clock and capture log
// lines instead of spraying them through the test output. Not used by the app.
export function __setSyncStoreDeps({ now, logger } = {}) {
  if (now) clock = now;
  if (logger) log = logger;
  return () => {
    clock = () => new Date().toISOString();
    log = (...args) => console.error(...args);
  };
}
