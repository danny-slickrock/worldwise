// M2.5 step 1: the achievement catalog (pure data: no RN, no network).
//
// Scoped deliberately narrow for this first chunk: badges mined entirely from
// signals progress.js and game_results already track (longest streak, rounds
// played, perfect rounds, game-mode variety) — no new schema, no new write
// path. Two milestone ideas are NOT here yet, on purpose:
//   - XP levels: a leveling curve is a game-balance decision (Danny should
//     weigh in), not something to invent inline with badge plumbing.
//   - Collectible sets ("all of South America"): game_results tags a round by
//     mode + difficulty, never by country, so "which countries has this
//     player gotten right" isn't a signal that exists today. That needs its
//     own scoped step (and likely a migration) before it can be built.
// Both are their own later steps in ROADMAP.md's M2.5 sub-checklist.
//
// Each entry's `metric` names a key achievementPolicy.js's computeAchievements
// computes from a player's progress + round history; `threshold` is the value
// that metric must reach to unlock. Order here is display order.
export const ACHIEVEMENTS = [
  {
    slug: "streak-3",
    label: "Getting Started",
    description: "Reach a 3-day streak",
    glyph: "◔",
    metric: "longestStreak",
    threshold: 3,
  },
  {
    slug: "streak-7",
    label: "One Week Strong",
    description: "Reach a 7-day streak",
    glyph: "◑",
    metric: "longestStreak",
    threshold: 7,
  },
  {
    slug: "streak-30",
    label: "Dedicated Explorer",
    description: "Reach a 30-day streak",
    glyph: "●",
    metric: "longestStreak",
    threshold: 30,
  },
  {
    slug: "rounds-10",
    label: "Warming Up",
    description: "Complete 10 rounds",
    glyph: "▹",
    metric: "roundsPlayed",
    threshold: 10,
  },
  {
    slug: "rounds-50",
    label: "Frequent Flyer",
    description: "Complete 50 rounds",
    glyph: "▸",
    metric: "roundsPlayed",
    threshold: 50,
  },
  {
    slug: "rounds-200",
    label: "World Traveler",
    description: "Complete 200 rounds",
    glyph: "▶",
    metric: "roundsPlayed",
    threshold: 200,
  },
  {
    slug: "perfect-1",
    label: "Flawless",
    description: "Finish a round with a perfect score",
    glyph: "✦",
    metric: "perfectRounds",
    threshold: 1,
  },
  {
    slug: "perfect-10",
    label: "Perfectionist",
    description: "Finish 10 rounds with a perfect score",
    glyph: "✧",
    metric: "perfectRounds",
    threshold: 10,
  },
  {
    slug: "modes-all",
    label: "Renaissance Explorer",
    description: "Play every game mode at least once",
    glyph: "◈",
    metric: "modesPlayed",
    threshold: 6, // flag, capital, capitalReverse, shape, locator, daily — see achievementPolicy.js
  },
];
