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
App.js                     # App shell: holds ONE nav object (game/navigation.js) + global
                           #   progress/settings/interests + sync wiring. Renders the current
                           #   route inside AppChrome; no per-screen `returnTo` bookkeeping
src/
  constants.js             # Tunable gameplay numbers (round length, options, XP formula)
  theme.js                 # Design tokens — the single source of visual truth
  data/countries.js        # Country dataset + flagUrl()/outlineUrl() helpers
  data/whyItMatters.js     # Per-country "why it matters" facts (the context card)
  data/learningPaths.js    # M2.4 step 1: learning-path content model — one path per region, nodes
                           #   ordered easy→hard, derived from countries.js. getLearningPath(id)
  data/countryPages.js     # M2.2 country-page content model: getCountryPage(code) + hero (Brazil).
                           #   Since M2.3.5 this is the SEED SOURCE for Postgres and the offline
                           #   baseline — the same data, serving both ends
  data/contentSource.js    # M2.3.5 IO: fetchCountry(code) — Supabase + AsyncStorage cache + fallback
  data/interests.js        # M2.3.6: interest catalog — stable slug + label + glyph, display order
  data/achievements.js     # M2.5 step 1: badge catalog — slug/label/description/glyph/metric/threshold
  data/worldMap.js         # AUTO-GENERATED equirectangular country paths (Country Locator)
  data/worldGeo.js         # M2.3.7: the globe's geometry — worldMap.js's pixels inverted back to
                           #   unit vectors at module load. Derived, never hand-edited
  game/questions.js        # Quiz engine: buildRound(mode) + buildDaily() → question objects
  game/scoring.js          # computeXp(score) — single source of truth for XP
  game/progress.js         # PURE progress/streak logic — no storage, no network
  game/cloudSync.js        # PURE local-shape ⇄ Postgres-row mapping + max-merge
  game/syncPolicy.js       # PURE: which sink gets a round (or an interest write); whether to migrate
  game/contentSync.js      # PURE country-page ⇄ content.countries row mapping (both directions)
  game/contentPolicy.js    # PURE content cache: keys, content_version freshness, fallback resolver
  game/navigation.js       # PURE nav core: per-tab stacks (push/pop/switch/replace), route⇄URL
                           #   serialization, and popstate reconciliation. The single source of
                           #   truth for where you are and what Back means
  game/layout.js           # PURE responsive-chrome policy: bottom bar vs side rail, rail width,
                           #   whether the rail spells out its labels. One breakpoint decision
  game/interestPolicy.js   # PURE M2.3.6: validate/normalize an interest selection against the catalog
  game/interestSync.js     # PURE M2.3.6: interest slugs ⇄ profile_interests rows, union-merge, diff
  game/mapZoom.js          # PURE zoom/pan math for the World Map screen (pinch/wheel/drag, clamped)
  game/mapHitTargets.js    # PURE bounding-box + enlarged tap targets for small countries on the World Map
  game/mapRegions.js       # PURE region bounds + scale/pan math for the World Map's region-zoom presets
  game/globeProjection.js  # PURE M2.3.7: orthographic projection, horizon clipping, limb arcs,
                           #   the graticule (lat/lng grid, step 4.2)
  game/globeMotion.js      # PURE M2.3.7: spin/wrap/clamp, antimeridian-safe region centers + framing
  game/masteryPolicy.js    # PURE M2.4 step 2: computeNodeStates(path, results) — locked/unlocked/
                           #   mastered per node, mined from game_results' per-round score/difficulty
  game/achievementPolicy.js # PURE M2.5 step 1: computeAchievements(progress, results) — badge
                           #   unlock state + progress ratio, mined from progress.js/game_results
  auth/redirectPolicy.js   # PURE auth-redirect selection
  auth/redirect.js         # Platform lookups feeding redirectPolicy
  auth/AuthProvider.js     # Session context: user/session/loading + sign-in/out
  lib/supabase.js          # Supabase client (env-configured; publishable key)
  lib/history.js           # Web-history IO for navigation.js — pushState/popstate. No-op on native
  storage/progress.js      # AsyncStorage progress cache
  storage/cloudProgress.js # Cloud IO: upsert stats, log results, migrateLocalToCloud()
  storage/interests.js     # M2.3.6: AsyncStorage interest-selection cache
  storage/cloudInterests.js # M2.3.6 IO: fetch/push profile_interests rows, migrateLocalInterestsToCloud()
  components/QuizScreen.js  # One reusable quiz surface powering every mode
  components/WorldMap.js    # Tappable SVG world map for the Country Locator (candidates/answer state)
  components/ExploreMap.js  # M2.3: flat tappable world map. SUPERSEDED by GlobeMap on the Explore
                           #   screen (M2.3.7); kept as the fallback until the globe is checked on a device
  components/GlobeMap.js    # M2.3.7: the globe — reprojects per frame, back face genuinely absent
  components/AppChrome.js   # The persistent nav shell: wraps the current screen, swaps
                           #   TabBar↔NavRail on layout.js's breakpoint. chrome={false} = focus mode
  components/TabBar.js      # Bottom tabs (mobile) — takes tabs as data, so it's extensible
  components/NavRail.js     # Left rail (desktop) — same data contract as TabBar, icons-only when narrow
  screens/HomeScreen.js    # Game hub
  screens/ProfileScreen.js # Signed-in identity + synced stats
  screens/SignInScreen.js  # Magic link + Continue with Google
  screens/InterestsScreen.js # M2.3.6 step 1: "what are you curious about?" multi-select + Skip
  screens/CountryPageScreen.js # M2.2 country page: outline hero, facts, neighbors, related games
  screens/CountryIndexScreen.js # M2.2 browsable/searchable country index
  screens/WorldMapScreen.js # M2.3: tap-to-explore world map with pinch/scroll-zoom + drag-to-pan
  screens/LearningPathScreen.js # M2.4: nav seam (step 3) + mastery states/tapping a node (step 4)
                           #   + a region-pill row generalizing to all five paths (step 5)
                           #   + fade/rise-in + fade/settle-out transitions (step 6.4)
  screens/AchievementsScreen.js # M2.5 step 2: nav seam — plain badge-catalog list, minimal until
                           #   step 3 adds locked/unlocked state via achievementPolicy.js
supabase/migrations/       # Schema as code (user domain + content domain, RLS, signup trigger)
scripts/build-worldmap.mjs # One-off generator for data/worldMap.js (Natural Earth 110m)
scripts/seed-content.js    # Repeatable bundled-JSON → content.countries seed (npm run seed:content)
test/engine.test.js        # Pure-logic tests (no RN imports)
```

**Navigation is a real stack, per tab.** `src/game/navigation.js` holds four tabs (Home · Learn ·
Explore · Profile), each with its own route stack; everything else is pushed onto the active one.
Switching tabs preserves the others, so a detour costs nothing. This replaced a hand-rolled
`returnTo`/`returnPathId` field that could only ever describe one hop back — which is why
Learning Path → Country → Play → exit used to land on Home. Three rules worth keeping:
- **Add a route to `ROUTES` *and* to `routeToPath`/`pathToRoute`.** A test asserts every route in
  the table round-trips through a URL, so a route with no path is a failing test, not a silent gap.
- **Pushing a tab root switches tabs instead of stacking** — that's what stops the Learn tab from
  ever sitting on top of itself with a Back button in between.
- **`chrome: false` is focus mode**, and the quiz is the only route that uses it. Every other
  surface keeps the tab bar/rail; a full-screen takeover with no way out but Back was the old
  behaviour and the main thing that read as clunky.

**Responsive is one decision, not two layouts.** `src/game/layout.js`'s `chromeLayout(width)` picks
bottom-bar vs side-rail; `TabBar` and `NavRail` share a data contract so `AppChrome` swaps one child.
Don't branch on width anywhere else — `theme.js`'s `constrain` still owns how wide *content* gets,
and `layout.js` owns the shape of the *chrome* around it.

**The pure/IO split is the load-bearing convention.** `test/engine.test.js` runs in plain Node via
tsx, so anything it imports must not reach React Native, expo, or the network. That's why each
piece of cloud/auth logic is split in two: the *decision* is pure and tested (`cloudSync.js`,
`syncPolicy.js`, `redirectPolicy.js`, `interestSync.js`), and the *IO* sits beside it
(`cloudProgress.js`, `redirect.js`, `cloudInterests.js`). Put new logic on the pure side by default;
a module that imports RN can't be tested here at all.

**Data model.** A question is `{ type, country, prompt, correct, options[] }`.
Modes: `flag`, `capital`, `capitalReverse`, `shape`, `locator`, `daily` (a deterministic mixed round, seeded by date).
`locator` also carries `choices[]` ({code, name}) — its answer surface is a tappable world map, not text options.

**Assets are loaded at runtime**, not bundled: flags from flagcdn.com, outlines from the
mapsicon project (see `data/countries.js`). Keeps the app light and the repo small.

## Conventions

- **Reuse `theme.js` tokens** for all colors/spacing/type — never hardcode hex in components.
  `theme.js` is the Slickrock **Brand Identity Kit v1.1 / UI Kit v1.0** expressed in code, and the
  kit's own first rule applies: semantic names, not literals — `colors.surfaceRaised`, never
  `"#FFFFFF"`.
- **Keep gameplay numbers in `constants.js`** and XP in `scoring.js` — no magic numbers in UI.
- **Maps are the hero.** Premium, timeless, map-first. Avoid childish or enterprise looks.
- **The app is light; the map is dark.** Warm off-white (`surface`) is "the page the world is
  printed on", cards are white (`surfaceRaised`), body copy is ink (`text`), and navy (`brand`) is
  authority — wordmark, headings, primary buttons, active nav. The *one* surface that stays dark is
  the map: ocean `map.ocean`, land `map.land`, sand graticule and borders. Reaching for `map.*` means
  you are deliberately entering that dark stage; a dark token anywhere else is a mistake.
  Roughly **70% neutral, 25% navy, 5% accent, one accent per screen.**
- **Depth is `elevation(1|2|3)`** — real soft shadows (e1 rest · e2 hover · e3 overlay), navy-tinted
  so they stay in palette on warm paper. The old `depth()` solid bottom lip is gone: a solid
  extrusion is a dark-UI trick that reads as a printing error on off-white. Most separation is
  actually done by `hairline`, not by shadow. Never nest two elevations.
- **Weight lives in the font family, not `fontWeight`.** `fonts.display` is `Archivo_600SemiBold`,
  `fonts.bodySemi` is `InstrumentSans_600SemiBold`, and so on. Each Google font weight registers as
  its own family declared at weight `normal`, so adding `fontWeight: "700"` on top makes the browser
  synthesise a second, fake bold. Pick the family; never set `fontWeight` in a component.
- **Three typefaces, three jobs.** Archivo = display (wordmark, headings, numerals). Instrument Sans
  = body, UI labels, buttons. IBM Plex Mono = coordinates, eyebrows, map labels, data — **never
  sentences**. `type.eyebrow` (mono, uppercase, 12% tracked) is this UI's structural voice.
- **Spacing is a 4px base** (`spacing(n) === n * 4`), scale 4·8·12·16·24·32·48·64, "never an odd
  value". Card padding 24 mobile / 32 desktop; section rhythm 64/88.
- **A label on a fill goes through `onFill(fill)`.** Every brand fill carries white except `sand`,
  which carries ink — white on sand is 2.3:1. That rule lives in one function so no component has to
  remember it, and `test/engine.test.js` drives its checks through the same function.
- **Sand is never text on light** (2.1:1). It is graticules, grids, and highlights on navy.
  `success` is UI/large-text only and must be paired with an icon, never colour alone. `textMuted` is
  labels and captions, not body copy — it lands at 4.40:1 on the off-white page, just under AA, and
  the tests pin that deliberately.
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

**M2.2 — country pages is fully done**, including its "from the map" entry point. **M2.3 —
interactive maps — is now fully done too:** step 1 (a static tap-to-explore World Map screen), step
2 (pinch/scroll-to-zoom, drag-to-pan, and bounds/reset), step 3 (tap affordance polish: hover
highlight, larger hit targets for small countries, and a tap-point country-name label), step 4
(wiring the M2.2 map entry point both ways — tap-to-country-page from the map, and a "View on map"
link back from any country page), and step 5 (region maps: the pure region-bounds + viewport math in
`src/game/mapRegions.js`, the "World" + five-region pill row on the World Map screen, and the polish
pass — animating the scale/pan jump via `lerpView()` in `src/game/mapZoom.js`, an active-region label
on the map, and clearing the active pill on a manual pinch/drag/wheel so it never claims a match it
no longer has) are all shipped and verified in a real browser.

**M2.3.6 — learner interests is fully done end to end** (prompt screen, pure catalog +
policy module, `profile_interests` schema migration, the offline-first sync seam, and a real
"Interests" settings row on Profile, replacing the temporary preview CTA, that shows a live
selection summary and reopens `InterestsScreen` seeded with whatever's already picked).
**M2.3.7 — the globe** (replacing the flat Explore map with a spinnable orthographic globe) has
landed step 1 (the globe itself) and all of step 4's polish: 4.1 ("spin to this country" from a
country page), 4.2 (the lat/lng graticule), 4.3 (a soft atmosphere/limb glow ringing the sphere's
silhouette), and 4.4 (spin momentum — a released drag/flick coasts and eases to a stop instead of
stopping dead) — see `src/components/GlobeMap.js` and `src/game/globeMotion.js`. Steps 2 (wiring
the Country Locator game onto the globe) and 3 (device verification) stay blocked on a product
call and a real device, respectively, so M2.3.7 has no unblocked work left until one of those
lands. M2.3.5 — content backend remains code-complete but blocked purely on Danny's live-project
steps (see below); no more code to write there until those land. M2.9 (the AI knowledge hub) is
next in milestone order after M2.3.7, but its own DANNY TO DO lead-time items (Anthropic API key
as an Edge Function secret, a spend cap, confirming the Supabase plan covers Edge Functions +
pgvector, and picking an embedding model)
aren't yet in place — check ROADMAP.md's DANNY TO DO section before starting its sub-checklist.
With M2.3.5, M2.3.7, and M2.9 all blocked on human-only steps, **M2.4 — learning paths** is now
the lowest-numbered milestone with unblocked work. It has a fresh ordered sub-checklist; step 1
(the pure content model, `src/data/learningPaths.js` — one path per region, walking
broad-to-specific via `countries.js`'s existing `region`/`difficulty` fields) and step 2 (the
mastery policy, `src/game/masteryPolicy.js` — `computeNodeStates(path, results)` mines a node's
locked/unlocked/mastered state from `game_results`' per-round score/difficulty, since that's the
finest signal tracked today; no new per-country stat or migration needed) step 3 (the
navigation seam — `openLearningPath(pathId)` opens `src/screens/LearningPathScreen.js` as a
full-screen overlay, same `openX`/`returnTo` pattern as country pages and the world map), and step 4
(the hero screen: node rows now show real locked/unlocked/mastered state from `masteryPolicy.js`'s
`computeNodeStates()`, fed by a new `fetchRoundResults(user)` in `src/storage/cloudProgress.js`
— cloud-only, since local storage never kept per-round history; tapping an unlocked or mastered node
opens that country's page via the same `returnTo` seam, reusing `CountryPageScreen`'s own Play
buttons rather than building a per-country round type), and step 5 (generalizing beyond the
temporary Africa-only Home tile: `LearningPathScreen` grew its own region-pill row, mirroring the
World Map's, so its one Home tile reaches all five paths by switching pills on the far side; the
World Map's existing region pills do double duty too — the active-region label over the globe is
now a `Pressable` that opens that region's path directly) are all done. Step 6 (the polish + a11y
pass) is fully done: step 6.1 (WCAG AA contrast audit — `success`/`error` as text now join the
existing accent sweep in `test/engine.test.js`; both already passed, so no token changed), step
6.2 (large tap targets — audited in a real browser; the Back button and region-pill chips already
carry `hitSlop` from steps 3/5, and node rows already clear 44×44 from their own content, so
nothing needed to change), step 6.3 (offline/error states — `fetchRoundResults(user)` now
returns `{ rows, error }` instead of swallowing a failed fetch into the same `[]` a genuine
no-history read produces, and `LearningPathScreen` shows a "couldn't load your progress" notice
for a signed-in player instead of silently mislabeling every locked tier), and step 6.4
(transitions — `LearningPathScreen` had shipped with no motion at all, since it was built after the
cross-cutting `FadeInUp` pass; it now gets a screen-level fade/rise-in/fade/settle-out, the same
shape `CountryPageScreen` uses, plus staggered `FadeInUp` groups for its header and node list).
**M2.4 — learning paths is now fully done end to end.**

**Next up:** with M2.3.5, M2.3.7, and M2.9 all blocked on human-only steps and M2.4 now done,
**M2.5 — Achievements, collections & deeper gamification** is the lowest-numbered milestone with
unblocked work. It now has an ordered sub-checklist, and step 1 — the badge catalog + pure policy
layer (`src/data/achievements.js` + `src/game/achievementPolicy.js`, mined entirely from existing
`progress.js`/`game_results` signals: streak, rounds-played, perfect-round, and mode-variety
badges, no new schema) and step 2 (the navigation seam — an `achievements` route in
`src/game/navigation.js`, owned by the Profile tab, reached with `go({ name: "achievements" })`
and rendered by `App.js`; `src/screens/AchievementsScreen.js` is deliberately minimal, a plain
list off the badge catalog with no locked/unlocked state yet, reachable today via a temporary
"Achievements (preview)" link on Profile) are done. XP levels and region collectible sets are
deliberately their own later steps rather than folded into step 1. Next up in M2.5 is step 3, the
hero screen — wiring `computeAchievements()` and `fetchRoundResults(user)` into a real badge grid
with progress bars, replacing this minimal list.

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
