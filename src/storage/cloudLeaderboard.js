// M2.6 step 3: the IO layer over `public.leaderboard_global` (M2.6 step 2's
// narrow public-read view). Mirrors cloudProgress.js's fetchRoundResults()
// shape — cloud-only, { rows, error }, no swallowed failures — since a
// leaderboard has no offline/local equivalent to fall back to.
//
// All row-shape mapping is pure and lives in game/leaderboardPolicy.js
// (entryFromLeaderboardRow); this file only does the fetch.
import { supabase } from "../lib/supabase";
import { entryFromLeaderboardRow, entryFromDailyLeaderboardRow } from "../game/leaderboardPolicy";

// Requires a signed-in user: the view grants `select` to `authenticated`
// only (anon gets nothing, same reasoning as the rest of the user domain),
// so there is nothing to fetch for a signed-out player.
export async function fetchGlobalLeaderboard(user, client = supabase) {
  if (!user?.id) return { rows: [], error: null };
  try {
    const { data, error } = await client
      .from("leaderboard_global")
      .select("user_id, display_name, xp")
      .order("xp", { ascending: false });
    if (error) return { rows: [], error };
    return { rows: (data ?? []).map(entryFromLeaderboardRow), error: null };
  } catch (error) {
    return { rows: [], error };
  }
}

// M2.6 step 5.3: the Daily Challenge counterpart, over `public.leaderboard_daily`
// (M2.6 step 5.1). `dayKeyString` is always the CALLER's own dayKey(new Date())
// (src/game/progress.js) — never a server-side "today" — since the view exposes
// `daily_date` as a plain column rather than filtering it itself, precisely so
// a player in Auckland and a player in Los Angeles each see their own calendar
// day's board instead of the database server's.
export async function fetchDailyLeaderboard(user, dayKeyString, client = supabase) {
  if (!user?.id) return { rows: [], error: null };
  try {
    const { data, error } = await client
      .from("leaderboard_daily")
      .select("user_id, display_name, daily_date, score")
      .eq("daily_date", dayKeyString)
      .order("score", { ascending: false });
    if (error) return { rows: [], error };
    return { rows: (data ?? []).map(entryFromDailyLeaderboardRow), error: null };
  } catch (error) {
    return { rows: [], error };
  }
}
