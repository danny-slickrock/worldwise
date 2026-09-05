// A loud, unmissable statement of which database a script is about to write to.
//
// This exists because of a real incident: a full seed + ingest run was executed
// against the local stack while believing it hit production. The local stack
// already held the same row and chunk counts from an earlier verification run,
// so the output was *identical* to a successful production run — 196 rows,
// ~1,168 chunks — and nothing looked wrong. Production stayed unchanged until a
// spot-check caught it.
//
// The scripts already printed the URL. It was one line among several, and one
// line is not enough when the failure mode looks exactly like success.
export function announceTarget(url) {
  const isLocal = /127\.0\.0\.1|localhost|\[::1\]/.test(url);
  const label = isLocal ? "LOCAL" : "PRODUCTION";
  const host = String(url).replace(/^https?:\/\//, "").replace(/\/$/, "");
  const line = "─".repeat(58);
  console.log(`\n${line}`);
  console.log(`  TARGET: ${label}   ${host}`);
  if (isLocal) {
    console.log("  Nothing here reaches production. Set SUPABASE_URL to the");
    console.log("  project URL if that was not what you meant.");
  }
  console.log(`${line}\n`);
  return { isLocal, label, host };
}
