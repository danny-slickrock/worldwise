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

Backend (Phase 2+, needs Docker for the local stack):

```bash
npx supabase start     # local Postgres + Auth on :54321 (Studio :54323)
npx supabase db reset  # reapply every migration from scratch locally — the real schema check
npx supabase db push   # apply migrations to the linked cloud project (needs the DB password)
npx supabase stop      # shut the local stack down
```

Always keep `npm run web` and `npm test` green before committing.

**Auth/DB changes deserve more than a green test run.** The tests are pure, so they never touch
Postgres, RLS, or the UI. Two checks have each already caught a real bug that tests and typecheck
both missed: `supabase db reset` against a local Postgres (RLS policies without table GRANTs =
"permission denied" on every query), and driving the actual app in a browser (a client option that
silently dropped every web auth callback). If a change touches the schema or the session, run them.

**Three ways a correct-looking schema still returns nothing.** Each of these fails identically from
the client — an empty result or a permission error — and none is caught by tests or typecheck:
1. **RLS without GRANTs.** A policy says *which rows*; it never grants the table. Missing grants =
   "permission denied" on every query. Grant explicitly in the migration.
2. **A schema PostgREST doesn't serve.** Only `public` + `graphql_public` are exposed by default, so
   a custom schema (`content`) 404s with flawless grants and RLS. `config.toml` fixes local; the
   cloud project needs it set by hand in the Dashboard, and **no migration can carry that setting**.
3. **RLS enabled with no policy for the command.** RLS defaults to deny, so a `select`-only policy
   is what makes content public-read *and* write-protected — the absence of a write policy is the
   protection, not an oversight.

## Architecture

```
App.js                     # App shell: tab nav (Home · Profile) + global progress + sync wiring
src/
  constants.js             # Tunable gameplay numbers (round length, options, XP formula)
  theme.js                 # Design tokens — the single source of visual truth
  data/countries.js        # Country dataset + flagUrl()/outlineUrl() helpers
  data/whyItMatters.js     # Per-country "why it matters" facts (the context card)
  data/countryPages.js     # M2.2 country-page content model: getCountryPage(code) + hero (Brazil).
                           #   Since M2.3.5 this is the SEED SOURCE for Postgres and the offline
                           #   baseline — the same data, serving both ends
  data/contentSource.js    # M2.3.5 IO: fetchCountry(code) — Supabase + AsyncStorage cache + fallback
  data/worldMap.js         # AUTO-GENERATED equirectangular country paths (Country Locator)
  game/questions.js        # Quiz engine: buildRound(mode) + buildDaily() → question objects
  game/scoring.js          # computeXp(score) — single source of truth for XP
  game/progress.js         # PURE progress/streak logic — no storage, no network
  game/cloudSync.js        # PURE local-shape ⇄ Postgres-row mapping + max-merge
  game/syncPolicy.js       # PURE: which sink gets a round; whether to migrate
  game/contentSync.js      # PURE country-page ⇄ content.countries row mapping (both directions)
  game/contentPolicy.js    # PURE content cache: keys, content_version freshness, fallback resolver
  game/mapZoom.js          # PURE zoom/pan math for the World Map screen (pinch/wheel/drag, clamped)
  game/mapHitTargets.js    # PURE bounding-box + enlarged tap targets for small countries on the World Map
  game/mapRegions.js       # PURE region bounds + scale/pan math for the World Map's region-zoom presets
  auth/redirectPolicy.js   # PURE auth-redirect selection
  auth/redirect.js         # Platform lookups feeding redirectPolicy
  auth/AuthProvider.js     # Session context: user/session/loading + sign-in/out
  lib/supabase.js          # Supabase client (env-configured; publishable key)
  storage/progress.js      # AsyncStorage progress cache
  storage/cloudProgress.js # Cloud IO: upsert stats, log results, migrateLocalToCloud()
  components/QuizScreen.js  # One reusable quiz surface powering every mode
  components/WorldMap.js    # Tappable SVG world map for the Country Locator (candidates/answer state)
  components/ExploreMap.js  # M2.3: tappable SVG world map for free exploration (no round/answer state)
  components/TabBar.js      # Bottom tabs — takes tabs as data, so it's extensible
  screens/HomeScreen.js    # Game hub
  screens/ProfileScreen.js # Signed-in identity + synced stats
  screens/SignInScreen.js  # Magic link + Continue with Google
  screens/CountryPageScreen.js # M2.2 country page: outline hero, facts, neighbors, related games
  screens/CountryIndexScreen.js # M2.2 browsable/searchable country index
  screens/WorldMapScreen.js # M2.3: tap-to-explore world map with pinch/scroll-zoom + drag-to-pan
supabase/migrations/       # Schema as code (user domain + content domain, RLS, signup trigger)
scripts/build-worldmap.mjs # One-off generator for data/worldMap.js (Natural Earth 110m)
scripts/seed-content.js    # Repeatable bundled-JSON → content.countries seed (npm run seed:content)
test/engine.test.js        # Pure-logic tests (no RN imports)
```

**The pure/IO split is the load-bearing convention.** `test/engine.test.js` runs in plain Node via
tsx, so anything it imports must not reach React Native, expo, or the network. That's why each
piece of cloud/auth logic is split in two: the *decision* is pure and tested (`cloudSync.js`,
`syncPolicy.js`, `redirectPolicy.js`), and the *IO* sits beside it (`cloudProgress.js`,
`redirect.js`). Put new logic on the pure side by default; a module that imports RN can't be
tested here at all.

**Data model.** A question is `{ type, country, prompt, correct, options[] }`.
Modes: `flag`, `capital`, `capitalReverse`, `shape`, `locator`, `daily` (a deterministic mixed round, seeded by date).
`locator` also carries `choices[]` ({code, name}) — its answer surface is a tappable world map, not text options.

**Assets are loaded at runtime**, not bundled: flags from flagcdn.com, outlines from the
mapsicon project (see `data/countries.js`). Keeps the app light and the repo small.

## Conventions

- **Reuse `theme.js` tokens** for all colors/spacing/type — never hardcode hex in components.
- **Keep gameplay numbers in `constants.js`** and XP in `scoring.js` — no magic numbers in UI.
- **Maps are the hero.** Premium, timeless, map-first. Avoid childish or enterprise looks.
- **The surface language is dark, tactile slabs.** Deep navy-charcoal base (`bg`), lifted
  cards (`surface`), and depth expressed as `depth()` — a solid, un-blurred bottom edge —
  never a blurred shadow. Section labels are all-caps and tight-tracked (`type.section`).
  Bright accents (`teal`/`earth`/`sand`/`sky`/`iris`/`leaf`) carry text on the dark
  surfaces *and* double as button fills, in which case the text on top is `navyDeep`, not
  white. `test/engine.test.js` guards both directions at WCAG AA, so a new accent has to
  earn its brightness. `navy`/`navyDeep` are now structure (map stages, insets, chrome),
  not accents.
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

See [ROADMAP.md](./ROADMAP.md). **Phase 1 is complete** — all four load-bearing items shipped
(A: calendar-aware streaks · B: richer results · C: per-country context cards · D: tab bar).
Polish, extra game modes, and onboarding stay in the backlog — they are *not* a gate.

We are in **Phase 2** (Supabase; see [docs/phase-2-data-model.md](./docs/phase-2-data-model.md)).
**M2.1 — accounts & cloud sync is complete and verified in production:** the user-domain migration
with RLS is applied to the live project, and a real sign-in syncs progress, runs the one-time
local→cloud merge, and writes finished rounds to `game_results`. Vercel carries the Supabase env
vars (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`).

**M2.2 — country pages is fully done**, including its "from the map" entry point. We're now
mid-**M2.3 — interactive maps:** pan/zoom world and region maps, tap a place to explore it. Step 1
(a static tap-to-explore World Map screen), step 2 (pinch/scroll-to-zoom, drag-to-pan, and
bounds/reset), step 3 (tap affordance polish: hover highlight, larger hit targets for small
countries, and a tap-point country-name label), and step 4 (wiring the M2.2 map entry point both
ways — tap-to-country-page from the map, and a "View on map" link back from any country page) are
all done. **Now on step 5: region maps** (zoomed presets like "Europe"/"Africa" for focused
exploration) — the pure region-bounds + viewport math (`src/game/mapRegions.js`) and the region-picker
UI on the World Map screen are both done (a "World" + five-region pill row that jumps scale/pan to
each preset); next up is step 5's polish sub-step (animating the jump, active-region label, and
picker/manual-gesture coexistence).

**M2.3.5 — content backend is code-complete and verified locally, not yet live.** Country content
now has a public-read `content.*` schema, a repeatable seed (`npm run seed:content`), and a fetch
layer that caches per country against `content_version` and falls back to bundled JSON. The bundled
dataset did *not* go away — it's the seed source and the offline baseline at once, so both agree by
construction.

Verified end-to-end on a local Postgres: migration applied from scratch, seeded, public read
confirmed, writes denied for anon *and* authenticated, and an edit made directly in Postgres
appeared on a country page in the browser — then a second edit's version bump invalidated the cache
and the app refetched. Applying it to the live project needs the DB password and the service-role
key, so those steps are Danny's — see **DANNY TO DO** in ROADMAP.md.

Phase 2 is milestone-based, not day-by-day — take one scoped, reviewable chunk at a time.

## The mission (don't lose this)

Worldwise exists to help people understand the world — not by memorizing facts, but by
discovering the stories, relationships, and context that make every place meaningful.
Geography is the first subject because it provides the context for every other discipline.
