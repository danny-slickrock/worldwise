# CLAUDE.md — Worldwise

Guidance for Claude Code (and any AI collaborator) working in this repo.

## What this is

**Worldwise** is the flagship product of **Slickrock Studio**: a geography learning
platform that teaches *how the world works* through curiosity, context, and games —
not rote memorization. This repo is the **Phase 1 prototype**: a suite of geography
games for web + mobile.

Guiding principle: every feature should make someone more curious about the world.
Answer "why should I care?", not just "where is it?".

## Stack

- **Expo** (React Native + React Native Web) — one codebase runs on web, iOS, Android.
- Plain **JavaScript + JSX** (no TypeScript yet; `tsconfig.json` is for the parse/CI check only).
- **react-native-svg** for country outlines.
- Lightweight **state-based navigation** in `App.js` (no navigation library yet — add one
  deliberately when the screen count justifies it).

## Commands

```bash
npm install        # install deps
npm run web        # run in browser
npm start          # run on device via Expo Go (QR code)
npm test           # pure-logic engine tests (tsx, fast)
npm run typecheck  # tsc --noEmit parse/JSX check
npm run lint       # eslint (expo config)
npm run format     # prettier
```

Always keep `npm run web` and `npm test` green before committing.

## Architecture

```
App.js                     # App shell: state-based nav + global progress (xp/streak/best)
src/
  constants.js             # Tunable gameplay numbers (round length, options, XP formula)
  theme.js                 # Design tokens — the single source of visual truth
  data/countries.js        # Country dataset + flagUrl()/outlineUrl() helpers
  game/questions.js        # Quiz engine: buildRound(mode) + buildDaily() → question objects
  game/scoring.js          # computeXp(score) — single source of truth for XP
  components/QuizScreen.js  # One reusable quiz surface powering every mode
  screens/HomeScreen.js    # Game hub
test/engine.test.js        # Pure-logic tests (no RN imports)
```

**Data model.** A question is `{ type, country, prompt, correct, options[] }`.
Modes: `flag`, `capital`, `shape`, `daily` (a deterministic mixed round, seeded by date).

**Assets are loaded at runtime**, not bundled: flags from flagcdn.com, outlines from the
mapsicon project (see `data/countries.js`). Keeps the app light and the repo small.

## Conventions

- **Reuse `theme.js` tokens** for all colors/spacing/type — never hardcode hex in components.
- **Keep gameplay numbers in `constants.js`** and XP in `scoring.js` — no magic numbers in UI.
- **Maps are the hero.** Premium, timeless, map-first. Avoid childish or enterprise looks.
  Palette: deep navy `#1F3A5F`, teal `#2E6E7E`, earth `#9C6B3C`, warm off-white `#F7F4EE`.
- **Prefer runtime data sources** over large embedded assets as the dataset grows.
- **One reusable surface over many bespoke screens** (see `QuizScreen.js`).

## Working style

- **One `ROADMAP.md` item per session.** Keep changes scoped; commit with a clear message.
  This keeps token usage predictable and history readable.
- **Do not scope-creep into later phases.** No classrooms, curriculum, or AI features yet —
  Phase 1 is games only.
- **Every commit stays runnable** (`npm run web`) and **green** (`npm test`).
- When adding a game, extend the engine + `QuizScreen` rather than duplicating logic.

## Roadmap

See [ROADMAP.md](./ROADMAP.md) for the two-week plan. Next up: **Day 1 — persist XP/streak
locally (AsyncStorage)** so progress survives app restarts.

## The mission (don't lose this)

Worldwise exists to help people understand the world — not by memorizing facts, but by
discovering the stories, relationships, and context that make every place meaningful.
Geography is the first subject because it provides the context for every other discipline.
