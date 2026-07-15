// Cloud mirror of progress.js. Local AsyncStorage stays the offline cache and
// keeps working signed-out; this adapter pushes finished rounds up and reads
// totals back for a signed-in player.
//
// progress.js and game/progress.js know nothing about Supabase — the dependency
// points one way, so the game engine stays pure and offline-first. All pure
// row/shape logic lives in game/cloudSync.js; only IO lives here.
//
// Nothing here throws: a failed sync must never interrupt play. Callers get
// { ok, error } and can retry or surface it once auth UI exists.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabase";
import { loadProgress } from "./progress";
import {
  statsRowFromProgress,
  progressFromStatsRow,
  resultRowFromRound,
  mergeProgress,
} from "../game/cloudSync";

// One-time flag: local progress has been folded into the cloud for this device.
export const MIGRATED_KEY = "worldwise.migrated.v1";

// Postgres unique_violation. Expected when a Daily is submitted twice in one
// day — the partial unique index doing its job, not a failure.
const UNIQUE_VIOLATION = "23505";

// Push a finished round: bump the user_stats totals and append the game_results
// row. `progress` is the already-folded result of applyRoundResult, so the
// server stores the same numbers the client shows — no double-counting.
export async function saveRoundResult(user, round, progress, client = supabase) {
  if (!user?.id) return { ok: false, error: new Error("not signed in") };
  const today = progress?.lastPlayedOn ?? null;

  try {
    const { error: statsError } = await client
      .from("user_stats")
      .upsert(statsRowFromProgress(user.id, progress), { onConflict: "user_id" });
    if (statsError) return { ok: false, error: statsError };

    const { error: resultError } = await client
      .from("game_results")
      .insert(resultRowFromRound(user.id, round, today));
    // A duplicate Daily is a no-op, not an error — the stats upsert still landed.
    if (resultError && resultError.code !== UNIQUE_VIOLATION) {
      return { ok: false, error: resultError };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error };
  }
}

// Read cloud totals back in the local progress shape. Returns null when there's
// no row yet or the read fails, so callers keep whatever local state they have
// rather than clobbering it with zeros.
export async function fetchProgress(user, client = supabase) {
  if (!user?.id) return null;
  try {
    const { data, error } = await client
      .from("user_stats")
      .select("xp, current_streak, longest_streak, best_score, freezes, last_played_on")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) return null;
    return progressFromStatsRow(data);
  } catch {
    return null;
  }
}

// First sign-in on a device: fold local progress into the cloud, taking the max
// of local vs. any existing cloud row so a returning player on a new device
// can't lose their higher totals. Runs once (guarded by MIGRATED_KEY) and only
// ever *reads* local data — nothing is cleared.
export async function migrateLocalToCloud(user, client = supabase) {
  if (!user?.id) return { ok: false, error: new Error("not signed in") };

  try {
    if (await AsyncStorage.getItem(MIGRATED_KEY)) {
      return { ok: true, migrated: false, progress: await fetchProgress(user, client) };
    }

    const local = await loadProgress();
    const cloud = await fetchProgress(user, client);
    const merged = mergeProgress(local, cloud);

    const { error } = await client
      .from("user_stats")
      .upsert(statsRowFromProgress(user.id, merged), { onConflict: "user_id" });
    // Leave the flag unset on failure so the next sign-in retries the merge.
    if (error) return { ok: false, error };

    await AsyncStorage.setItem(MIGRATED_KEY, new Date().toISOString());
    return { ok: true, migrated: true, progress: merged };
  } catch (error) {
    return { ok: false, error };
  }
}
