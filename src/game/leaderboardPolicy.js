// M2.6 step 1: leaderboard ranking policy — the pure decision layer over
// "who's ahead," given rows a caller has already fetched. No React Native or
// network import, so test/engine.test.js can exercise this directly under
// tsx — same discipline as every other pure game/ module. Where the rows
// come from (global XP totals, a Daily Challenge score, friends-only) is a
// later step's IO concern; this module only knows how to rank whatever
// { userId, displayName, value } list it's handed.
import { LEADERBOARD_TOP_N } from "../constants";

// M2.6 step 3: the row shape ⇄ policy shape mapping, pure so it can sit next
// to rankLeaderboard/topWithYou rather than inside the IO layer (mirrors
// cloudSync.js's statsRowFromProgress/progressFromStatsRow split). The IO
// layer (storage/cloudLeaderboard.js) fetches from `public.leaderboard_global`
// and knows nothing else about the mapping.
export function entryFromLeaderboardRow(row) {
  return {
    userId: row?.user_id ?? null,
    displayName: row?.display_name ?? null,
    value: row?.xp ?? 0,
  };
}

// M2.6 step 5.2: the same row ⇄ policy-shape mapping for
// `public.leaderboard_daily` rows, whose ranked column is `score` rather
// than `xp` (a Daily round's total is not an XP total). Kept as a sibling
// rather than a `valueKey` param on `entryFromLeaderboardRow`, since the two
// views' rows never mix in one call and a second small function reads
// clearer than a generic one guessing which column to reach for.
export function entryFromDailyLeaderboardRow(row) {
  return {
    userId: row?.user_id ?? null,
    displayName: row?.display_name ?? null,
    value: row?.score ?? 0,
  };
}

function sortedEntries(entries) {
  return [...(entries ?? [])]
    .map((entry) => ({ ...entry, value: entry?.value ?? 0 }))
    .sort((a, b) => {
      if (b.value !== a.value) return b.value - a.value;
      // Deterministic tie-break: without one, two tied players could swap
      // order on every re-render since Array.sort's stability only helps
      // when the input order itself is stable.
      const nameCompare = (a.displayName ?? "").localeCompare(b.displayName ?? "");
      if (nameCompare !== 0) return nameCompare;
      return (a.userId ?? "").localeCompare(b.userId ?? "");
    });
}

// Ranks a set of rows using competition ranking (1, 2, 2, 4 — not 1, 2, 2,
// 3): tied scores share a rank, and the next distinct score skips ahead by
// the number of ties. That's the convention every real leaderboard uses,
// since two people tied for 2nd means nobody is 3rd.
export function rankLeaderboard(entries, currentUserId) {
  const sorted = sortedEntries(entries);
  let rank = 0;
  let lastValue = null;
  return sorted.map((entry, index) => {
    if (lastValue === null || entry.value !== lastValue) {
      rank = index + 1;
      lastValue = entry.value;
    }
    return { ...entry, rank, isYou: currentUserId != null && entry.userId === currentUserId };
  });
}

// What a leaderboard screen actually renders: the top `limit` ranked rows,
// plus the current player's own ranked row when they didn't make the cut —
// a leaderboard should never tell a real, ranked player "you're nowhere."
export function topWithYou(entries, currentUserId, limit = LEADERBOARD_TOP_N) {
  const ranked = rankLeaderboard(entries, currentUserId);
  const rows = ranked.slice(0, limit);
  const you = ranked.find((entry) => entry.isYou) ?? null;
  return { rows, you, youInTop: rows.some((entry) => entry.isYou) };
}
