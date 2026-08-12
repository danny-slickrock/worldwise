// Pure translation between local interest slugs and the `profile_interests`
// rows in supabase/migrations/*_init_profile_interests.sql. No storage,
// network, or React imports — same discipline as cloudSync.js, so every rule
// here is unit-testable in plain Node.
//
//   local (string[] of slugs)     profile_interests row
//   ------------------------      ----------------------
//   "history"                  →  { user_id, interest_slug: "history" }
import { normalizeInterests } from "./interestPolicy";

// Build the rows to insert for a set of slugs.
export function interestRowsFromSlugs(userId, slugs) {
  return normalizeInterests(slugs).map((interest_slug) => ({ user_id: userId, interest_slug }));
}

// Read `profile_interests` rows back into a normalized slug list.
export function slugsFromInterestRows(rows) {
  if (!Array.isArray(rows)) return [];
  return normalizeInterests(rows.map((row) => row?.interest_slug));
}

// Reconcile local interests against any existing cloud rows on first sign-in.
// Union, not max — an interest is a binary pick, not a running total, so the
// closest analogue to mergeProgress's "never cost someone progress" is "never
// drop a pick either device made."
export function mergeInterests(local, cloud) {
  return normalizeInterests([...(local ?? []), ...(cloud ?? [])]);
}

// Which slugs to add/remove so the cloud table ends up exactly at `desired`,
// touching only the rows that actually changed.
export function diffInterestRows(current, desired) {
  const currentSet = new Set(current ?? []);
  const desiredSet = new Set(normalizeInterests(desired));
  return {
    toAdd: normalizeInterests(desired).filter((s) => !currentSet.has(s)),
    toRemove: (current ?? []).filter((s) => !desiredSet.has(s)),
  };
}
