// Pure progress logic — no React or storage imports, so it stays unit-testable.
// The shape saved to disk and held in App state:
//   xp            cumulative XP
//   streak        current daily streak, in consecutive *calendar days played*
//   longestStreak best streak ever reached (high-water mark)
//   bestScore     best single-round score
//   lastPlayedOn  "YYYY-MM-DD" of the last day a round finished (null if never)
//   freezes       banked streak-freezes that bridge a missed day
//
// Time is never read in here — callers pass "today" as a YYYY-MM-DD string
// (see dayKey) so the streak math stays pure and deterministic in tests.
import { STREAK_FREEZE_MAX, STREAK_FREEZE_EARN_EVERY } from "../constants";

export const DEFAULT_PROGRESS = {
  xp: 0,
  streak: 0,
  longestStreak: 0,
  bestScore: 0,
  lastPlayedOn: null,
  freezes: 0,
};

// Format a Date as a local-time YYYY-MM-DD key. "Calendar day" is judged from
// the player's own clock, which is what a streak should track.
export function dayKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Whole calendar days from one YYYY-MM-DD key to another. Uses UTC arithmetic on
// the date parts so it's immune to DST/timezone shifts.
function dayDiff(fromKey, toKey) {
  const [fy, fm, fd] = fromKey.split("-").map(Number);
  const [ty, tm, td] = toKey.split("-").map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86400000);
}

// Coerce anything read back from storage into a valid progress object, so a
// corrupt or partial payload can never crash the app or show NaN. Also migrates
// the old { xp, streak, bestScore } shape: longestStreak seeds from streak, and
// the new streak fields fall back to sensible defaults.
export function normalizeProgress(raw) {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_PROGRESS };
  const num = (v) => (typeof v === "number" && isFinite(v) && v >= 0 ? Math.floor(v) : 0);
  const dayStr = (v) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
  const streak = num(raw.streak);
  return {
    xp: num(raw.xp),
    streak,
    longestStreak: Math.max(num(raw.longestStreak), streak),
    bestScore: num(raw.bestScore),
    lastPlayedOn: dayStr(raw.lastPlayedOn),
    freezes: Math.min(STREAK_FREEZE_MAX, num(raw.freezes)),
  };
}

// Fold a finished round into the running totals. `today` is a YYYY-MM-DD key.
// XP and best score always update; the streak advances only when the calendar
// day changes, and a missed day is bridged by spending banked freezes.
export function applyRoundResult(progress, { score, xp }, today) {
  const p = normalizeProgress(progress);
  const next = { ...p, xp: p.xp + xp, bestScore: Math.max(p.bestScore, score) };

  if (!today) return next; // defensive: without a date, leave the streak untouched

  if (!p.lastPlayedOn) {
    next.streak = 1; // first round ever
  } else {
    const gap = dayDiff(p.lastPlayedOn, today);
    if (gap <= 0) {
      next.streak = p.streak; // already played today (or clock skew) — no change
    } else if (gap === 1) {
      next.streak = p.streak + 1; // consecutive day
    } else {
      const missed = gap - 1;
      if (p.freezes >= missed) {
        next.freezes = p.freezes - missed; // spend freezes to bridge the gap
        next.streak = p.streak + 1;
      } else {
        next.streak = 1; // streak lapsed — start fresh
      }
    }
  }
  // Never move lastPlayedOn backwards if the clock skewed into the past.
  next.lastPlayedOn = p.lastPlayedOn && dayDiff(p.lastPlayedOn, today) < 0 ? p.lastPlayedOn : today;

  // Earn a freeze when the streak grows into a milestone (never on a same-day replay).
  if (next.streak > p.streak && next.streak % STREAK_FREEZE_EARN_EVERY === 0) {
    next.freezes = Math.min(STREAK_FREEZE_MAX, next.freezes + 1);
  }
  next.longestStreak = Math.max(p.longestStreak, next.streak);
  return next;
}

// Describe the streak relative to `today` (a YYYY-MM-DD key) for the UI, without
// mutating anything. `count` is the live streak (0 once it has lapsed).
//   alive       the streak is still going (or can still be saved today)
//   playedToday a round already finished today
//   atRisk      alive but not yet played today — play to keep it
export function streakStatus(progress, today) {
  const { streak, lastPlayedOn, freezes } = normalizeProgress(progress);
  if (!lastPlayedOn) return { count: 0, alive: false, playedToday: false, atRisk: false, freezes };
  const gap = dayDiff(lastPlayedOn, today);
  if (gap <= 0) return { count: streak, alive: true, playedToday: true, atRisk: false, freezes };
  const alive = gap - 1 <= freezes; // freezes can still bridge the missed day(s)
  return { count: alive ? streak : 0, alive, playedToday: false, atRisk: alive, freezes };
}
