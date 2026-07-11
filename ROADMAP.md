# Worldwise — Two-Week Build Plan (Phase 1)

Small, scoped chunks — one focused commit per day to keep token usage low and progress steady.
Each day builds on the last. **Day 0 (today)** is the initial prototype in this repo.

Legend: 🎮 game · 🧱 foundation · 💾 data · ✨ polish · 🧪 quality

| Day | Focus | Deliverable |
|-----|-------|-------------|
| **0** ✅ | 🧱 Prototype | Expo scaffold, quiz engine, Home hub, Flag + Capital + Shape games, Daily Challenge |
| **1** ✅ | 💾 Persistence | Save XP / streak / best scores locally (AsyncStorage) so progress survives restarts |
| **2** ✅ | 💾 Data | ~~Expand dataset to ~100 countries~~ → **done early: full 196-country dataset landed.** Difficulty tiers (easy/medium/hard) added per country, selectable on Home before Flag/Capital/Shape |
| **3** | 🎮 Game | Capital Quiz reverse mode ("which country has this capital?") + timed option |
| **4** | 🎮 Game | Add **Country Locator** (tap the country on a mini map) using an SVG world map |
| **5** | ✨ Polish | Answer animations, haptics on mobile, sound toggle, smoother transitions |
| **6** | 🧱 Streaks | Real daily-streak logic (calendar-aware), "come back tomorrow" state, streak freeze |
| **7** | 🎮 Game | **Landmark / photo guess** mode (image → country) with a small landmark set |
| **8** | ✨ Results | Richer end-of-round screen: per-question review, "why it matters" context blurb |
| **9** | 🧱 Navigation | Introduce a proper tab bar (Home · Play · Profile) and a game-select screen |
| **10** | 💾 Content | Per-country "context card" (one paragraph on why the place matters) shown after answers |
| **11** | 🎮 Game | **Speed Round** — 60-second mixed sprint with combo multipliers |
| **12** | ✨ Onboarding | First-run welcome, difficulty pick, and a short "how to play" |
| **13** | 🧪 Quality | Accessibility pass, empty/offline states, error handling for image loads |
| **14** | 🧪 Ship | Web deploy (Expo web build), README/screenshots, tag `v0.1` |

**Next up:** Day 3 — Capital Quiz reverse mode ("which country has this capital?") + a timed option.

## How the daily builds run

Once the **GitHub connector** is authorized, a scheduled morning task will, each day:

1. Pull the latest `main`.
2. Implement that day's scoped item from this roadmap.
3. Commit with a clear message and push.
4. Leave a one-line note on what's next.

To keep token usage predictable, each run is intentionally limited to a single roadmap item.
You can review the commit each morning and steer the next day if priorities change.

## Guardrails

- **One item per day.** No scope creep into later phases (no classroom/AI yet).
- **Keep it runnable.** Every commit should `npm run web` cleanly.
- **Data stays light.** Prefer runtime image/data sources over huge embedded assets.
- **Design consistency.** Reuse `theme.js` tokens; maps stay the hero.

## Parked for Phase 2 (not now)

Ideas raised during Phase 1 that are deliberately out of scope until games are solid:

- **Accounts & login** — so progress follows a person across devices. Day 1's local
  persistence is the on-ramp; syncing it to an account is the Phase 2 step.
- **Sharing** — share a Daily Challenge result / score card.
- **Personalization** — pick regions to focus on, difficulty, streak goals.

These need their own design pass (auth provider, backend, privacy) before any build.
