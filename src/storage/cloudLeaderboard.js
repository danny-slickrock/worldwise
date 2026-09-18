// M2.6 step 3: the IO layer over `public.leaderboard_global` (M2.6 step 2's
// narrow public-read view). Mirrors cloudProgress.js's fetchRoundResults()
// shape — cloud-only, { rows, error }, no swallowed failures — since a
// leaderboard has no offline/local equivalent to fall back to.
//
// All row-shape mapping is pure and lives in game/leaderboardPolicy.js
// (entryFromLeaderboardRow); this file only does the fetch.
import { supabase } from "../lib/supabase";
import { entryFromLeaderboardRow } from "../game/leaderboardPolicy";

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
