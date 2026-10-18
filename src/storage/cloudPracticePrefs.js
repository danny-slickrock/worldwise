// Cloud mirror of storage/practicePrefs.js, same shape as cloudInterests.js:
// local AsyncStorage stays the offline cache and keeps working signed-out;
// this adapter pushes preferences up and reads them back for a signed-in
// player. Unlike interests, there's no separate join table — preferences
// live on the player's own profiles row (difficulty_pref/focus_regions/
// streak_goal), so every call here is a read/update of that one row rather
// than an insert/delete of many.
//
// practicePrefsPolicy.js and practicePrefsSync.js know nothing about
// Supabase — the dependency points one way, so the pure decisions stay
// testable under tsx. Nothing here throws: a failed sync must never
// interrupt the settings screen. Callers get { ok, error } and can retry.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabase";
import { loadPracticePrefs } from "./practicePrefs";
import {
  practicePrefsPatchFromPrefs,
  practicePrefsFromProfileRow,
  mergePracticePrefs,
} from "../game/practicePrefsSync";

// One-time flag: local preferences have been folded into the cloud for this
// device. Separate from cloudInterests.js's own flag — a person can set
// practice preferences long before ever touching their interests, and vice
// versa, so each cache migrates independently the first time it has
// something to fold in.
export const PRACTICE_PREFS_MIGRATED_KEY = "worldwise.practicePrefsMigrated.v1";

// Read a signed-in player's practice preferences back from their profile
// row. Returns null (not the defaults) on a missing row or a failed read, so
// callers keep whatever local preferences they have rather than clobbering a
// deliberate local pick with "never set."
export async function fetchPracticePrefs(user, client = supabase) {
  if (!user?.id) return null;
  try {
    const { data, error } = await client
      .from("profiles")
      .select("difficulty_pref, focus_regions, streak_goal")
      .eq("id", user.id)
      .maybeSingle();
    if (error || !data) return null;
    return practicePrefsFromProfileRow(data);
  } catch {
    return null;
  }
}

// Update a signed-in player's practice preferences on their existing profile
// row — an UPDATE, never an upsert, since the M2.1 signup trigger already
// created that row for every account.
export async function pushPracticePrefs(user, prefs, client = supabase) {
  if (!user?.id) return { ok: false, error: new Error("not signed in") };
  try {
    const { error } = await client
      .from("profiles")
      .update(practicePrefsPatchFromPrefs(prefs))
      .eq("id", user.id);
    if (error) return { ok: false, error };
    return { ok: true };
  } catch (error) {
    return { ok: false, error };
  }
}

// First sign-in on a device: fold local preferences into whatever's already
// on the profile row, taking the merge mergePracticePrefs defines per field
// so neither device's deliberate choice is dropped. Runs once (guarded by
// PRACTICE_PREFS_MIGRATED_KEY) and only ever *reads* local data — nothing is
// cleared.
export async function migrateLocalPracticePrefsToCloud(user, client = supabase) {
  if (!user?.id) return { ok: false, error: new Error("not signed in") };

  try {
    if (await AsyncStorage.getItem(PRACTICE_PREFS_MIGRATED_KEY)) {
      return { ok: true, migrated: false, prefs: await fetchPracticePrefs(user, client) };
    }

    const local = await loadPracticePrefs();
    const cloud = await fetchPracticePrefs(user, client);
    const merged = mergePracticePrefs(local, cloud);

    const result = await pushPracticePrefs(user, merged, client);
    // Leave the flag unset on failure so the next sign-in retries the merge.
    if (!result.ok) return result;

    await AsyncStorage.setItem(PRACTICE_PREFS_MIGRATED_KEY, new Date().toISOString());
    return { ok: true, migrated: true, prefs: merged };
  } catch (error) {
    return { ok: false, error };
  }
}
