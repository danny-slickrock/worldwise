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
npm run build:brand   # rasterize the app icon / adaptive icon / favicon / splash
                      #   from src/game/brandMark.js. Only needed if the mark changes
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
  data/contentSource.js    # M2.3.5 IO: fetchCountry(code) — Supabase + AsyncStorage cache + fallback.
                           #   Since the country-photo work it also embeds the approved hero row, so
                           #   country + photo share one request and one cache entry
  data/interests.js        # M2.3.6: interest catalog — stable slug + label + glyph, display order
  data/countryTopics.js    # Country-page fact sections: allowlist + label + glyph (colours in theme)
  data/achievements.js     # M2.5 step 1: badge catalog — slug/label/description/glyph/metric/threshold
  data/worldMap.js         # AUTO-GENERATED equirectangular country paths (Country Locator)
  data/worldGeo.js         # M2.3.7: the globe's geometry — worldMap.js's pixels inverted back to
                           #   unit vectors at module load. Derived, never hand-edited
  game/questions.js        # Quiz engine: buildRound(mode) + buildDaily() → question objects
  game/scoring.js          # computeXp(score) — single source of truth for XP
  game/higherLower.js      # PURE Higher or Lower: fair-pair comparison, round building, the
                           #   superlinear streak bonus, and the value readout
  data/countryMetrics.js   # Bundled comparable numbers (population, area, land borders) derived
                           #   from countryContent.js — synchronous, no network
  game/progress.js         # PURE progress/streak logic — no storage, no network
  game/cloudSync.js        # PURE local-shape ⇄ Postgres-row mapping + max-merge
  game/syncStatus.js       # PURE M2.1: sync-health state machine — idle/ok/retrying/failed, and
                           #   describeSyncState() deciding what the player is told
  game/syncStore.js        # M2.1: the session's observable sync-health store. Mutable but RN-free
                           #   on purpose, so the pure suite can drive it
  game/syncPolicy.js       # PURE: which sink gets a round (or an interest write); whether to migrate
  game/contentSync.js      # PURE country-page ⇄ content.countries row mapping (both directions)
  game/contentPolicy.js    # PURE content cache: keys, content_version freshness, fallback resolver
  game/mediaPolicy.js      # PURE country photos: Wikidata P18 → Commons title, licence extraction,
                           #   Storage key/URL derivation, the credit line, and the transform-URL
                           #   ladder. Imported by BOTH the Node ingest script and the app
  game/brandMark.js        # PURE geometry for the compass mark: star points, ring, the
                           #   orthographic graticule, the three tones, and the kit's
                           #   level-of-detail rule. Shared by the RN component AND the Node
                           #   rasterizer — one source, so the app icon and the loading mark
                           #   are provably the same shape
  game/navigation.js       # PURE nav core: per-tab stacks (push/pop/switch/replace), route⇄URL
                           #   serialization, and popstate reconciliation. The single source of
                           #   truth for where you are and what Back means
  game/layout.js           # PURE responsive-chrome policy: bottom bar vs side rail, rail width,
                           #   whether the rail spells out its labels. One breakpoint decision
  game/interestPolicy.js   # PURE M2.3.6: validate/normalize an interest selection against the catalog
  game/interestPrompt.js   # PURE M2.3.6 step 6: the sign-up prompt gate — asked once, a skip counts
                           #   as answered, never re-nagged. Also owns Skip-vs-Cancel for the screen's
                           #   two contexts (step 7)
  game/contentChunks.js    # PURE M2.9 step 2: country row → retrievable chunks. Every chunk names
                           #   its country; indexes are positional (the upsert key)
  game/ragRanking.js       # PURE M2.9 step 3: interest-aware re-rank. Re-rank never filter; zero
                           #   interests degrades to the general ordering
  game/ragPrompt.js        # PURE M2.9 step 3: the grounding contract, source formatting, citation
                           #   parsing, and the measured similarity floor
  game/askLimits.js        # PURE M2.9 step 3-4: question validation, sliding-window rate limit,
                           #   and the durable per-user daily cap
  game/askGuardrails.js    # PURE M2.9 step 4: narrow safety screen. Matches requests for harmful
                           #   instructions, never topics — geography is legitimately full of war
  game/interestSync.js     # PURE M2.3.6: interest slugs ⇄ profile_interests rows, union-merge, diff
  game/mapZoom.js          # PURE zoom/pan math for the World Map screen (pinch/wheel/drag, clamped)
  game/globeRaster.js      # PURE inverse orthographic: for every pixel in the disc, which point of
                           #   the Earth is there? Fills an RGBA buffer from an equirectangular source
  game/mapLabels.js        # PURE label geometry: monospaced text width, and placing a hover tooltip
                           #   so it never covers the country it names or runs off the viewBox
  game/terrainTint.js      # PURE terrain classifier: reads a country's own Factbook climate and
                           #   landform prose (moisture, relief, the far north) with latitude as the
                           #   thermal axis. Latitude alone is only the fallback
  data/countryTerrain.js   # code → terrain class, resolved once from countryContent.js
  game/countryRound.js     # PURE "Play with X": the fact questions (borders, region, population,
                           #   area) that make a round about ONE country
  game/mapHitTargets.js    # PURE bounding-box + enlarged tap targets for small countries on the World Map
  game/mapRegions.js       # PURE region bounds + scale/pan math for the World Map's region-zoom presets
  game/globeProjection.js  # PURE M2.3.7: orthographic projection, horizon clipping, limb arcs,
                           #   the graticule (lat/lng grid, step 4.2)
  game/globeMotion.js      # PURE M2.3.7: spin/wrap/clamp, antimeridian-safe region centers + framing
  game/locatorRound.js     # PURE M2.3.7 step 2: Country Locator on the globe — neighbourhood
                           #   candidate selection, framing so all choices are visible, fill states,
                           #   and non-overlapping tap geometry
  game/masteryPolicy.js    # PURE M2.4 step 2: computeNodeStates(path, results) — locked/unlocked/
                           #   mastered per node, mined from game_results' per-round score/difficulty
  game/achievementPolicy.js # PURE M2.5 step 1: computeAchievements(progress, results) — badge
                           #   unlock state + progress ratio, mined from progress.js/game_results
  game/levelPolicy.js      # PURE M2.5 step 5: computeLevel(xp) — an escalating leveling curve off
                           #   LEVEL_XP_BASE/LEVEL_XP_GROWTH (constants.js): current level, XP
                           #   banked toward the next, and a 0..1 progress ratio
  game/collectionPolicy.js # PURE M2.5 step 6.2: computeCollections(results, countries) — folds
                           #   game_results.countries into per-region collected/total/progress,
                           #   mined the same way masteryPolicy/achievementPolicy are. No UI yet
  hooks/useGlobeGestures.js # Drag-to-spin, pinch/wheel-to-zoom and flick momentum for a GlobeMap.
                           #   Used by BOTH the Explore map and the Country Locator
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
  components/WorldMap.js    # Flat tappable world map. SUPERSEDED by GlobeMap for the Country
                           #   Locator (M2.3.7 step 2); kept until the globe is checked on a device
  components/ExploreMap.js  # M2.3: flat tappable world map. SUPERSEDED by GlobeMap on the Explore
                           #   screen (M2.3.7); kept as the fallback until the globe is checked on a device
  components/GlobeMap.js    # M2.3.7: the globe — reprojects per frame, back face genuinely absent.
                           #   Terrain-shaded by climate band; hover tooltip; optional highlightCode
  components/CountryGlobe.js # The country page's hero: the globe spun to this country, lit up
  components/GlobeCard.js   # The globe on Home — the same GlobeMap and gestures, not a picture.
                           #   Square, because the SVG fits its square viewBox to the SHORTER side:
                           #   any non-square stage throws the difference away as empty ground
  components/BasemapToggle.js # Terrain ↔ simple map, on every globe. Reads settings.basemap
  components/GlobeTexture.js # WEB ONLY: the reprojected photographic basemap, on a <canvas> under
                           #   the SVG. Native has no canvas, so it falls back to classified fills
assets/globe/earth-relief.jpg # NASA Blue Marble, 2048x1024, PUBLIC DOMAIN. Bundled, not fetched
scripts/build-globe-texture.mjs # Rebuilds it from Wikimedia Commons (npm run build:globe-texture)
  components/CountryPhoto.js # The approved hero photograph on a country page: reserved aspect
                           #   ratio, theme-toned placeholder, transform-URL fallback, credit caption
  components/CompassMark.js # The mark, DRAWN (not a PNG): crisp at 1024, legible at 16, and
                           #   it comes apart — parts="globe" (ring + graticule) vs
                           #   parts="needle" (star + pivot), which is what SpinningMark needs
  components/Wordmark.js    # The lockup: mark + the two-tone name. Every brand rule the
                           #   wordmark has to keep lives here instead of being retyped
  components/SpinningMark.js # The loading indicator: the needle HUNTS (fast/slow/fast), the
                           #   globe drifts the other way at 1/20 the rate, a halo breathes on
                           #   the needle's period, and a finished load SETTLES on north
  components/BrandLoader.js # A whole-screen or whole-panel wait. Owns the kit's "no spinners
                           #   under 1s" rule as a `delay`, so a fast load shows nothing at all
  components/Skeleton.js    # Loading with a KNOWN SHAPE: 10% brand tint + a cream sweep.
                           #   Reserves the layout, so nothing jumps when content lands
  components/Material.js    # The kit's four composite grounds, drawn with react-native-svg —
                           #   base → ramp → grain → glow, in that order. <MaterialSurface>
                           #   is the ground-with-content-on-it form
  components/AnimatedNumber.js # A number that counts to its new value. Never animates its
                           #   FIRST value; `from` is the one exception (a round's XP award)
  components/ProgressTrack.js  # The kit's 8px pill, animated, reduce-motion aware
  components/PressableTint.js  # The kit's press/hover vocabulary and nothing else: a 120ms
                           #   tint on touch, an e2 lift + lakewater border on pointer, and
                           #   deliberately NO scale bounce
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
  screens/AchievementsScreen.js # M2.5 hero screen (step 3): real locked/unlocked state + progress
                           #   bars via achievementPolicy.js, reached from a Profile row (step 4),
                           #   plus a level card via levelPolicy.js above the badge list (step 5)
supabase/migrations/       # Schema as code (user domain + content domain, RLS, signup trigger)
supabase/functions/        # Edge Functions (Deno). ingest-embeddings: chunks + embeds country
                           #   content with the built-in gte-small model. ask: retrieval + grounded
                           #   generation (Claude), the only place ANTHROPIC_API_KEY exists
scripts/ingest-embeddings.mjs # Drives ingest-embeddings to completion (npm run ingest:embeddings)
scripts/fetch-country-photos.js # Wikidata P18 → Commons → Storage → a PENDING country_media row
scripts/approve-country-media.js # The only thing that publishes one (npm run media:approve)
scripts/build-brand-assets.js # Rasterizes brandMark.js into assets/icon.png, adaptive-icon.png,
                           #   splash.png and favicon.png. Hand-rolled PNG encoder (zlib is in
                           #   Node's stdlib) rather than a native image dependency
assets/brand/              # The kit's supplied PNGs — REFERENCE ONLY, nothing imports them.
                           #   See assets/brand/README.md for why
scripts/build-worldmap.mjs # One-off generator for data/worldMap.js (Natural Earth 110m)
scripts/seed-content.js    # Repeatable bundled-JSON → content.countries seed (npm run seed:content)
test/engine.test.js        # Pure-logic tests (no RN imports)
```

**The logo is geometry, not a PNG.** The brand kit ships the mark only as raster art and says so
itself: *"logo artwork is raster-traced … edges soften above ~150px. Commission or produce a true
SVG before shipping app icons."* An app icon is 1024px. `src/game/brandMark.js` is that redraw —
the mark as numbers — and it has **two** consumers, which is the whole reason it is pure:
`components/CompassMark.js` draws it on screen, and `scripts/build-brand-assets.js` rasterizes it in
plain Node into `assets/icon.png` and friends. A build script with its own hand-copied path is
exactly the thing that drifts, and nobody ever sees the home-screen icon and the loading mark side
by side to notice. The supplied PNGs live in `assets/brand/` as reference and are imported by
nothing. Four rules, all pinned by tests:
- **Level of detail SWAPS, it does not scale.** Kit: *"Below 32px use the simplified compass (star +
  ring + centre dot) — do not downscale the detailed artwork."* The simplified mark **keeps its
  ring** and loses only the graticule; reading that backwards is what rendered the desktop rail's
  28px lockup as a bare star. Below 20px the ring goes too, because a 1px circle 14px across fills
  in to a grey smudge.
- **The mark comes apart.** `parts="globe"` is the housing, `parts="needle"` is the star and pivot.
  That split is not decoration — it is what lets `SpinningMark` rotate a needle inside a fixed
  instrument instead of spinning a whole logo like a throbber.
- **The graticule is a real orthographic projection**, the same one `game/globeProjection.js` uses.
  It costs nothing to make the mark a small true Earth rather than an approximate one.
- **The tones are duplicated in `brandMark.js` rather than imported from `theme.js`**, because the
  Node rasterizer cannot reach theme.js's neighbours. That duplication is the risk, so a test
  asserts every value still equals its token.

**Materials are the cozy layer, and they have rules that are easy to break.** `theme.js`'s
`materials` holds the kit's four composite grounds as platform-neutral stops; `components/Material.js`
draws them with react-native-svg (which has linear gradients, radial gradients *and* patterns on web,
iOS and Android alike — `expo-linear-gradient` can express none of what these need). Always in the
order base → ramp → grain → glow: light falls *across* a surface, not under it.
- **Light enters from ONE corner.** Never two, never centred. Dusk lights from the top right; the
  walnut desk and the lantern from the lower left. A test asserts every glow in a material shares a
  corner — a composition lit from two has no light source.
- **At most TWO materials in one composition.** `AppChrome` spends one on every screen (paper is
  "the default page ground"), so a screen gets exactly one more. Home spends it on the Daily card's
  dusk wash, which is why the globe card there is a flat fill and its pine-grain wall lives on
  Explore instead.
- **Texture never sits behind body copy.** Materials are grounds and panels; the card laid on one
  stays flat `surfaceRaised`. That is what keeps the weave reading as paper rather than as dirt.
- **Type on a material never carries alpha, and lichen's floor RISES to 16px.** Inside the dusk
  wash's lit corner the ground reaches L≈0.12, where `onFillQuiet` measures 3.4:1 — so `materialInk()`
  reports the floor and components ask it instead of remembering. An 11px eyebrow on dark therefore
  takes **brass**, the kit's own eyebrow-on-dark pattern, not parchment-at-70%.
- **Grain periods are co-prime-ish (9/17/29/43/97) on purpose.** Beaten against each other they never
  align inside a viewport, so wood reads as figure rather than corduroy. A test refuses two equal
  periods.
- `walnut` is drawn and tested but deliberately **unused in the app**: the kit restricts it to "the
  ground *beneath* a device, card or artefact, never behind type", and no current surface is that.
  Reach for it in marketing and mockups, not to fill space.

**Motion has a vocabulary, and "no bounce" is part of it.** Everything animated runs on `theme.js`'s
`motion` durations and the kit's one easing curve, and every piece of it drops to its resting state
under reduce-motion — that is an explicit request from someone who may get physically ill, not a
preference to shorten.
- **The loading indicator is the mark, and the needle hunts.** `SpinningMark` varies its rate across
  the turn (via a multi-stop interpolation, not a bezier — an ease-in-out across one revolution has
  zero velocity at both ends, so a loop visibly *stops* every turn). When loading ends it finishes
  the revolution and settles on north rather than vanishing mid-spin.
- **A known shape gets a `Skeleton`, not a spinner**, and `BrandLoader` enforces the kit's "no
  spinners under 1s" itself so callers cannot forget. There is no `ActivityIndicator` left in the app.
- **`PressableTint` is the whole press/hover vocabulary**: a 120ms tint on touch, an e2 lift plus a
  lakewater border on pointer, and **no scale bounce** — the kit forbids it outright, and a card that
  squashes under the thumb is some other product's house style.
- **`AnimatedNumber` never animates its first value.** A total that merely happens to be on screen
  should not roll every time you open Profile. `from={0}` is the single exception, for the round's XP
  award, where arriving at the number *is* the event.
- **The nav pill blooms rather than travels.** A pill that slides between tabs has to measure them —
  an onLayout pass per tab, re-measured on every rotation and font-scale change — to make the chrome
  lag a frame behind the tap. Each tab owns its own pill instead; they cross-fade, and the tapped tab
  responds on the same frame.

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

**A globe is presentational; the gestures are a hook.** `GlobeMap` renders whatever `spin`/`zoom` it
is handed and owns no input at all. Everything interactive — the 2-touch pinch claim, the drag
threshold, the web mousedown/wheel listeners, the momentum coast — lives in
`src/hooks/useGlobeGestures.js`. That split exists because it was got wrong once: the gesture layer
was welded inside `WorldMapScreen`, so when the Country Locator got the globe it got a still image
you could tap. Three rules:
- **Touch is handled by the hook, not by RN.** `surfaceProps` deliberately omits the PanResponder
  on web (RNW does not surface raw touches), so the hook binds `touchstart/move/end` itself. Without
  that the globe is completely inert on a phone — the Explore map told people to "drag to spin ·
  pinch to zoom" and did neither.
- **`axisLock` is what makes an embedded globe usable on a phone.** A finger on a globe inside a
  scrolling page is ambiguous; with the lock, the first movement decides — mostly horizontal spins,
  mostly vertical is handed back to the page. Home, the country page and the locator use it; the
  full-screen Explore map claims everything. It is enforced by setting `touch-action` on the node
  (`pan-y` vs `none`), NOT by preventDefault alone: browser gestures are decided before a touch
  listener runs, so without it a two-finger zoom on the map pinch-zooms the whole document.
- **Spread `surfaceProps` onto the view that SIZES the globe.** Its ref binds the web listeners and
  its `onLayout` feeds the drag-to-screen-pixels conversion; on any other node, drags don't track.
- **The hook's returned functions are identity-stable, deliberately.** A caller that re-frames from
  an effect must list them in its deps; with fresh identities every render that effect re-ran on
  every render, and since every drag frame is a `setState`, each frame snapped the globe back. The
  gestures fired perfectly and the globe looked completely inert.
- **`wheelZoomEnabled: false` for a globe inside a scrolling page.** Zooming has to `preventDefault`,
  so an embedded globe otherwise traps the page's scroll whenever the pointer crosses it.

**Terrain is derived from content, not from a formula.** `game/terrainTint.js` classifies each
country from the CIA World Factbook climate and landform lines already in `data/countryContent.js` —
the same reviewed text a player reads on the country page. Three traps it exists to avoid, each
found against the real prose and each one a place naive keyword matching gets it exactly backwards:
"temperate rather than arctic" is not an arctic claim (negations are stripped), "the Mediterranean
coast" is a location rather than a climate, and "subarctic" must never satisfy the arctic pattern.
The same words also mean different ground at different latitudes — "arid to semiarid" is cold steppe
at 48°N and hot desert at 25°S — which is why this is a hybrid rather than a lookup.

**The terrain basemap is a real photograph, reprojected per frame.**
`assets/globe/earth-relief.jpg` is NASA's Blue Marble — an *equirectangular* image, which is the one
projection the globe can resample cheaply, because pixel x maps linearly to longitude and pixel y to
latitude. `game/globeRaster.js` runs the projection BACKWARDS (screen pixel → point on the Earth →
texel) and fills a buffer; `components/GlobeTexture.js` puts that on a `<canvas>` beneath the SVG.
Four things to know before touching it:
- **The two layers are registered by construction, not by tuning.** The raster is handed the same
  centre and radius the SVG derives from `GLOBE_BASE_RADIUS`/`GLOBE_VIEW_SIZE`. It also covers the
  WHOLE container rather than the fitted square — the SVG lets the sphere overflow that square once
  zoomed, and a square photograph leaves two visible seams.
- **Countries draw `fill="transparent"`, not `fill="none"`,** when the raster is up. A none-filled
  path is not hit-testable, and every country has to stay tappable over the imagery.
- **Draft while moving, full size when settled**, budgeted in PIXELS rather than edge length —
  container aspect ratios vary a lot and it is the pixel count that costs. ~2.8ms for a 60k-pixel
  nearest-neighbour draft against ~36ms for a 700k-pixel bilinear settled frame.
- **The settled frame samples bilinearly; the draft does not.** That is the whole reason a
  4096-wide source is worth its 800 KB: with nearest-neighbour, zooming in only shows bigger
  rectangles. `texelCoords` returns EDGE space (`floor` = "which texel contains this longitude"),
  so the smooth sampler shifts by half a texel to reach centres — without that the two paths
  disagree and the imagery sits half a texel off the borders drawn on it.
- **WEB ONLY, deliberately.** Reprojecting needs a writable pixel buffer and React Native has no
  canvas, so on native `terrain` falls back to the per-country classified fills — a real map rather
  than a broken one. Doing better means a GL surface.

**Every globe takes a `basemap`, and it is a SETTING.** `terrain` is the realistic basemap;
`simple` is the kit's own map layer, one flat land colour, which reads borders better and is what
the Country Locator wants. Switching on one surface and finding another still flat would read as a
bug, so all of them read `settings.basemap`.

**Branch on the QUESTION's type, not the round's mode.** `QuizScreen` renders one surface per
`q.type`. A country round mixes types, and a locator question's `correct` is an ISO code while its
options are names — it is answered on the globe, not from a list — so `mode === "locator"` would
mark every locator answer inside a country round wrong, with no map on screen to explain why.

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
Modes: `flag`, `capital`, `capitalReverse`, `shape`, `locator`, `higherLower`, `daily` (a deterministic mixed round, seeded by date), and `country` (a mixed round about ONE place, reached only from a country page's "Play with …" — it is meaningless without a subject, so it is not on Home).
`higherLower` is the one question shape that is a *pair* rather than a target country:
`{ type, metric, a, b, correct }`, where `correct` is the winning country's name so `QuizScreen`
compares it against the tapped option directly.
`locator` also carries `choices[]` ({code, name}) — its answer surface is a tappable world map, not text options.

**Assets are loaded at runtime**, not bundled: flags from flagcdn.com, outlines from the
mapsicon project (see `data/countries.js`). Keeps the app light and the repo small.

## Conventions

- **Reuse `theme.js` tokens** for all colors/spacing/type — never hardcode hex in components.
  `theme.js` is the Slickrock **Brand Identity Kit v3** expressed in code, and the kit's own first
  rule applies: semantic names, not literals — `colors.surfaceRaised`, never `"#FBF6EA"`.
- **Keep gameplay numbers in `constants.js`** and XP in `scoring.js` — no magic numbers in UI.
- **Maps are the hero.** Premium, timeless, map-first. Avoid childish or enterprise looks.
- **The app is light; the map is dark.** v3 reads as "a cartography room after dark": parchment
  (`surface`) is the page, cards are cream (`surfaceRaised`), body copy is bark ink (`text`), and
  pine (`brand`) is authority — wordmark, headings, primary buttons, active nav. Everything is
  **warm-biased, including the shadows** (`rgba(42,35,32,…)`, never neutral grey). Cool colour
  appears only as lakewater (`accent`), and only where something is live: water, routes, links,
  interactive state. The *one* surface that stays dark is the map: `map.ocean`, `map.land`, brass
  graticule and borders. Reaching for `map.*` means you are deliberately entering that dark stage.
  Roughly **70% parchment, 25% pine, 5% firelight, one warm accent per screen.**
- **Three v3 rules that are easy to break by accident, and are pinned by tests:**
  **Brass is decorative only** — 1.9:1 on parchment, so it is a rule, a fleck, a graticule, never
  type on light. **Ember and success are fills** — when a warm or green colour has to carry words
  that is `emberInk` / `successInk`. And **`accent` is not a link colour**: the kit's own table says
  lakewater is "links on cream, large only on parchment", so text links use `colors.link`, a
  deepened tint that clears 4.5:1 on both grounds. A raw `accent` FILL cannot carry a body-size
  label either (4.28:1) — every mode accent that wanted to be teal is a deepened tint of it.
- **Type on a dark ground never carries alpha.** An alpha tint over a gradient has no knowable
  contrast ratio. There are exactly two inks on dark — `onFill` (parchment) at any size and
  `onFillQuiet` (lichen) at 14px+ — and hierarchy comes from size, case and the mono/serif switch.
- **Depth is `elevation(1|2|3)`** — real soft shadows (e1 rest · e2 hover · e3 overlay), **bark**-
  tinted so they stay warm; a neutral shadow on parchment goes grey and dirty. Most separation is
  actually done by `hairline`, not by shadow. Never nest two elevations.
- **Weight lives in the font family, not `fontWeight`.** `fonts.display` is `Newsreader_500Medium`,
  `fonts.bodySemi` is `InstrumentSans_600SemiBold`, and so on. Each Google font weight registers as
  its own family declared at weight `normal`, so adding `fontWeight: "700"` on top makes the browser
  synthesise a second, fake bold. Pick the family; never set `fontWeight` in a component.
- **Three typefaces, three jobs.** **Newsreader** (a serif, as of v3) = display: wordmark, headings,
  numerals. Instrument Sans = body, UI labels, buttons. IBM Plex Mono = coordinates, eyebrows, map
  labels, data — **never sentences**. `type.eyebrow` (mono, uppercase, 12% tracked, emberInk) is
  this UI's structural voice.
- **Newsreader is never used below 17px** — the serif detail muddies; below that, drop to Instrument
  Sans. `type.h3` at 21 is the floor, and a test asserts no small role uses the serif.
- **The wordmark is two-tone and that is a brand rule, not a preference:** "World" in `brand`,
  "wise" in `accent`, Newsreader 600 — never one flat colour, never another face, never tightened
  past -0.012em tracking.
- **Spacing is a 4px base** (`spacing(n) === n * 4`), scale 4·8·12·16·24·32·48·64·88, "never an odd
  value". Card padding 20 mobile / 24 desktop; section rhythm 64/88.
- **A label on a fill goes through `onFill(fill)`.** Every brand fill carries parchment except
  `brass` and `accentLight`, which carry nightwood — parchment on brass is 1.9:1. That rule lives in
  one function so no component has to remember it, and `test/engine.test.js` drives its checks
  through the same function.
- **Check BOTH light grounds.** Cream and parchment differ by roughly half a stop and small type
  sits on both; `LIGHT_GROUNDS` exists so a contrast check cannot quietly pick whichever one passes.
  (v1.1's `textMuted` sat at 4.40:1 on the page and had to be pinned as a labels-only exception; the
  v3 ink ramp clears body contrast on both grounds all the way down to `textFaint`, and a test now
  asserts that so the exception cannot creep back.)
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
**M2.1 — accounts & cloud sync is done and verified working in production (2026-09-04).** Getting
there took two fixes worth remembering. First, the M2.3.5 push found the live `public` schema empty
— no `profiles`, `user_stats`, or `game_results` — and the remote migration history table empty too,
so the user-domain migration had never reached the live project (or the project was reset); all
three migrations went up via `supabase db push --linked`. Second, and quieter: the signup trigger
fires only on INSERT into `auth.users`, so every account predating that push had no `profiles` row,
and `user_stats`/`game_results`/`profile_interests` all reference `profiles(id)`. Every cloud write
was failing with `23503 — Key is not present in table "profiles"` while the results screen showed
"+55 XP" and Profile read "✓ Synced". `20260904184056_backfill_orphan_profiles.sql` fixes it
(idempotent, applied to production), and the sync-visibility work below stops that class of failure
from hiding again. Re-verified end to end: sign-in → `profiles` row, round → `user_stats` bumped and
a `game_results` row. Vercel carries the Supabase env vars (`EXPO_PUBLIC_SUPABASE_URL`,
`EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`).

**A swallowed error still has to leave a trace.** `cloudProgress.js` deliberately never throws — a
failed sync must not interrupt play — and it returned `{ ok, error }` for a caller to handle.
Nothing ever handled it, and that is precisely how a total sync outage stayed invisible with all
four user tables at zero rows. The rule now: swallowing is fine, *silence* is not. A failed write
logs (`[worldwise:sync] <which write> failed — <code>: <message>`) and updates
`game/syncStore.js`, which ProfileScreen renders through the pure `describeSyncState()`. Never
write a UI string that claims success without checking that something actually succeeded — the old
unconditional "✓ Synced" line is the cautionary tale.

**A migration no longer needs the DB password.** Recent Supabase CLI versions provision a temporary
login role over the Management API, so on a linked project `db push`, `migration list`, `db dump`,
and `inspect db` all reach the remote database on the stored access token alone. What still needs a
human: the Dashboard's exposed-schemas setting, and the secret service-role key for seeding.
**Never use `supabase config push`** to set exposed schemas — it pushes all of `config.toml`
including `[auth]`, which would overwrite the live `site_url` with `http://127.0.0.1:3000` and wipe
the production redirect URLs.

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
policy module, `profile_interests` schema migration, the offline-first sync seam, a real
"Interests" settings row on Profile, replacing the temporary preview CTA, that shows a live
selection summary and reopens `InterestsScreen` seeded with whatever's already picked, and — step 6
— the sign-up prompt that actually asks). Steps 1-5 shipped the screen and every piece of its
plumbing but never wired a trigger, so for a while it was a settings screen wearing a sign-up
prompt's description; `game/interestPrompt.js` closed that gap. **Its rules are load-bearing, not
cosmetic: a skip is an answer, and the prompt is marked asked the moment it opens, not when a button
is pressed** — so dismissing with Back still counts. If you touch this, keep the invariant the test
suite pins: no input may ask without also marking, or the prompt repeats forever.
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
badges, no new schema), step 2 (the navigation seam — an `achievements` route in
`src/game/navigation.js`, owned by the Profile tab, reached with `go({ name: "achievements" })`
and rendered by `App.js`), step 3 (the hero screen — `AchievementsScreen` now renders real
locked/unlocked state and progress bars via `computeAchievements()`, fed by local `progress` and
`fetchRoundResults(user)`), and step 4 (the real Profile entry point — `ProfileScreen` now runs its
own `fetchRoundResults(user)` through `computeAchievements()` and shows an "Achievements" row,
mirroring the Interests settings row, with a live "{unlocked} of {total} unlocked" summary,
replacing the temporary "Achievements (preview)" link), and step 5 (XP levels —
`src/game/levelPolicy.js`'s `computeLevel(xp)`, pure: an escalating per-level XP cost off
`LEVEL_XP_BASE`/`LEVEL_XP_GROWTH` in `constants.js`, surfaced as a level card above the badge list
on `AchievementsScreen`) are done. Region collectible sets are deliberately their own later step
rather than folded into step 1. Step 6 (collectible sets, e.g. "all of South America") now has its
own ordered sub-checklist; sub-step 6.1 — a `countries jsonb` column on `game_results` plus
`countriesFromHistory()` (`src/game/cloudSync.js`) turning `QuizScreen`'s per-question history into
`{ code, correct }` pairs — is done, capture-only with nothing reading it yet. Sub-step 6.2 — the
pure collection policy, `src/game/collectionPolicy.js`'s `computeCollections(results, countries)` —
is now also done: it folds every `game_results` row's `countries` array into the set of codes ever
answered correctly, then groups that against `countryIndex.js`'s regions into a per-region
`{ collected, total, progress }`, fed by `fetchRoundResults()` now also selecting `countries`.
Sub-step 6.3 — the navigation seam + hero surface — is now also done: no new route, since
`AchievementsScreen` already fetches round history for badges — it now also runs
`computeCollections()` and renders a "Collections" section below the badge list, one row per
region with a `ProgressTrack` and a `{collected}/{total}` readout (or "Complete ✓" at 100%),
mirroring the badge rows' own unlocked-label swap. Verified in a real browser. Step 6.4 (the closing
polish + a11y pass) is underway, broken into the same four chunks M2.4 step 6 used: 6.4.1 (contrast
audit) is done — unlike M2.4's audit, this one found a real gap rather than a clean bill of health.
`AchievementsScreen`'s level-card XP readout used `colors.brass` as an 11px eyebrow ink over the
`dusk` material's brightest corner (the same corner the oversized `CompassMark` bleeds off, and the
same reasoning `HomeScreen`'s "Daily challenge" kicker used); composited there, brass measures
~2.6:1 — well under even the 3:1 UI floor. It now uses `colors.onFill`, pinned by a
`test/engine.test.js` check that composites the corner from `materials.dusk`'s own data rather than
a hand-typed hex. `HomeScreen`'s kicker likely shares the same shortfall and is flagged in
ROADMAP.md as a follow-up, deliberately left untouched here since fixing it is outside M2.5's scope.
**6.4.2 (large tap targets) is also done, and also found a real gap.** Click-testing (bisecting the
exact pixel row a click stops registering, not just reading the JSX) found `AchievementsScreen`'s
Back button's real web tap target stops at 42px even though its `Pressable` carries `hitSlop={12}`:
**react-native-web never implements `hitSlop` on `Pressable`** — only the legacy `Touchable*` mixin
references it, and that feeds the responder system, not browser hit-testing — so on web a
`Pressable`'s tap target is exactly its visible box, full stop. Fixed with `paddingBottom: spacing(3)`
instead of `spacing(2)`, reaching 46px. Every other M2.5-owned target (Profile's "Interests"/
"Achievements" rows, ~78px; "Sign out", 46px) already cleared 44px from padding alone, so nothing
else in this milestone needed a change — but the same reasoning likely undersizes every other
`hitSlop`-only target in the app (M2.3's region-pill chips and locator targets included), flagged in
ROADMAP.md as a follow-up rather than fixed here, since that sweep is a different milestone's surfaces.
**Next up in M2.5 is step 6.4.3**, offline/error states.

**M2.3.5 — content backend is done end to end in production** (2026-09-04). The migration is
applied, `content` is exposed in the Dashboard, and the seed has run: `content_version` 5, 196 rows
in `content.countries`. Verified against the live site — a country page fetches the version and the
row (both 200) and caches the result stamped with the live version, which only happens on the
remote-fetch path, so it is genuinely reading Postgres and not the bundled fallback; anon writes are
refused with 401. **The `country_media` follow-up is closed in code** (2026-09-09) — see the country
photos section below.

Country content has a public-read `content.*` schema, a repeatable seed (`npm run seed:content`), and a fetch
layer that caches per country against `content_version` and falls back to bundled JSON. The bundled
dataset did *not* go away — it's the seed source and the offline baseline at once, so both agree by
construction.

Verified end-to-end on a local Postgres: migration applied from scratch, seeded, public read
confirmed, writes denied for anon *and* authenticated, and an edit made directly in Postgres
appeared on a country page in the browser — then a second edit's version bump invalidated the cache
and the app refetched. The migration itself is now applied to the live project too; exposing the
schema and seeding remain Danny's — see **DANNY TO DO** in ROADMAP.md.

Phase 2 is milestone-based, not day-by-day — take one scoped, reviewable chunk at a time.

## The AI knowledge hub (M2.9) — decisions worth not relitigating

- **Generation is Anthropic Claude, Haiku by default** for in-app "dive deeper", with the model name
  in a single config constant so Sonnet can swap in without a code hunt.
- **Embeddings are Supabase's built-in gte-small** (384-dim, normalized) — no external embedding
  vendor and no second API key. It is only reachable from the **Edge runtime**: `Supabase.ai.Session`
  has no Node equivalent, which is why ingestion is an Edge Function rather than a plain script.
- **Retrieval and generation run server-side in Edge Functions.** `ANTHROPIC_API_KEY` lives only in
  Edge secrets — never in the repo, `.env`, or the client bundle.
- **Grounding is the product requirement, not a nicety.** The audience includes students, so answers
  come only from retrieved `content.*` chunks and are always cited. Two mechanical consequences that
  are easy to undo by accident: every chunk must name its country (an unattributed fact gets
  misattributed), and shrinking content must *delete* its orphaned chunks (retired text otherwise
  stays retrievable and citable).
- **gte-small truncates at 512 tokens silently**, so chunks are capped well under it. An over-long
  chunk embeds only its head while its citation claims the whole passage.
- **gte-small's cosine similarities live in a high, narrow band — never guess a threshold.** An
  intuitive-looking floor of 0.25 admits every question ever asked. Measured, on-topic sits at
  0.83–0.93 and off-topic/adversarial at 0.68–0.79, so the floor is 0.80. If the corpus changes
  materially, re-measure rather than reasoning about what "low similarity" ought to mean.
- **A correct refusal is not a grounding failure.** Scoring "did the answer cite anything?" marks a
  well-behaved "the sources don't cover this" as ungrounded, which would punish the exact behaviour
  the rules ask for. The model emits an explicit `NO_ANSWER` marker and `answerStatus()` returns
  `declined` / `cited` / `ungrounded`. Keep the three states if you touch this.
- **The model is named in exactly one constant** (`MODEL` in `supabase/functions/ask/index.ts`,
  currently `claude-haiku-4-5` — note: no date suffix). Swapping in Sonnet is a one-line change.
- **The Edge runtime's binding constraint is isolate CPU, not wall clock.** Embedding in-process
  trips `WORKER_LIMIT` ("CPU time hard limit reached") long before any timeout — ~10 chunks per
  invocation locally. Anything that embeds in bulk must batch and resume, not just run faster.

**Two Postgres privilege traps, both caught the hard way.** The first is documented above (RLS
without GRANTs). The second is its mirror image and bit during M2.9 step 4: **Supabase's default
privileges grant EXECUTE on new `public` functions — and INSERT/UPDATE/DELETE on new `public` tables
— directly to `anon` and `authenticated`.** `revoke ... from public` does *not* take back a grant
held by a named role, so a function you believed was service-role-only is callable by every signed-in
user. On a `security definer` function, where RLS does not apply at all, that is a straight
privilege escalation. Always `revoke all ... from anon, authenticated` explicitly, then grant back
exactly what is needed — and test it with `set role authenticated`, because reading the migration
will not reveal it.

## Country photos — decisions worth not relitigating

See [docs/adr/0002-country-photos.md](./docs/adr/0002-country-photos.md) and the runbook,
[docs/country-photo-review.md](./docs/country-photo-review.md).

- **The source is Wikidata `P18`**, resolved from the ISO alpha-2 code (`P297`) we already key
  `content.countries` on. It is the entity's *canonical representative image*, so it is the same
  image on every run — which is what makes ingestion idempotent and review finite. An image search
  is none of those things. **`P18` is a draft, not an answer:** it returns flags, coats of arms,
  maps and satellite photos often enough that review is the point, not a formality.
- **Nothing is displayed until a human approves it.** `content.country_media.status` defaults to
  `'pending'` and the public-read policy is `status = 'approved'`, so a draft is unreadable by
  anon/authenticated *at the database*. Never re-open that by filtering in the client instead —
  this is a product used by children, and a database-level gate cannot be dropped by a refactor.
- **Approving bumps `content_version`; ingesting embeddings must not.** Images are the most visible
  thing on a country page, so clients have to refetch to see them. Embeddings are invisible to a
  reader and a bump would just make every device redownload content that reads identically.
- **Licensing is structured and enforced.** CC BY and CC BY-SA both require attribution and BY-SA
  requires the licence be named, so `author`/`license`/`license_url`/`source_url` are columns, and a
  row missing an author or a licence is **refused** by the approval path. `formatPhotoCredit()` owns
  the wording in one place, the way `onFill()` owns label colour.
- **Images are re-hosted, never hotlinked.** A Commons file can be renamed, replaced or deleted;
  re-hosting is what makes "approved" mean the image that was actually approved. The stored object
  is already a 1600px Commons rendition, so the bucket stays small.
- **Storage transforms are an optimisation with a fallback, never a dependency** — image
  transformation is a Pro-plan feature. `CountryPhoto` falls back to the plain object URL on error.
- **Do not gate an image's visibility on `onLoad`.** The first version faded in on that callback and
  shipped a photo that had loaded and was permanently invisible: react-native-web never fired it, so
  the animated opacity stayed at 0 over a 200 OK bitmap. Caught only by screenshotting the real
  page. A pop-in is a far better failure than a photo that is there and cannot be seen.

## The mission (don't lose this)

Worldwise exists to help people understand the world — not by memorizing facts, but by
discovering the stories, relationships, and context that make every place meaningful.
Geography is the first subject because it provides the context for every other discipline.
