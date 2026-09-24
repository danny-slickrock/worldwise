// M2.6 step 6.1: the pure text builder behind the shareable Daily Challenge
// score card. Score/total are already known the moment a round ends
// (QuizScreen's onFinish payload); streak (progress.js) and rank (a Daily
// leaderboard fetch) are NOT available at that same instant — streak lives
// one level up in App.js's `progress`, and rank needs its own async
// leaderboard_daily lookup — so both are optional here. No RN, no Share API,
// no network: handing this string to a platform share sheet is a later step.
export function buildDailyShareText({ score, total, streak, rank } = {}) {
  const safeTotal = Number.isFinite(total) && total > 0 ? Math.floor(total) : 0;
  const safeScore =
    Number.isFinite(score) && score >= 0 ? Math.min(Math.floor(score), safeTotal) : 0;

  const lines = [`I scored ${safeScore}/${safeTotal} on today's Worldwise Daily Challenge 🌍`];
  if (Number.isFinite(streak) && streak > 0) {
    lines.push(`🔥 ${Math.floor(streak)}-day streak`);
  }
  if (Number.isFinite(rank) && rank > 0) {
    lines.push(`Ranked #${Math.floor(rank)} today`);
  }
  return lines.join("\n");
}
