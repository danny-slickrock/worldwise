// PURE M2.8 step 2: practice preferences ⇄ the profiles row's own
// difficulty_pref/focus_regions/streak_goal columns, plus the first-sign-in
// merge policy. No storage/network imports — same discipline as
// interestSync.js, so every rule here is unit-testable in plain Node.
//
// Unlike profile_interests, this has no join table of its own: `profiles`
// already carried difficulty_pref/focus_regions as a deliberate M2.1 seam for
// this milestone (see docs/phase-2-data-model.md), and streak_goal is the one
// genuinely new column, added alongside this module.
import { normalizePracticePrefs, DEFAULT_PRACTICE_PREFS } from "./practicePrefsPolicy";

// Build the { difficulty_pref, focus_regions, streak_goal } patch for an
// UPDATE against the caller's own profiles row — never an upsert, since the
// M2.1 signup trigger already created that row for every account.
export function practicePrefsPatchFromPrefs(prefs) {
  const normalized = normalizePracticePrefs(prefs);
  return {
    difficulty_pref: normalized.difficulty,
    focus_regions: normalized.focusRegions,
    streak_goal: normalized.streakGoal,
  };
}

// Read the profiles row's own columns back into the practice-prefs shape.
export function practicePrefsFromProfileRow(row) {
  if (!row) return { ...DEFAULT_PRACTICE_PREFS };
  return normalizePracticePrefs({
    focusRegions: row.focus_regions,
    difficulty: row.difficulty_pref,
    streakGoal: row.streak_goal,
  });
}

// Reconcile local prefs against whatever's already on the profile row on
// first sign-in. Unlike mergeProgress's single "take the max" rule or
// mergeInterests' single "union" rule, each field here gets the merge that
// matches its own shape:
//   - focusRegions is a set a player can add to from either device, so it
//     unions (normalizePracticePrefs dedupes/orders the result) — never drop
//     a region either device focused on.
//   - streakGoal is a single number a player is reaching for, so the higher
//     of the two survives when both are set — the same "never cost someone
//     progress" reasoning mergeProgress applies to XP/streaks, aimed at a
//     goal instead of a running total.
//   - difficulty has no "bigger is better" direction ("all" isn't easier or
//     harder than "hard"), so there's nothing to combine: whichever side
//     actually chose one (differs from the default) wins, and an existing
//     cloud choice wins a genuine conflict, since it reflects whatever this
//     account already decided before this device ever weighed in.
export function mergePracticePrefs(local, cloud) {
  const localPrefs = normalizePracticePrefs(local);
  if (!cloud) return localPrefs;
  const cloudPrefs = normalizePracticePrefs(cloud);

  const focusRegions = [...localPrefs.focusRegions, ...cloudPrefs.focusRegions];

  const streakGoal =
    localPrefs.streakGoal == null
      ? cloudPrefs.streakGoal
      : cloudPrefs.streakGoal == null
        ? localPrefs.streakGoal
        : Math.max(localPrefs.streakGoal, cloudPrefs.streakGoal);

  const difficulty =
    cloudPrefs.difficulty !== DEFAULT_PRACTICE_PREFS.difficulty
      ? cloudPrefs.difficulty
      : localPrefs.difficulty;

  return normalizePracticePrefs({ focusRegions, difficulty, streakGoal });
}
