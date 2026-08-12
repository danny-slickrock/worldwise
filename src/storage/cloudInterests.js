// Cloud mirror of storage/interests.js, same shape as cloudProgress.js: local
// AsyncStorage stays the offline cache and keeps working signed-out; this
// adapter pushes selections up and reads them back for a signed-in player.
//
// interestPolicy.js and interestSync.js know nothing about Supabase — the
// dependency points one way, so the pure decisions stay testable under tsx.
// Nothing here throws: a failed sync must never interrupt the interests
// screen. Callers get { ok, error } and can retry.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabase";
import { loadInterests } from "./interests";
import {
  interestRowsFromSlugs,
  slugsFromInterestRows,
  mergeInterests,
  diffInterestRows,
} from "../game/interestSync";

// One-time flag: local interests have been folded into the cloud for this
// device. Separate from cloudProgress.js's MIGRATED_KEY — a person can sign
// in long before ever opening the interests screen, so each cache migrates
// independently the first time it has something to fold in.
export const INTERESTS_MIGRATED_KEY = "worldwise.interestsMigrated.v1";

// Read a signed-in player's interest rows back as a normalized slug list.
// Returns null (not []) on a failed read, so callers keep whatever local
// selection they have rather than clobbering it with "no interests".
export async function fetchInterests(user, client = supabase) {
  if (!user?.id) return null;
  try {
    const { data, error } = await client
      .from("profile_interests")
      .select("interest_slug")
      .eq("user_id", user.id);
    if (error) return null;
    return slugsFromInterestRows(data);
  } catch {
    return null;
  }
}

// Replace a signed-in player's cloud interests with `slugs`, touching only
// the rows that changed (diffInterestRows) rather than a blind delete+insert.
export async function pushInterests(user, slugs, client = supabase) {
  if (!user?.id) return { ok: false, error: new Error("not signed in") };
  try {
    const current = (await fetchInterests(user, client)) ?? [];
    const { toAdd, toRemove } = diffInterestRows(current, slugs);

    if (toRemove.length) {
      const { error } = await client
        .from("profile_interests")
        .delete()
        .eq("user_id", user.id)
        .in("interest_slug", toRemove);
      if (error) return { ok: false, error };
    }
    if (toAdd.length) {
      const { error } = await client.from("profile_interests").insert(interestRowsFromSlugs(user.id, toAdd));
      if (error) return { ok: false, error };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error };
  }
}

// First sign-in on a device: fold local interests into the cloud, taking the
// union of local vs. any existing cloud rows so neither device's picks get
// dropped. Runs once (guarded by INTERESTS_MIGRATED_KEY) and only ever
// *reads* local data — nothing is cleared.
export async function migrateLocalInterestsToCloud(user, client = supabase) {
  if (!user?.id) return { ok: false, error: new Error("not signed in") };

  try {
    if (await AsyncStorage.getItem(INTERESTS_MIGRATED_KEY)) {
      return { ok: true, migrated: false, interests: await fetchInterests(user, client) };
    }

    const local = await loadInterests();
    const cloud = await fetchInterests(user, client);
    const merged = mergeInterests(local, cloud);

    const result = await pushInterests(user, merged, client);
    // Leave the flag unset on failure so the next sign-in retries the merge.
    if (!result.ok) return result;

    await AsyncStorage.setItem(INTERESTS_MIGRATED_KEY, new Date().toISOString());
    return { ok: true, migrated: true, interests: merged };
  } catch (error) {
    return { ok: false, error };
  }
}
