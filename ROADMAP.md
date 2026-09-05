# Worldwise — Product Roadmap

Worldwise grows in four phases. **Phase 1 is a day-by-day two-week build** (below).
**Phases 2–4 are milestone-based** — day-level precision over months would be fiction, so
each later phase is a goal, an ordered set of milestones, the architectural shifts it forces,
and the exit criteria that unlock the next phase.

Guiding principle, every phase: make people more curious about the world. Answer
*"why should I care?"*, not just *"where is it?"* Understanding over memorization; context over trivia.

Legend: 🎮 game · 🧱 foundation · 💾 data · ✨ polish · 🧪 quality · 🎓 educator · 🌐 platform

---

## Phase 1 — Fun First (two-week build)

Small, scoped chunks — one focused commit per day to keep token usage low and progress steady.
**Day 0** was the initial prototype in this repo.

| Day | Focus | Deliverable |
|-----|-------|-------------|
| **0** ✅ | 🧱 Prototype | Expo scaffold, quiz engine, Home hub, Flag + Capital + Shape games, Daily Challenge |
| **1** ✅ | 💾 Persistence | Save XP / streak / best scores locally (AsyncStorage) so progress survives restarts |
| **2** ✅ | 💾 Data | ~~Expand dataset to ~100 countries~~ → **done early: full 196-country dataset landed.** Difficulty tiers (easy/medium/hard) added per country, selectable on Home before Flag/Capital/Shape |
| **3** ✅ | 🎮 Game | Capital Quiz reverse mode ("which country has this capital?") + timed option |
| **4** ✅ | 🎮 Game | **Country Locator** — tap the named country on an SVG world map. Uses embedded, pre-projected paths from Natural Earth 110m (public domain; see `scripts/build-worldmap.mjs`) rendered via `<Path>` primitives, so hit-testing works on web + native |
### Remaining — the compressed path to Phase 2

**Decision (revisited after Day 4):** we have five game modes and a proven engine. *Breadth is
no longer the bottleneck — depth is.* Only four items are load-bearing before accounts; the rest
is polish and extra modes that can land any time. So Phase 1 compresses to:

| Day | Focus | Deliverable | Why it's load-bearing |
|-----|-------|-------------|-----------------------|
| **A** ✅ | 🧱 Streaks | Calendar-aware daily-streak logic, "come back tomorrow" state, streak freeze | Core retention; `last_played_on` already exists in the Phase 2 schema |
| **B** ✅ | ✨ Results | Richer end-of-round screen: per-question review + "why it matters" blurb | **The thesis.** Without context, this is a flag quiz |
| **C** ✅ | 💾 Content | Per-country "context card" (why this place matters) shown after answers | **The thesis.** This is what makes it Worldwise, not Sporcle |
| **D** ✅ | 🧱 Navigation | Tab bar (Home · Profile) — shipped alongside M2.1's sign-in | Prerequisite: the Profile tab is where sign-in will live |

**Phase 1 is complete.** ✅ All four load-bearing items shipped; the exit criteria below are met.

Two notes on how C and D actually landed, so the history reads honestly:

- **C** shows the context card *during play* — it appears under the answer feedback, right
  before Next, on every question. Day B had already put "why it matters" on the end-of-round
  review; C is what makes the payoff immediate, and it shows on a *wrong* answer too. That's
  the point: you leave every question knowing something, not just whether you guessed it.
- **D** shipped as **Home · Profile**, not Home · Play · Profile. `HomeScreen` is already the
  game hub, so a third tab would have duplicated it or forced a Home/Play split that buys
  nothing today. `TabBar` takes its tabs as data, so adding Play later is a one-line change if
  a real second destination ever earns its place.

**M2.1 — accounts & cloud sync**, **M2.2 — country pages**, **M2.3 — interactive maps**,
**M2.3.6 — learner interests**, and **M2.4 — learning paths** are all complete end to end (see
each milestone below for detail).
**M2.3.5 — content backend is now done end to end in production** (2026-09-04). The migration is
applied, the `content` schema is exposed in the Dashboard, and the seed has run: `content_version`
is at 5 with 196 rows in `content.countries`. Verified against the live site — a country page fires
`GET /content_version` and `GET /countries?code=eq.br`, both 200, and caches the result stamped with
the live version, so the page is reading Postgres rather than the bundled fallback; anon writes are
refused with 401. **One follow-up remains:** `content.country_media` is still empty (0 rows) —
nothing seeds it yet, which is harmless today because no surface reads it, but it means the media
half of this milestone is unexercised in production. **M2.3.7 —
the globe** replaced the flat Explore map with a spinnable orthographic globe (step 1) and has now
landed all of step 4's polish: step 4.1 ("spin to this country" from a country page's "View on
map" link), step 4.2 (the graticule — lat/lng grid lines on the sphere, visible through ocean,
hidden under land), step 4.3 (a soft atmosphere/limb glow ringing the globe's silhouette), and
step 4.4 (spin momentum — a released drag/flick keeps the globe turning and eases to a stop
instead of stopping dead). **Next up in M2.3.7 is step 2** (wiring the Country Locator game onto
the globe), still blocked on a product call for how a globe should handle a game whose answer
might be on the hidden hemisphere; step 3 (device verification) stays blocked on a real device
this environment doesn't have. With step 4 fully done, M2.3.7 has no unblocked work left until
one of those two lands.
**M2.10 — navigation & user flow** landed out of numeric order, as a floor rather than a feature:
the app had grown to nine surfaces on a navigation model built for three. It is done — four tabs
(Home · Learn · Explore · Profile) with a real per-tab route stack in `src/game/navigation.js`, a
desktop side rail beside the mobile bottom bar via `src/game/layout.js`, real URLs and working
browser Back on web, and a Play-again/Done ending to a round instead of a dead end — **except for a
browser pass**, which the session it was built in couldn't run (Metro wouldn't bind a port). Do that
before building on it.
**M2.9 — the AI knowledge hub** is next in milestone order but still
blocked on its own DANNY TO DO lead-time items (Anthropic API key, spend cap, Supabase plan/pgvector
confirmation, embedding model pick) — check that section before starting its sub-checklist. With
M2.3.5 now done (only an optional `country_media` seed left as a follow-up), M2.3.7 and M2.9 still
blocked on human-only steps, and M2.4 done, **M2.5 — Achievements,
collections & deeper gamification** is the lowest-numbered milestone with unblocked work. It now
has an ordered sub-checklist, and step 1 (the badge catalog + pure policy layer — `src/data/
achievements.js` + `src/game/achievementPolicy.js`, mined entirely from existing progress/
game_results signals, no new schema), step 2 (the navigation seam — an `achievements` route in
`src/game/navigation.js`, owned by the Profile tab, rendered by `App.js`), and step 3 (the hero
screen — `AchievementsScreen` now renders real locked/unlocked state and progress bars via
`computeAchievements()`, fed by local `progress` and `fetchRoundResults(user)`) are done. **Next up
in M2.5 is step 4** (replace the temporary "Achievements (preview)" link on Profile with a real
entry point showing an unlocked-count summary). The Phase 1 backlog below gets picked up
opportunistically, not as a gate.

### Deferred to the Phase 1 backlog (not a gate)

Valuable, but none of it blocks accounts or the platform. Pull from here whenever there's an
appetite for polish, or before a public launch:

- ✅ **Polish** — answer animations, haptics on mobile, sound toggle, smoother transitions *(shipped early by the daily build)*
- 🎮 **Landmark / photo guess** mode (image → country)
- 🎮 **Speed Round** — 60-second mixed sprint with combo multipliers
- ✨ **Onboarding** — first-run welcome, difficulty pick, "how to play" (do this before public launch)
- 🧪 **Quality** — accessibility pass, empty/offline states, image-load error handling (ongoing)
- 🧪 **Ship `v0.1`** — README/screenshots, tag the release (web deploy is already live on Vercel)

### How the daily builds run

Each day, one scoped item: pull `main` → implement that item → commit with a clear message → push →
leave a one-line note on what's next. Each run is intentionally limited to a single item so token
usage stays predictable and you can steer the next day.

### Phase 1 guardrails

- **One item per day.** No scope creep into later phases (no classroom/AI *yet*).
- **Keep it runnable.** Every commit should `npm run web` cleanly and keep `npm test` green.
- **Data stays light.** Prefer runtime image/data sources over huge embedded assets.
- **Design consistency.** Reuse `theme.js` tokens; maps stay the hero.

### Phase 1 exit criteria (what "done" means)

A deployed web + mobile game suite where **every answer teaches you something**: five+ game modes on
a shared engine, a Daily Challenge, calendar-aware streaks, local progress, context cards, and a
tab-bar shell ready for a Profile/sign-in tab. Fun *and* the "why should I care?" layer are proven
before we add a backend.

---

## How to read Phases 2–4

The later phases stop being a daily checklist and become **milestones (M2.1, M2.2, …)**. Sequence
matters more than calendar dates; each milestone is still meant to be broken into small, one-item
commits when it's actively being built. Two things change fundamentally after Phase 1:

- **A backend appears.** Phase 1 is client-only (local storage, runtime CDNs). Accounts, sync,
  leaderboards, classrooms, and analytics require an API-first backend and a real data model.
- **We serve minors.** The moment classrooms arrive, privacy and safety (COPPA/FERPA-aware design,
  data minimization, parental/teacher consent) become first-class, not afterthoughts.

**Cross-cutting tracks run through every phase:** accessibility, performance, automated tests + CI,
privacy/compliance, and design-system consistency.

---

## Phase 2 — Learning

**Goal:** turn a fun game suite into a place people *learn* — where every place has a story — and
give progress a permanent home so it follows a person across devices. This is where Worldwise starts
teaching *how the world works*, not just *where things are*.

**Milestones (in order):**

- **M2.1 — Accounts & cloud sync 🧱** — ✅ **done and verified working in production
  (2026-09-04).** Auth provider, user
  model, and migration of Phase 1's local progress into a synced account. The foundation everything
  social/educational builds on.
  - ✅ Postgres schema as code (`supabase/migrations/`): profiles, user_stats, game_results, RLS
    owner policies, signup trigger. Isolation checked (one player cannot read or write another's
    rows).
    ⚠️ **Correction, and its fix (2026-09-04).** This entry once claimed the migration was applied
    to the live project, and it was not — the M2.3.5 push found the production `public` schema empty
    (no `profiles`, `user_stats`, or `game_results`) and the remote migration history table empty
    too. Either it was never pushed or the project was reset. `supabase db push --linked` applied
    all three migrations, so the tables exist.
    That left a second, quieter bug: the signup trigger fires only on INSERT into `auth.users`, so
    every account created *before* that push had no `profiles` row — and `user_stats`,
    `game_results` and `profile_interests` all reference `profiles(id)`. The production smoke test
    caught it: every cloud write failed with `23503 — Key is not present in table "profiles"`, while
    the results screen still showed "+55 XP" and Profile still read "✓ Synced". All four user tables
    held zero rows. `20260904184056_backfill_orphan_profiles.sql` backfills a profiles + user_stats
    row for every pre-existing auth user (idempotent, `ON CONFLICT DO NOTHING`, mirroring
    `handle_new_user()` exactly) and is **applied to production**. See the sync-visibility bullet
    below for the change that stops this class of outage from hiding again.
  - ✅ Supabase client (`src/lib/supabase.js`) + sync adapter (`src/storage/cloudProgress.js`,
    `src/game/cloudSync.js`), keeping `progress.js` pure and offline-first.
  - ✅ Sign-in on the Profile tab: email magic-link + Google, wired to the sync layer.
  - ✅ Proven end-to-end in prod (re-verified 2026-09-04, after the backfill above): a real Google
    sign-in resolves to a `profiles` row, the local→cloud merge runs once and lands the device's
    existing XP, and a finished Flag round writes both `user_stats` (xp 265 → 295) and a
    `game_results` row. No `23503`. Vercel carries the Supabase env vars.
  - ✅ **Failed cloud writes are visible** (`src/game/syncStatus.js` pure + the sync-health store in
    `src/storage/cloudProgress.js`). Writes still swallow their errors — play must never stop for
    the network — but a swallowed error now logs to the console and updates a session sync state
    that ProfileScreen reads, so the row under Your Record reports "couldn't save / we'll retry" or
    a hard failure instead of an unearned "✓ Synced". The old unconditional success message was
    exactly what let the outage above sit unnoticed.
- **M2.2 — Country pages 💾** — the core learning surface: a beautiful page per country answering
  "why should I care?" (map, key facts, a short story, climate/trade/culture hooks, related games).
  Expands the Phase 1 "context card" into a real hub.
  - **Ordered sub-checklist** (one scoped chunk per daily run; do these top-to-bottom, don't skip).
    Strategy: **build one fully-polished "hero" country page (Brazil) end-to-end first**, so there's
    something impressive and real to react to — *then* generalize it across all 196.
    1. ✅ **Content model + hero content (pure + tested).** Define the country-page content shape in
       `src/data/` (build on `countries.js` + `whyItMatters.js`): `summary`/story, key facts
       (population, area, lat/lng), region, neighbors[], relatedGameModes[]. Author **Brazil** fully
       as the reference entry. Keep it **versioned JSON, not Postgres** — content only moves into a
       `content.*` schema later, when it must be queried against user data (per
       `docs/phase-2-data-model.md`). Add a pure accessor (`getCountryPage(code)`) with a graceful
       fallback for sparse countries, and tests in `test/engine.test.js`.
       Landed as `src/data/countryPages.js`: `COUNTRY_PAGES` holds hand-authored entries (Brazil
       fully fleshed out — summary, population, area, lat/lng, neighbors, related modes,
       climate/trade/culture facts) and `getCountryPage(code)` merges that with `countries.js` +
       `whyItMatters()` so every known country renders a reasonable page today, even unauthored ones.
    2. ✅ **Navigation seam.** `openCountry(code)` in `App.js` opens a country page as a
       full-screen overlay over the tab shell — the same pattern as a quiz round — so no nav
       library is needed yet (tab state is held separately, so `leaveOverlay()` returns you to
       the tab you came from). A temporary "Explore Brazil" preview entry point on `HomeScreen`
       makes it reachable while step 3 builds the real screen.
    3. ✅ **Hero CountryPage — Brazil.** `src/screens/CountryPageScreen.js` renders from
       `getCountryPage(code)`: the country outline as the navy hero (reuses `CountryOutline`),
       region kicker + name + capital, People/Area/Neighbors stat tiles, the story, labelled
       climate/trade/culture rows, neighbor chips (codes → names via `countries.js`), and
       "related games" buttons that start a round in that mode via `onPlay`. Theme tokens only;
       maps are the hero. Reused across all 196 in step 4 — component already degrades gracefully
       for unauthored countries. *(Note: `WorldMap` is Locator-specific — choices/answer surface —
       so the outline, not the world map, is the right hero for a single country.)*
    4. ✅ **Generalize to all 196 countries** from the content module, driven by the same component,
       with clean empty/partial states where a story or facts are missing.
       `getCountryPage(code)` already resolved every country (not just hand-authored ones) as of
       step 1, and `CountryPageScreen` already hid sections gracefully when facts/neighbors were
       absent — so the actual gap was the hero: 4 of 196 countries (`ps`, `mh`, `fm`, `tv`) have no
       mapsicon outline (see `countries.js` `noOutline`), which would have rendered a blank/broken
       hero. `getCountryPage()` now reports `noOutline`, and the hero swaps in a clean "map outline
       coming soon" placeholder for those four instead of an empty `CountryOutline`. Covered by a
       loop test in `test/engine.test.js` over all 196 codes.
    5. **Wire entry points.** Split into three, landing one at a time:
       - ✅ **Post-answer context card.** The in-play "WHY IT MATTERS" card (shown after every
         answer, right before Next) now carries a "Learn more about {country} →" link that opens
         the full country page via the existing `openCountry`/overlay seam — `QuizScreen` takes an
         `onOpenCountry` prop, wired from `App.js`. Tapping it mid-round leaves the round
         unsubmitted (same trade-off as the existing ✕ exit); no round is scored.
       - ✅ **Browsable country index.** `src/screens/CountryIndexScreen.js` lists all 196
         countries (search by country or capital, filter by region), each row opening its
         country page via `onOpenCountry`. Search/filter logic lives in the pure
         `src/game/countryIndex.js` (`searchCountries()`), tested in `test/engine.test.js`.
         Replaces the temporary "Explore Brazil" preview on `HomeScreen` with a real "Explore
         every country" entry point. `App.js`'s overlay nav gained a lightweight `returnTo`
         field so Back from a country page opened via the index returns to the index, not Home.
       - ✅ **From the map.** Unblocked by M2.3: `WorldMapScreen`'s `ExploreMap` opens a tapped
         country's page via `onOpenCountry`/`returnTo: "worldMap"`, and (M2.3 step 4) every
         country page now also carries a "View on map →" link back, regardless of how it was
         opened — see M2.3 step 4 below for the implementation.
    6. **Polish + a11y pass** across the generalized pages, broken into its own ordered chunks:
       1. ✅ **WCAG AA contrast audit.** Added a pure `contrastRatio()` to `theme.js` (relative
          luminance, no RN/DOM) and asserted it in `test/engine.test.js` for every text/background
          pair the country page renders. `colors.earth` (the kicker + fact-label color) failed AA
          at small sizes — 4.18:1 against `bg`, under the 4.5:1 normal-text minimum — so it's
          darkened to `#8C6036` (now ~4.98:1 on `bg`, ~5.47:1 on `surface`). It's a shared token,
          so Home/Profile/Sign-in/the in-play context card pick up the fix too; everything else
          checked (navy, muted, teal, ink) already passed.
       2. ✅ **Large tap targets.** Audited interactive elements on the country page and index.
          Index rows and both Back buttons already clear ~44×44 from their existing padding. Two
          targets didn't: the related-game buttons (`CountryPageScreen`, ~41px tall) and the
          region-filter chips (`CountryIndexScreen`, ~28px tall) — both gained `hitSlop={8}`,
          chosen to clear 44×44 without overlapping into a neighboring chip's touch area given
          each row's existing `gap`.
       3. ✅ **Offline/image-load fallbacks.** `CountryOutline` now tracks a `failed` state and
          renders a self-contained navy placeholder (◇ glyph + "Outline unavailable") instead of a
          blank/broken box when the remote mapsicon SVG doesn't load — on native via `SvgUri`'s
          `onError`, on web via a zero-opacity `<Image>` probe on the same URL (a CSS mask has no
          load-failure signal of its own). Same visual language as the existing `noOutline`
          placeholder, but self-contained so it also reads correctly on the Shape game's light
          `shapeBox`, not just the country page's navy hero.
       4. ✅ **Transitions.** `CountryPageScreen` now fades/rises in on open and fades/settles out
          on close (`Animated.timing`, `useNativeDriver: true`), matching the fade/rise-in
          `QuizScreen` already uses per question. The Back button's exit is deferred until the
          close animation finishes, instead of cutting away instantly. `onPlay` (jumping straight
          into a related game) still switches screens immediately — that path already lands on
          `QuizScreen`'s own entrance transition, so no double-animation is needed there.
          **M2.2 step 6 (polish + a11y) is now fully done.**
  - **Guardrails for this milestone:** honor the pure/IO split so the tsx tests keep running; any
    Supabase work stays migrations-as-files with RLS + explicit CRUD grants (never `db push`/`link`,
    never handle secrets — leave those as manual steps). Gate each commit on
    `npm test` + typecheck + lint + web bundle.
- **M2.3 — Interactive maps 🌐** — pan/zoom world and region maps; tap a place to explore it; the map
  as the primary way to navigate learning (maps stay the hero).
  - **Ordered sub-checklist** (one scoped chunk per daily run; do these top-to-bottom, don't skip).
    1. ✅ **World Map screen (tap-to-explore, static).** `src/components/ExploreMap.js` renders every
       country with map data as an inert, tappable SVG shape (no candidates/answer state, unlike the
       Locator's `WorldMap`); `src/screens/WorldMapScreen.js` wraps it with a header and Back button.
       Tapping a country opens `CountryPageScreen` via the existing `openCountry` overlay seam
       (`returnTo: "worldMap"` sends Back back to the map, mirroring the country index's own
       `returnTo`). Reachable from a new "World Map" card on Home. No pan/zoom yet — that's next.
    2. **Pan & zoom.** Pinch-to-zoom + drag-to-pan on the World Map screen (web + native), so an SVG
       map with 167 small country shapes is actually usable. Broken into its own ordered chunks:
       1. ✅ **Pinch/scroll-to-zoom.** `WorldMapScreen` now scales the map: two-finger pinch on
          native (via a `PanResponder` that only claims the responder for a 2-touch gesture, so a
          single tap still reaches `ExploreMap`'s `<Path>`s untouched), or the mouse wheel/trackpad
          on web (bound straight to the underlying DOM node, since RN's synthetic events don't
          expose `wheel`). The scale math itself — clamping, pinch-distance ratio, wheel delta — is
          pure (`src/game/mapZoom.js`), tested in `test/engine.test.js`. Zoom is centered on the
          map box, not the gesture point, since there's no pan yet to compensate with.
       2. ✅ **Drag-to-pan.** `WorldMapScreen` now translates the zoomed map on drag: a single
          touch on native only claims the gesture once it moves past a small threshold
          (`MAP_DRAG_THRESHOLD`), so a stationary tap still falls through to `ExploreMap`'s
          `<Path>`s untouched — mirroring the existing 2-touch-only pinch claim. Web has no
          native drag gesture in RN's responder system, so it's driven by real
          `mousedown`/`mousemove`/`mouseup` listeners on the same DOM node the wheel handler
          already uses; a drag past the same threshold sets a `dragged` flag that swallows the
          synthetic `click` a mouse-up would otherwise fire, via a one-shot capture-phase
          listener — so releasing a drag over a country never opens its page, verified in a
          real browser (`chromium-cli`/Playwright) alongside a plain click on Brazil still
          opening its country page. The pan math itself is pure (`dragPan()` in
          `src/game/mapZoom.js`): screen-pixel drag distance divided by the scale in effect when
          the drag began, so content tracks the finger/cursor 1:1 regardless of zoom level;
          tested in `test/engine.test.js`. No bounds clamping yet — that's the next step.
       3. ✅ **Bounds, reset & polish.** `clampPan()` in `src/game/mapZoom.js` caps how far the map
          can pan at a given zoom level and box size (0 at 1x — nothing to pan into a fully-fit
          view), so a drag or pinch-zoom-out can never leave empty space around the map; tested in
          `test/engine.test.js`. `WorldMapScreen` re-clamps on every pinch/wheel/drag update (via a
          `boxSizeRef` populated by the map box's `onLayout`) and adds a "Reset view" pill (theme
          tokens, top-right of the map) that appears once zoomed or panned and snaps back to
          scale 1 / pan `{0,0}`. Verified in a real browser (`Playwright`/Chromium): zoom, drag
          past the edge, confirm land stays visible, click Reset, confirm it snaps back and the
          pill disappears. That pass also caught and fixed a real bug in the existing (M2.3 step
          2b) drag-to-pan code: the "swallow the click a mouseup fires at the end of a drag" web
          listener was bound to the map box's own DOM node, so a drag released with the cursor
          outside that box (over the header, near the new Reset pill, off-window) left the
          listener attached forever, silently eating the *next unrelated click* inside the map —
          including on Reset itself. Now bound to `window`, where it always sees the click
          regardless of where the drag ended. Perf (`Animated.Value` + native driver) wasn't
          needed — plain `useState`-driven transforms felt fine under fast wheel/drag in Chromium.
          **M2.3 step 2 (pan & zoom) is now fully done.**
    3. **Tap affordance polish.** Hover/pressed states (web), larger effective hit-targets for small
       countries, and a country-name label near the tap point before the page opens.
       Broken into its own ordered chunks:
       1. ✅ **Hover highlight (web).** `ExploreMap` tracks the country under the cursor and fills
          it `colors.teal` (the same accent the Locator uses for a live candidate) instead of
          `colors.surfaceAlt`, with `cursor: "pointer"` on every tappable shape — mouse-only via
          `onMouseEnter`/`onMouseLeave`, gated on `Platform.OS === "web"` since touch has no hover
          concept and native never fires these handlers. No pressed/active state yet — the app has
          no existing press-feedback pattern anywhere to match, and a tap here navigates away
          immediately, so a press flash would mostly go unseen; revisit only if it turns out to be
          needed.
       2. ✅ **Larger effective hit-targets for small countries.** `src/game/mapHitTargets.js`
          (pure, tested) computes each country's bounding box from its own path data and, for the
          long tail whose longest side is under `MAP_SMALL_COUNTRY_MAX_SIZE` (6 viewBox units —
          e.g. Luxembourg, Qatar, Rwanda, Brunei, not merely-smallish countries the existing
          pinch-zoom already handles), returns an invisible circular hit target centered on that
          bounding box at a fixed `MAP_SMALL_HIT_RADIUS` (5 units) regardless of the real shape's
          size. `ExploreMap` renders these as transparent `<Circle>`s layered on top of every
          `<Path>`, so they win the hit test in whatever they overlap; hover/tap still key off the
          same country code, so the tiny real shape highlights correctly even though the tappable
          area is larger. Both constants live in `constants.js`.
       3. ✅ **Country-name label near the tap point before the page opens.** `ExploreMap` now shows
          the tapped country's name at its own bounding-box centroid (`countryCentroids()` in
          `game/mapHitTargets.js`, pure + tested) for `MAP_TAP_LABEL_DELAY_MS` (380ms) before
          `onSelect` actually opens its page — long enough to read, short enough to still feel like
          one tap — and highlights the shape teal for the same beat, so a touch device with no hover
          still gets visual confirmation of what it tapped. Works identically whether the tap landed
          on the country's real shape or one of step 3.2's enlarged small-country hit circles, since
          both route through the same `handleTap`. Rendered as SVG `<Text>` inside the same `<Svg>`
          the pan/zoom transform wraps, so the label tracks the map at any zoom level with no extra
          position math; a dark stroke under the fill keeps it legible over both land and water.
          Added a shared `countryName(code)` helper to `data/countries.js` (also now used by
          `CountryPageScreen`, replacing a duplicate inline lookup). Verified in a real browser
          (Playwright/Chromium): tapping Brazil and Luxembourg (via its enlarged hit circle) each
          show the correct name at the tap point, then open the right country page after the delay.
          **M2.3 step 3 (tap affordance polish) is now fully done.**
    4. ✅ **Wire the M2.2 map entry point.** The World Map → country page direction already worked
       (`ExploreMap`'s `onSelect` → `onOpenCountry`, shipped in M2.3 step 1) — what was missing was
       the reverse: a country page opened from the index or a quiz round's context card had no way
       back to the map (only `returnTo: "worldMap"` did, and that's map-only). `CountryPageScreen`
       now takes an `onViewMap` prop and renders a "View on map →" link next to Back (`App.js` wires
       it straight to `openWorldMap`), fading out the page the same way Back does before switching
       screens. Verified in a real browser (Playwright/Chromium): Home → Explore (index) → Brazil →
       "View on map" lands on the World Map screen. **M2.3 step 4 is now done; M2.2 step 5 is
       fully done.**
    5. **Region maps** — zoomed presets (e.g., "Europe", "Africa") reachable from the world map, for
       focused exploration without hunting for tiny countries. Broken into its own ordered chunks:
       1. ✅ **Region bounds + viewport math (pure + tested).** `src/game/mapRegions.js`:
          `MAP_REGIONS` (the five regions `countries.js`/`countryIndex.js` already group countries
          into), `regionBounds(countryPaths, codes)` unions a region's own countries' bounding boxes
          (reusing `pathBounds` from `mapHitTargets.js`, skipping any code with no `COUNTRY_PATHS`
          entry), and `regionView(bounds, view, box, min, max, margin)` converts that into the
          `{ scale, pan }` the screen's existing zoom/pan transform needs to frame it — reusing
          `clampScale`/`clampPan` from `mapZoom.js` so a region view can never zoom past
          `MAP_ZOOM_MAX` or pan past the map's own edge. Takes the SVG viewBox and the actual
          on-screen box as separate inputs (pan lives in box-pixel units, not viewBox units — see
          the module's own comments) so it stays pure and screen-size-independent. Tested in
          `test/engine.test.js`. *(Next up: step 2 — wire a region-picker UI onto
          `WorldMapScreen`/`ExploreMap` that calls this math and animates to a preset.)*
       2. ✅ **Region picker UI.** `WorldMapScreen` now renders a row of pills ("World" +
          `MAP_REGIONS`) above the map; tapping one calls `regionView()` with that region's
          precomputed bounds and the map box's live on-screen size (`boxSizeRef`, from
          `onLayout`), then jumps scale/pan straight to the returned framing — no animation yet,
          that's part of step 3's polish. Tapping the already-active region, or the "World" pill,
          resets to the full fit (`resetView()`, which now also clears `activeRegion`). Region
          bounds are computed once per region at module load
          (`COUNTRIES.filter(c => c.region === region)` → `regionBounds`), same pattern as
          `ExploreMap`'s precomputed `SMALL_HIT_TARGETS`. `ExploreMap` exports its own cropped
          viewBox (`EXPLORE_MAP_VIEW`) so the screen can feed `regionView()` the exact same crop
          it renders, instead of a second hardcoded copy of the inhabited-band constants.
          Verified in a real browser (Playwright/Chromium): a static-export smoke test clicking
          through all five region pills, the active-pill reset, and the World pill, checking the
          map's actual CSS transform each time — not just that the UI renders.
          That pass caught a real bug in `mapRegions.js`'s `regionBounds()` (from step 5.1):
          Russia's Natural Earth shape straddles the antimeridian in this equirectangular
          projection (its Chukotka peninsula sits near map x=0, its western border near
          map x=`MAP_W`), so the naive min/max bounding box read as "spans the entire world" —
          which swamped the "Europe" preset into a no-op (fit scale clamped to 1, i.e. no zoom at
          all). No real, non-wrapping country comes close: the next-widest actual span in the
          dataset is the US at ~210 of 720 map units. `regionBounds()` now treats a country whose
          own bounding box exceeds a generous threshold (400 units) the same as one with no path
          data — skipped, so the region still resolves from its other members — fixed at the
          source rather than special-cased by country code, and covered by a synthetic
          antimeridian-wrapping fixture plus a real-data assertion on Europe's own bounds in
          `test/engine.test.js`. Russia itself still renders correctly on the map; this only
          affected which countries anchor a region preset's framing.
       3. ✅ **Polish.** A region-pill (or Reset) jump now tweens scale/pan over
          `MAP_REGION_ANIMATION_MS` (320ms) instead of cutting straight to it — `WorldMapScreen`'s
          `animateTo()` drives an `Animated.Value` from 0→1 and applies `lerpView()` (new, pure,
          tested in `src/game/mapZoom.js`) on every frame, snapping to the exact target on finish so
          `isReset`'s `===` check can't be left just short of `{1, {0,0}}` by float drift. The active
          region now labels itself on the map (a teal pill, top-left, mirroring the existing
          top-right Reset pill) whenever a preset is framed. For picker/manual-gesture coexistence:
          a manual pinch/drag/wheel — the same three input paths that already call `applyScale` or
          adjust `pan` directly — now also clears `activeRegion`, since the view has moved off
          whatever preset framed it and the pill would otherwise keep claiming a match it no longer
          has; re-earned only by tapping a pill again. That also exposed a pre-existing conflation:
          the World pill was highlighting on bare `activeRegion === null`, which after this change
          would read "at World" immediately after a manual gesture even though the view was neither
          reset nor on a preset — so the World pill's active condition is now `activeRegion === null
          && isReset`, and only a region's own selection lights up a region pill. Verified in a real
          browser (Playwright/Chromium, driven against a static export since the dev server's
          startup dependency check can't reach the network in this environment): a mid-animation
          transform read partway between the start and target matrices (confirming a real tween, not
          a cut), the Europe label rendered at the expected map position, the World pill was inactive
          immediately after selecting Europe and active again after toggling it off, and a manual
          drag after selecting Europe reverted the Europe pill from teal to its inactive `surface`
          color. **M2.3 step 5 (region maps) is now fully done, which completes M2.3 — Interactive
          maps — end to end.**
- **M2.3.7 — The globe 🌐** — replace the Explore surface's flat map with a spinnable 3D globe, with
  every country outlined. Maps are the hero; a globe is the honest version of that.
  - ✅ **Step 1 — projection, motion, and the Explore surface.** An **orthographic SVG globe**, not
    WebGL: an orthographic projection *is* what a sphere looks like, so this keeps every country a
    real `<Path>` — tap hit-testing, theme fills and crisp vector borders all survive — and it runs
    the same on web, iOS and Android with no new dependency. The decision math is pure and tested:
    `src/game/globeProjection.js` (projection, visibility, horizon clipping with limb arcs,
    path building) and `src/game/globeMotion.js` (spin/wrap/clamp, region centers and framing).
    `src/components/GlobeMap.js` renders it; `WorldMapScreen` keeps its gesture plumbing verbatim
    and swaps pan→spin, bounding-box presets→rotations.
    Three things worth recording:
    - **No new map asset was needed.** `worldMap.js` stores pre-projected pixels, but that
      projection is linear, so it inverts exactly — `src/data/worldGeo.js` recovers the sphere at
      module load. The flat map and the globe therefore share one source of truth and can never
      disagree about where a border runs.
    - **A fixed viewBox with a growing radius**, rather than a scaled canvas. That's what keeps
      borders a true hairline at every zoom; the flat map's scaled canvas fattened its own strokes
      as it zoomed in.
    - **The antimeridian trap, avoided by construction.** Region presets average *vectors*, not
      lng/lat, so the Russia bug that forced an explicit guard into `mapRegions.regionBounds()`
      cannot arise here. Covered by a test that would fail under lng/lat averaging.
    Verified in a real browser: spin, region presets, zoom (borders stay hairline), tap→country
    page, and a drag released over a country correctly *not* opening it. 60 checks, including the
    projection's one hard invariant — across all 8,190 points at four orientations, nothing draws
    outside the sphere's silhouette.
  - ☐ **Step 2 — the Country Locator.** The game still uses the flat map. A globe hides half the
    world, so this needs a product call first: auto-spin to bring the answer into view, restrict
    rounds to the visible hemisphere, or make hunting part of the challenge.
  - ☐ **Step 3 — verify on a device.** Only web is checked. The per-frame reprojection is ~3ms in
    Chromium, but react-native-svg on a phone is a different renderer and an unknown here. Until
    that's done `ExploreMap.js` and the flat-map math (`clampPan`/`dragPan`/`lerpView`,
    `regionBounds`/`regionView`) stay in the tree as a fallback rather than being deleted.
  - ✅ **Step 4 — polish.** Broken into its own ordered chunks, reordered from the original prose
    (graticule, terminator, momentum, spin-to-country) to put the lowest-risk, most
    self-contained item first — the other three either touch every-frame rendering (graticule,
    terminator) or gesture math (momentum), while this one is pure navigation wiring that reuses
    framing math already shipped for the region pills:
    1. ✅ **"Spin to this country" from a country page's "View on map" link.** Opening the map
       from a country page now spins the globe straight to that country instead of always
       resetting to `DEFAULT_SPIN`. `WorldMapScreen` takes a `focusCountry` prop (`App.js`'s
       `openWorldMap(code)`, wired from `CountryPageScreen`'s `onViewMap`) and, on mount only,
       tweens to it via the existing `animateTo()` the region pills already use. Direction reuses
       `groupSpin` unchanged — a "group" of one country's own center — but framing needed a new
       pure function: `groupZoom` compares countries' *centers* against each other, so a lone
       country (center vs. itself) always reads as ~0° apart and would zoom every country, from
       Russia to the Vatican, to roughly the same tight view. `countryAngularRadius()` (new,
       `src/game/globeMotion.js`) measures a country's own outline extent from its center instead
       — the same angular measurement `GlobeMap.js`'s small-country hit-target sizing already
       uses — and the zoom-from-angle math itself was extracted from `groupZoom` into its own
       `zoomForRadius()` so both call sites share one formula. 9 new checks in
       `test/engine.test.js`, including a real-data assertion that framing Brazil zooms in less
       than framing Luxembourg (Brazil already fills more of the view on its own) — the exact
       case that would have silently regressed to "everything zooms to max" without the fix.
       Verified in a real browser (Playwright/Chromium, static export, placeholder Supabase env):
       Home → Explore → Brazil → "View on map" settles at zoom ≈1.75, not 4; the same path via
       Luxembourg settles at the 4x clamp, confirming the framing actually scales with the
       country's real size instead of collapsing every target to the same zoom.
    2. ✅ **Graticule.** Latitude/longitude grid lines on the sphere, 30° apart (12 meridians, 5
       parallels — poles excluded, since a circle of latitude there is a single point). The
       geometry is pure and tested: `graticuleLines()` (`src/game/globeProjection.js`) builds each
       line once, in world space, at module load — it doesn't depend on orientation, so it's
       reused every frame the same way `COUNTRY_RINGS` is. Meridians are open pole-to-pole
       polylines; parallels are represented as an open polyline whose first and last sample
       coincide (lng −180 and 180 are the same point), so a full circle needs no separate
       "closed ring" wraparound case. `projectGraticuleLine()` reprojects a line per frame and
       clips it to the visible hemisphere exactly like `projectRing()` does for a country — reusing
       the same `horizonCrossing()` — but simpler: a grid line is stroked, not filled, so it just
       stops at the horizon and resumes wherever it re-enters, with no limb-walk needed to close a
       shape. `GlobeMap.js` draws the projected lines (`colors.line`, a `GLOBE_GRATICULE_WIDTH`
       hairline) *before* the country paths, so the grid is only ever visible through open ocean
       and disappears under land the same way a coastline would occlude it — no extra clipping
       logic required. 12 new checks in `test/engine.test.js`. Verified in a real browser
       (Playwright/Chromium, static export, placeholder Supabase env): the grid renders across the
       ocean and is cleanly hidden under every landmass, at the default orientation.
    3. ✅ **Atmosphere/limb glow.** A soft halo rings the globe's silhouette, the way any real photo
       of Earth from space shows the atmosphere scattering light at the limb — no sun-position model
       exists anywhere in the app, so this is deliberately a symmetric glow around the whole disc
       rather than a true day/night terminator line (the roadmap item's original name overstated
       what shipped; retitled to match). Two new circles in `GlobeMap.js`, both purely additive —
       no change to the projection math, hit-testing, or any existing constant:
       - A `RadialGradient`-filled circle at `radius + GLOBE_ATMOSPHERE_WIDTH`, drawn *before* the
         ocean circle so land/water occlude its inner portion — only the glow bleeding past the
         sphere's true edge is visible, a rim light rather than a filled wash. The gradient's zero
         point sits exactly on the sphere's real edge and its peak partway into the margin beyond
         it, computed as fractions of the outer circle's own radius each frame — so it holds the
         same shape at any zoom instead of being tuned for one.
       - A crisp `stroke`-only circle at the sphere's exact radius, drawn *after* every country path
         so a thin bright line traces the true limb on top of both land and water.
       Both new circles are `pointerEvents="none"`, so hit-testing and hover state are unchanged.
       `GLOBE_ATMOSPHERE_WIDTH` is a fixed viewBox-unit constant, like `GLOBE_BORDER_WIDTH` — a
       constant on-screen thickness at every zoom rather than one that grows with the sphere, so the
       glow reads as a thin physical layer and shrinks to a hairline (then off-canvas, same as the
       existing border/graticule) at high zoom rather than ballooning. No new pure logic worth a
       module of its own — this is rendering-only, unlike the graticule's own geometry. Verified in
       a real browser (Playwright/Chromium, static export, placeholder Supabase env): the halo and
       rim render at the default World view, scale correctly through a region-pill zoom (Europe) and
       a further wheel zoom, and a tap on Brazil still opens its country page with no console errors
       — confirming the new circles don't intercept hits near the globe's edge.
    4. ✅ **Spin momentum.** A drag/flick released while still moving now keeps the globe
       turning and eases to a stop, instead of stopping dead where the finger let go. The
       decision math is pure and tested: `src/game/globeMotion.js` gains
       `spinVelocityFromDrag()` (screen-pixel drag velocity → spin velocity, reusing
       `spinFromDrag`'s own radius-scaled ratio so a flick at a given zoom keeps spinning
       at the speed it looked like it was going), `decayVelocity()` (exponential decay
       framed per `MOMENTUM_FRAME_MS` so the same felt deceleration holds regardless of
       actual frame rate — a dropped frame decays proportionally more, not less),
       `isMomentumDone()`, and `stepMomentum()` (reuses `clampSpin`, so a coasting spin
       wraps the antimeridian and clamps at the poles exactly like any other spin update).
       9 new checks in `test/engine.test.js`. `WorldMapScreen` drives the actual coast with
       its own `requestAnimationFrame` loop (`startMomentum`/`stopMomentum`) rather than
       reusing `animateTo`'s `Animated.timing` — momentum has no fixed destination or
       duration, just a velocity that decays every frame until it's imperceptible. Native
       gets its release velocity for free from `PanResponder`'s own `gestureState.vx/vy`;
       web has no such gesture primitive, so `WorldMapScreen`'s mouse-drag listener now
       also tracks an exponential-moving-average velocity across `mousemove` (the same
       smoothing RN does natively — a raw last-frame delta is too noisy to flick well
       from) and hands it to `startMomentum` on `mouseup`. A fresh gesture — a new drag,
       a region-pill jump, Reset, or the screen unmounting — always calls `stopMomentum()`
       first, so a second flick or a pill tap cuts a coast short rather than fighting it.
       Verified in a real browser (Playwright/Chromium, static export, placeholder
       Supabase env): a fast mouse flick released mid-motion keeps rotating the globe for
       several frames after `mouseup` with no further input, then settles to a fixed
       orientation and stops changing — confirming both the coast and the decay-to-stop,
       not just that the code compiles. **M2.3.7 step 4 (polish) is now fully done**,
       leaving only step 2 (Country Locator on the globe, blocked on a product call) and
       step 3 (device verification) open in M2.3.7.
- **M2.3.5 — Content backend 🧱 (prerequisite for AI)** — move country content from bundled JSON into
  a public-read `content.*` schema in Supabase so content updates ship *without an app release*, and
  so it can be queried/embedded. Keep text + structured facts in Postgres; media stays URLs on
  Storage/CDN (never binaries in the DB). The app fetches per-country on demand with a local cache +
  a `content_version` check; a lightweight baseline (index + hero) stays bundled for offline/instant
  first paint. Keep the pure/IO split: cache-invalidation *decisions* pure and tested, Supabase IO
  beside them. Seed via a JSON→Postgres migration script; existing `countryPages.js` becomes the seed
  source, then the app reads from the API.
  - **Sub-checklist.** The code is done and **verified end-to-end against a real local Postgres**:
    migration applied from scratch, seeded, public read confirmed, writes confirmed denied for both
    anon and authenticated, and an edit made directly in Postgres appeared on the country page in a
    browser — then a second edit's `content_version` bump invalidated the cache and the app refetched.
    That is the milestone's whole thesis demonstrated: **content changed without an app release.**
    The live-project steps are now done too (2026-09-04): migration applied, `content` exposed in the
    Dashboard, seed run — `content_version` 5, 196 rows — and the live site confirmed reading
    Postgres rather than the bundled fallback.
    ☐ **Follow-up: seed `content.country_media`.** It is live but empty (0 rows). No surface reads it
    yet, so nothing is broken; it just means the media half of this milestone has never been
    exercised against production. Worth doing when the first media-bearing surface lands.
    1. ☑ **Schema, as a migration file.** `supabase/migrations/*_init_content_domain.sql`:
       `content.countries` (the M2.2 page shape as columns, incl. `neighbors` / `related_game_modes` /
       `has_outline`, which the sketch omitted but the shipped page renders), `content.country_media`
       (URLs + attribution only), and a singleton `content.content_version` bumped by *statement*-level
       triggers, so a 196-row seed costs a handful of bumps rather than 196. Public-read RLS
       (`for select using (true)` to anon + authenticated), no write grants or policies for either
       role, and explicit CRUD grants throughout — the grant-less-RLS trap from M2.1.
    2. ☑ **The second trap, found here:** PostgREST serves only `public` + `graphql_public` by default,
       so `content.*` 404s with otherwise-perfect grants and RLS. Fixed in `config.toml` for local;
       **the cloud project needs the same entry added by hand in the Dashboard** (it's a project
       setting, not something a migration can carry).
    3. ☑ **Repeatable seed.** `npm run seed:content` (`scripts/seed-content.js`) upserts all 196
       countries on `code`, so re-running is idempotent and is also how a correction ships. It seeds
       *through* `getCountryPage()`, so Postgres holds exactly what the app renders offline — no
       second merge rule that could drift from the first. Needs the **secret** service-role key,
       passed per-run and deliberately absent from `.env.example`: everything in that file is inlined
       into the client bundle.
    4. ☑ **Pure decisions, tested with fakes.** `src/game/contentSync.js` (page ⇄ row, both
       directions) and `src/game/contentPolicy.js` (cache keys, version freshness, and a fully
       dependency-injected resolver ordering fresh cache → remote → stale cache → bundled). 44 checks,
       no network and no React Native import. Notable calls: an unreachable version treats the cache
       as fresh rather than attempting a doomed fetch, and a stale entry outranks the bundled baseline
       because it's likelier to be richer. A round-trip check over all 196 countries guards the
       seed/fetch seam, so a renamed column can't silently drop a section from a country page.
    5. ☑ **Fetch layer + baseline.** `src/data/contentSource.js` wires storage and Supabase into that
       resolver. `CountryPageScreen` paints bundled content synchronously, then swaps in the fetched
       page — never blank waiting on the network. The bundled dataset stays the floor: seed source
       *and* offline baseline, so the two agree by construction.
    6. ☑ **Verified against a real Postgres** (`supabase db reset` + seed + a driven browser). This
       caught two bugs nothing else would have: the seed script couldn't run at all as `.mjs` (true
       ESM can't take named imports from the CJS-transpiled `src/` modules — it's `.js` now, matching
       `test/engine.test.js`), and `supabase-js` throws on Node 20 because its realtime client needs
       a global `WebSocket`. The seed now talks to PostgREST over plain `fetch`: two HTTP calls, no
       client, no version-dependent breakage.
    7. ☑ **Migration applied to the live project** (2026-09-04, `npx supabase db push --linked`).
       Worth recording: **the DB password was never needed.** Recent CLI versions provision a
       temporary login role over the Management API, so `db push`, `migration list`, `db dump`, and
       `inspect db` all reach the remote database on the stored access token alone. The step had been
       parked as human-only on an assumption that no longer holds.
       ☐ **Still open: expose `content` in the Dashboard.** Confirmed outstanding against the live
       project — an anon REST read with `Accept-Profile: content` returns
       `PGRST106 — Invalid schema: content / Only the following schemas are exposed: public,
       graphql_public`. **Do not reach for `supabase config push` for this.** It does carry
       `api.schemas`, but it pushes the whole of `config.toml`, including `[auth]` — which would
       overwrite the live `site_url` with `http://127.0.0.1:3000` and wipe the production redirect
       URLs, breaking Google sign-in and magic links. There is no narrower CLI command, so this one
       stays a Dashboard toggle.
    8. ☐ **Seed the live project** and confirm a country page reads from it. Blocked on step 7 — the
       seed writes through PostgREST with `Content-Profile: content`, so it hits the same
       `PGRST106` until the schema is exposed. Both paths are already proven locally; these steps
       just point them at production.
- **M2.3.6 — Learner interests 🧭 (the personalization signal)** — ask a new account what it's curious
  about, then let that steer what we surface. One short, **entirely optional** prompt at sign-up with a
  real Skip — the app must be fully usable having answered nothing, and a skipper is never re-nagged
  (offer it once more, much later, at most). This is the input M2.9 personalizes on, so the sooner it
  ships the more accounts already carry the signal when the AI hub arrives.
  - **Ordered sub-checklist** (one scoped chunk per daily run; do these top-to-bottom, don't skip).
    1. ✅ **The one prompt: "Select your interests."** A single multi-select on a card after sign-up —
       *Economics · History · Agriculture · Military · Tourism · Geopolitics · Climate · Culture ·
       Wildlife · Food* — with **Skip** given equal visual weight to Continue (no dark patterns; a
       skipped answer is a valid answer). Multi-select, no minimum, no maximum. Ships as one screen
       and nothing else — resist bundling difficulty/region pickers in, those are M2.8.
       Landed as `src/screens/InterestsScreen.js`: a card of pill chips (theme tokens only) that
       toggle independently, no min/max, with Skip and Continue rendered at the same size and weight
       (differing only in fill) so Skip never reads as the lesser option. The interest list is
       inline in this screen for now — step 2 moves it into the pure, tested catalog module this
       screen will read from instead. Nothing is persisted yet (steps 3-4); both Skip and Continue
       currently just close the screen. Wired behind a temporary "What are you curious about?
       (preview)" row on the signed-in Profile tab (`App.js`'s `openInterests`/`screen.name ===
       "interests"` overlay, same pattern as every other M2.2/M2.3 overlay) purely so it's reachable
       for review — that row is not the real entry point and goes away once step 5 adds the actual
       Profile "Interests" row. Verified in a real browser (Playwright/Chromium, driven against a
       static export with placeholder Supabase env, same workaround M2.3's region-map polish pass
       used): chips toggle independently and Continue returns to Home; Home and the signed-out
       Profile tab (no real account reachable in this sandbox) still render with no console errors,
       confirming no regression.
    2. ✅ **The catalog, pure.** `src/data/interests.js` — slug + label + glyph per interest, ordered
       for display. Store **stable slugs** (`"geopolitics"`), never display strings, so labels and
       ordering can change without a migration or a data backfill. `src/game/interestPolicy.js` stays
       pure and tested: validate a selection against the catalog, drop unknown slugs (an old client
       may send a retired one), and normalize order so two equivalent selections compare equal.
       `InterestsScreen` now reads its chips from `INTERESTS` instead of an inline array, and its
       selection state holds slugs, not labels; Continue now passes `normalizeInterests(selected)`
       to `onContinue`. Nothing is persisted yet (that's steps 3-4), so this is purely tightening the
       data the screen produces ahead of a schema landing. 11 checks in `test/engine.test.js`: catalog
       shape (unique slugs, every entry has slug/label/glyph), slug validation, and normalization
       (ordering, deduping, dropping unknown slugs, `null`/`undefined`/`[]` inputs). *(Next up: step
       3 — the `profile_interests` schema migration.)*
    3. ✅ **Schema.** `supabase/migrations/20260811130000_init_profile_interests.sql`:
       `public.profile_interests` (`user_id`, `interest_slug`, `created_at`, composite primary key on
       `(user_id, interest_slug)` so a re-selected slug upserts rather than duplicating) — a join table
       rather than a `text[]` on `profiles`, so interest-weighted retrieval in M2.9 becomes a plain SQL
       join and "how many learners care about X" stays one `GROUP BY` instead of array gymnastics. No
       FK to a slugs table — the catalog (`src/data/interests.js`) is code, not data, and
       `normalizeInterests()` already validates/drops unknown slugs client-side before a row is ever
       written. Owner-only RLS (`auth.uid() = user_id`) **and explicit CRUD grants to `authenticated`**
       (the grant-less-RLS trap from M2.1 cost a debugging session once already); `anon` gets nothing,
       matching the rest of the user domain. Not yet applied to any Postgres, local or live —
       `npx supabase db reset` needs Docker Desktop running (see DANNY TO DO), so this is unverified
       against a real database until then. *(Next up: step 4 — the offline-first sync seam.)*
    4. ✅ **Offline-first + the merge seam.** `src/storage/interests.js` (AsyncStorage, same shape as
       `storage/progress.js`) is the local cache, written on every selection change whether signed in
       or out. `src/game/interestSync.js` stays pure (mirrors `cloudSync.js`): row⇄slug mapping,
       `mergeInterests()` (union, not max — an interest is a binary pick, not a running total, so
       neither device's picks get dropped), and `diffInterestRows()` so a cloud write touches only the
       rows that actually changed. `src/storage/cloudInterests.js` is the IO sibling
       (`fetchInterests`/`pushInterests`/`migrateLocalInterestsToCloud`), gated by its own
       `INTERESTS_MIGRATED_KEY` — separate from progress's flag, since a player can sign in long
       before ever opening the interests screen. `App.js` reuses `roundSinks(user).cloud` for the sink
       decision rather than inventing a second policy function, hydrates/saves interests alongside
       progress and settings, and runs the migration on sign-in the same way. `InterestsScreen` now
       takes `initialSelected` so reopening it (once step 5 wires a real entry point) reflects whatever
       was already picked, instead of always starting blank. 24 new checks in `test/engine.test.js`
       for `interestSync.js`. Verified: `npm test`, `npm run typecheck`, `npm run lint`, and
       `npm run build` are all green; a Playwright pass against a static export (placeholder Supabase
       env, same workaround prior polish passes used) confirmed Home and the signed-out Profile tab
       still render with no console errors — the actual cloud round trip needs a real account, which
       this sandbox doesn't have. *(Next up: step 5 — the real "Interests" entry point on Profile,
       replacing the temporary preview row.)*
    5. ✅ **Editable later.** The Profile tab's temporary "What are you curious about? (preview)" CTA
       is now the real entry point: a "Preferences" section with an "Interests" settings row (label +
       live summary — "Not set — tap to choose", or "N selected" — + a chevron), styled like the rest
       of Profile's cards rather than a standalone pill button. `ProfileScreen` now takes an `interests`
       prop (threaded from `App.js`'s existing state) purely to render that summary; opening the row
       still calls the same `onOpenInterests` → `InterestsScreen` seam from step 1, now seeded via
       `initialSelected` so a returning player sees their existing picks rather than a blank card —
       the same component genuinely doubles as the edit surface, with no new persistence logic needed
       since steps 3-4 already made both Skip and Continue write through. **M2.3.6 — learner interests
       — is now fully done end to end** (prompt → catalog/policy → schema → offline-first sync →
       Profile entry point). Verified: `npm test`, `npm run typecheck`, `npm run lint`, and
       `npm run build` are all green; a Playwright pass against a static export (placeholder Supabase
       env in a local, gitignored `.env` — the workaround prior polish passes used, this time via a
       real `.env` file since inline shell-exported env vars weren't picked up by Expo's dotenv loader
       here) confirmed Home and the signed-out Profile tab render with no console errors. The signed-in
       Profile view — where the new Interests row actually renders — needs a real account, which this
       sandbox doesn't have, so that path is unverified in a browser; it's covered by typecheck/lint
       and mirrors the existing `Stat`/`identity` row patterns already used elsewhere on the same
       screen.
    6. ✅ **The prompt actually fires at sign-up.** Steps 1-5 built the screen and all its plumbing,
       but nothing ever *asked*: `grep` found no first-run gate anywhere, and the `interests` route
       was only ever reached from the Profile row. So the milestone's opening promise — "one short,
       entirely optional prompt at sign-up" — was unmet; it shipped as a settings screen. Now
       `src/game/interestPrompt.js` (PURE) owns the decision and `App.js` acts on it.
       `resolveInterestPrompt()` returns `{ prompt, markAsked }` and enforces the anti-nag rules the
       milestone is written around: a signed-in account with nothing on file is asked exactly once;
       **a skip is an answer**, so an empty selection after asking never re-triggers; an account
       whose picks arrived from another device is silently marked rather than asked; and signing out
       never burns the one prompt. The subtle part is that `markAsked` is true whenever we prompt —
       recorded the moment the screen opens, not when a button is pressed — so dismissing with Back
       still counts as asked. A test asserts the invariant directly: **no input asks without also
       marking**, since that combination would re-prompt forever.
       The flag is `worldwise.interests.asked.v1` in `src/storage/interests.js`, kept separate from
       the selection itself because the two answer different questions (an empty array is a real
       answer; "never asked" is not). Device-local, a deliberate tradeoff documented in that file:
       a second device with nothing picked asks once more, which the milestone explicitly allows
       ("once more, much later, at most"), where making it per-account would mean a `profiles`
       column and a migration.
       The gate waits on a new `interestsSettled` flag set when `migrateLocalInterestsToCloud`
       resolves, so it judges a real selection rather than the empty array state starts as — without
       it, every returning player on a new device would be asked despite having picks in the cloud.
       A ref guards against the async `markInterestsAsked` racing a re-render into a double push.
       14 checks in `test/engine.test.js`. Verified in a real browser that signed out stays on `/`
       with no prompt and — importantly — leaves the asked flag `null`, so the prompt isn't spent;
       and via the pure nav functions that pushing `interests` stacks on whichever tab is active and
       Back returns to that tab's root, from Profile (where sign-up happens) and from Home alike, so
       there's no dead end either way. The signed-in prompt itself needs a real account on the dev
       origin, so it is covered by tests but unseen in a browser — to trigger it on a deployed build,
       delete `worldwise.interests.asked.v1` from localStorage and reload while signed in.
    7. ✅ **Skip cancels instead of wiping on the edit path.** The screen does double duty, and both
       paths ran the same handler: opening it from Profile with picks on file and tapping Skip called
       `setInterests([])` and pushed the empty selection to the cloud, silently wiping them.
       `resolveSecondaryAction({ origin, initialSelected })` in `game/interestPrompt.js` now decides
       the label and the meaning — "Skip"/commit-empty for the sign-up prompt, "Cancel"/leave-alone
       for the edit surface — and `InterestsScreen` renders that decision rather than making it.
       The origin is App state, deliberately not carried in the URL, defaulting to the
       non-destructive `edit`, so a reload straight onto `/interests` can only offer Cancel. The
       guarantee that actually closes the bug is stronger than the origin plumbing though:
       **`clears` is never true when picks exist**, for any origin, so a mis-threaded or unrecognized
       origin degrades to a harmless Cancel instead of data loss. 10 checks, including an exhaustive
       sweep asserting no combination clears while picks exist.
       *(Next up: M2.9's own sub-checklist, once its DANNY TO DO lead-time items are in place —
       see below.)*
  - **Dependencies:** none beyond M2.1 (accounts), which is done — this does **not** need M2.3.5 and is
    deliberately placed before M2.9 only because that milestone consumes it. Pull it earlier if you want
    the signal accruing sooner; it's a small, self-contained milestone.
- **M2.9 — AI knowledge hub (RAG) 🤖** — let learners "dive deeper" into a place or topic they're
  curious about, with AI that frames discoveries **grounded in our own verified content** (no
  free-floating hallucination — critical because the audience includes students).
  - **Ordered sub-checklist** (decompose just-in-time when this milestone is next):
    1. ✅ **Embeddings store** — `supabase/migrations/20260904220820_init_embeddings.sql`, **verified
       locally, awaiting the production push.** Enables `pgvector` (into `extensions`, per Supabase
       convention) and adds `content.embeddings`: `country_code` FK to `content.countries` with
       `on delete cascade`, `chunk_index`, the chunk `content` verbatim, `embedding vector(384)`,
       `source` (which field the chunk came from), `created_at`, and `unique (country_code,
       chunk_index)` so the re-runnable ingestion upserts instead of piling up near-duplicates.
       384 dimensions because embeddings come from Supabase's built-in **gte-small** (Supabase.ai)
       — no external embedding vendor, no second API key. HNSW over `vector_cosine_ops`: gte-small
       emits normalized vectors, and HNSW needs no training pass, where an IVFFlat index would need
       its list count retuned as content grows and would silently *degrade recall* rather than error
       when it went stale.
       Two decisions worth carrying forward. **No `content_version` bump trigger** — that version
       drives the client's per-country page cache, and embeddings are server-side retrieval data no
       client reads; bumping on re-ingestion would invalidate every cached page on every device for
       a change none of them can see. The dependency runs the other way: a version bump triggers
       re-ingestion. And **`content.match_country_chunks()` ships with the schema**, because vector
       search is not expressible through PostgREST — there is no way to write `order by embedding
       <=> $1` as a REST filter, so without this function step 3 has no way to retrieve at all. It
       returns cosine *similarity* (1 - distance) so callers get an intuitive "at least this
       relevant" floor, takes an optional `filter_country` (null = the discovery surface, a code =
       "Ask about {place}"), and is SECURITY INVOKER since it only reads a public table.
       Public read (matching the rest of `content` — these chunks are verbatim slices of text
       already on public country pages), writes service-role only, explicit CRUD grants.
       Verified on a local Postgres, not just applied: `db reset` from scratch; cosine ranking
       correct (exact match 1.0, orthogonal 0.0, properly ordered); re-ingestion upserts (3 chunks
       stay 3, content revised); `content_version` provably **not** bumped by an embeddings write
       (2 → 2); `min_similarity` and `filter_country` both filter; null-embedding rows excluded from
       retrieval; FK cascade removes a deleted country's chunks; and per-role checks confirming
       `anon`/`authenticated` can select and call the match function but are denied INSERT/UPDATE/
       DELETE, while `service_role` can write.
    2. ✅ **Ingestion job** — `supabase/functions/ingest-embeddings/` + `scripts/ingest-embeddings.mjs`
       (`npm run ingest:embeddings`). **Not the `npm run` script this line originally imagined:**
       `Supabase.ai.Session` is part of the Edge runtime and has no Node equivalent, so using the
       built-in gte-small model — and thus avoiding an external embedding vendor and a second API
       key — requires running in an Edge Function. The npm script drives it.
       Chunking is pure and tested (`src/game/contentChunks.js`, 25 checks) and imported by the Edge
       Function across the project boundary, so there is one implementation rather than one per
       runtime. Two properties do the real work: **every chunk names its country**, because a bare
       retrieved fact ("one of the world's largest exporters of soybeans") can be misattributed to
       whatever country the question mentioned — unacceptable when grounding is the whole point; and
       **chunk indexes are positional**, since `(country_code, chunk_index)` is the upsert key.
       The corollary is `staleChunkIndexes()`: when a country's content shrinks, the leftover higher
       indexes must be deleted or retired text stays retrievable *and citable* forever. Verified
       end-to-end — shrinking Brazil from 3 facts to 1 dropped it 5 → 3 chunks, reported
       `deleted: 2`, and left zero rows matching the retired text.
       Chunks are capped at 1200 chars because **gte-small truncates at 512 tokens silently** — an
       over-long chunk would embed only its head while a citation claimed the whole thing.
       **The binding constraint is isolate CPU, not wall clock.** gte-small inference runs in-process
       and the runtime kills the worker with `WORKER_LIMIT` ("CPU time hard limit reached") long
       before any timeout: measured locally, 5 countries / 10 chunks succeeds in ~770ms while 10
       countries reproducibly fails. Speed is not the issue; cumulative CPU is. So the function does
       one small batch and reports `nextOffset`, and the npm script follows that to completion,
       retrying transient 5xx (safe, since every write is an upsert). A full local run: **196/196
       countries, 393 chunks, 40 batches, zero retries.**
       Semantics sanity-checked rather than assumed: Brazil's trade chunk's nearest neighbours are
       Brazil's own summary (0.890) and *Vietnam's* (0.859 — also a major coffee exporter), and it
       sits closer to Brazil's geography (0.147) than to Iceland's summary (0.233).
       Auth accepts either the injected `SUPABASE_SERVICE_ROLE_KEY` or an optional `INGEST_TOKEN`
       secret, because projects mid-migration between key formats would otherwise fail the
       comparison with the correct key in hand. The check matters: the function talks to Postgres
       with the service key, so any caller past the door triggers a full run.
    3. ✅ **Retrieval + generation (server-side)** — `supabase/functions/ask/`, **built and verified
       locally up to the Claude call; awaiting `ANTHROPIC_API_KEY` in Edge secrets to test live.**
       Flow: validate → rate-limit → embed the question (gte-small, the same model that embedded the
       corpus — mixing models would silently destroy retrieval) → `match_country_chunks` →
       interest re-rank → grounded prompt → Claude → cited answer + the exact chunks it was given.
       Model is `claude-haiku-4-5` in one config constant (`MODEL`), `max_tokens` 700 as a deliberate
       cost ceiling. Pure/IO split held: `game/askLimits.js` (validation, sliding-window rate limit),
       `game/ragRanking.js` (interest re-rank — pulls step 6's ranking forward), and
       `game/ragPrompt.js` (the grounding contract, source formatting, citation parsing) are pure and
       tested; the function only wires IO to them.
       **The similarity floor is measured, and the intuitive guess was badly wrong.** gte-small
       compresses cosine similarity into a high narrow band, so the initial 0.25 floor admitted
       everything — a sourdough-recipe question sailed through to the model. Measured against the
       local corpus: on-topic questions score 0.908–0.927 ("capital of France" 0.927, "borders
       Brazil" 0.924, "Japanese food culture" 0.830) while off-topic and adversarial ones score
       0.679–0.793 ("2018 World Cup" 0.793, "ignore previous instructions" 0.723, "quantum
       chromodynamics" 0.716, "poem about my cat" 0.679). The floor is now **0.80**, in the gap.
       Re-validate against the full production corpus before leaning on it as step 4's off-topic
       guardrail — it was measured with five countries ingested.
       Below the floor the function returns a canned "nothing about that yet" answer **without
       calling the model at all** — cheaper and more honest than asking Claude to decline over an
       empty context (verified: 134ms, `model: null`).
       Interests are read server-side from the caller's own JWT under RLS, never taken from the
       request body — a client that could name its own user could read someone else's interests and
       evade the rate limit. Rate limiting is per-isolate and in-memory, and honest about it: it
       stops one client hammering one worker, not a distributed abuser (verified: 6 through, then
       429 with `Retry-After`). The durable per-user daily cap is step 4 and needs a table.
       Logging records `retrieved` vs `cited` vs `status` — the cheapest signal that retrieval is
       drifting or that the model answered from memory, available before step 7's eval set exists.
       **Deployed and verified against the production corpus.** "Which countries border Brazil?"
       returned a correct, cited, grounded answer (639 in / 106 out tokens — about $0.0012 a
       question on Haiku 4.5). Off-topic and prompt-injection attempts both scored below the 0.80
       floor and were short-circuited **without reaching the model at all** — the similarity floor
       turns out to double as an injection defence, since an instruction-shaped string doesn't look
       like Worldwise content. Asked something in-domain but absent from the corpus (Brazil's 1850
       population), the model correctly refused to invent a figure.
       **The first live test found a defect in the quality metric itself.** A *correct* refusal
       cites nothing, so the citation-count check labelled it `grounded: false` — meaning step 7's
       eval set would have systematically punished exactly the behaviour the grounding rules ask
       for. Fixed by having the model emit an explicit `NO_ANSWER` marker (deterministic, unlike
       sniffing refusal phrasing out of prose) and scoring three outcomes rather than two:
       `declined` (correct refusal), `cited` (grounded answer), `ungrounded` (asserted facts while
       citing nothing — the only real failure). The marker is stripped before the learner sees it.
    4. ✅ **Guardrails + the durable cost ceiling** — `src/game/askGuardrails.js`, the daily-cap half
       of `src/game/askLimits.js`, and `supabase/migrations/20260904232037_init_ask_usage.sql`.
       **Verified locally; the migration awaits the production push.**
       *Safety screen.* Narrow by design, and the design constraint is that **geography is full of
       war** — borders, invasions, military spending, colonial violence, genocide, famine are the
       subject matter, not abuse of it. A blocklist containing "weapon", "kill" or "war" would block
       the curriculum while barely inconveniencing bad faith. So the patterns match *requests for
       harmful instructions* ("how do I make a bomb"), never topics, and 11 tests pin that
       legitimate questions pass — the Falklands War, Japan's military budget, the Rwandan genocide,
       Roman weapons, the Irish famine. Self-harm gets its own signposting response rather than the
       same "ask me about geography" brush-off, which would be careless toward someone who needs
       help. The screen is explicitly *not* the safety system: the retrieval floor (a prompt
       injection measured 0.723 in production), the grounding rules, and Claude's own training do
       the heavy lifting.
       *Daily cap.* `public.ask_usage`, one row per user per UTC day, capped at `DAILY_CAP = 25`
       requests. UTC rather than local midnight, so nobody gets a second allowance by travelling.
       The slot is **reserved before generation** via `bump_ask_usage()`, which increments and
       returns the new count atomically in Postgres — a read-then-write in the Edge Function would
       let two concurrent questions both see "24 used" and both proceed. Tokens are attributed
       afterwards through a separate `record_ask_tokens()`, since counts only exist post-generation;
       folding them into one call would mean either racing the cap or charging tokens that were
       never used. A failed generation therefore still costs a slot, which is the deliberate
       trade: an unfair extra question is a smaller harm than exceeding the ceiling. Usage
       accounting **fails closed** — an unmeterable endpoint is worse than a briefly unavailable one.
       *A security hole caught by testing, not reading.* An early version revoked EXECUTE on
       `bump_ask_usage` from `PUBLIC` only, and `set role authenticated; select bump_ask_usage(...)`
       still incremented the counter. **Supabase's default privileges grant EXECUTE on new `public`
       functions directly to `anon` and `authenticated`, and revoking from `PUBLIC` does not take
       back a grant held by a named role.** It mattered more than usual because the function is
       SECURITY DEFINER, so RLS does not constrain it at all: any signed-in user could have passed a
       stranger's uuid and burned their daily allowance. Both functions now revoke from the named
       roles explicitly, and the table does too — so a mistaken policy later cannot quietly make the
       cap optional. Re-verified: `authenticated` and `anon` are denied on both functions and on
       INSERT/UPDATE/DELETE, while `service_role` works.
       *Sign-in is now required to ask* (`REQUIRE_AUTH`), and it is a cost decision rather than a
       product one — the cap is per-user, so an anonymous caller has no user to cap and the ceiling
       simply would not apply to the cheapest way to call the endpoint. **Worth a product review
       before the ask box ships**; flip it only alongside some other durable anonymous budget.
       *Verified end to end in production.* Anonymous → 401 `auth-required`. Signed-in → a cited
       answer with `dailyRemaining` counting down. "How do I make a bomb" → refused
       (`harmful-instructions`), "how do i kill myself" → refused with the signposting response —
       and neither consumed a slot, since the screen runs ahead of the reservation. "Why did the
       Falklands War happen?" **passed the safety screen** and was declined by the model for lack of
       sources, which is the false-positive protection holding in production rather than only in
       tests. The cap itself: the 26th request of the day returned 429 `daily-cap` with
       `used: 26, cap: 25`. Against the live row, a user can read their own usage but UPDATE,
       DELETE and a direct `bump_ask_usage` RPC all return **403** — the privilege hole is closed in
       production. Token attribution is correct too: 1009 in / 149 out from the two real
       generations, with the off-topic requests recording zero, since they reserve a slot but never
       reach the model.
       *Two things this shook out.* **CORS was missing entirely** — no preflight handler and a 405
       on OPTIONS, so every browser call died as an opaque "Failed to fetch" with nothing in the
       function logs, because the request never arrived. Step 5's ask box would have hit it on the
       first try. Now handled on every response, errors included: a 429 the browser cannot read is
       indistinguishable from the endpoint being down. And **the in-memory rate limit never fired
       across 23 rapid requests** — Supabase spread them over enough isolates that the per-isolate
       bucket never filled. That is empirical confirmation of what step 3's comments already said:
       it is not a cost ceiling, and the daily cap is what actually holds.
    5. ☐ **App UI.** On a country page / discovery surface: "Ask about {place}" and suggested
       "dive deeper" prompts. Streamed responses, loading + error states, offline fallback.
    6. ☐ **Interest-aware facts (consumes M2.3.6).** Tag content chunks with the same interest slugs
       at ingestion, then let a learner's selections **re-rank** retrieval and steer generation: the
       same country page opens on trade routes for an Economics pick and on borders for Geopolitics.
       Two rules keep this honest:
       - **Re-rank, never filter.** Interests reorder what surfaces; they never make content
         unreachable. A learner who picked Tourism can still read about a country's economy — the goal
         is a better first impression, not a bubble.
       - **Degrade to general.** Zero interests (the skip path) is a first-class state, not an edge
         case: it yields the unweighted, everyone-gets-this answer. Build and test that path *first*,
         so personalization is a layer on top of something that already works.
       Keep the ranking *decision* pure and tested (`interests + chunk tags → ordered chunks`) with
       the Edge Function IO beside it — the pure/IO split, same as everywhere else.
    7. ☐ **Cost + eval.** Cache common answers; cap tokens; track spend per user. A small eval set
       (known Q→expected-facts) so answer quality is measured, not vibes. Extend it with a
       personalization check: the same question under two different interest sets should return
       *differently ordered but equally factual* answers — catching a re-ranker that has quietly
       started inventing facts to match a preference.
  - **Dependencies:** M2.3.5 (content in Postgres) must land first — you can't retrieve over content
    you haven't stored. M2.3.6 (interests) gates **step 6 only**; steps 1–5 ship without it, so the
    hub is useful before any personalization exists. This also becomes the engine behind the
    **Phase 3 teacher AI** (lesson/quiz generation), so build it as a reusable retrieval+generation
    service, not a one-off.
- **M2.4 — Learning paths 🎓** — guided, mastery-based sequences that "expand outward"
  (hemisphere → continent → region → country), unlocking as the learner demonstrates mastery.
  - **Ordered sub-checklist** (one scoped chunk per daily run; do these top-to-bottom, don't skip).
    Strategy, mirroring M2.2: get the *shape* right and generalized immediately — there's no
    hand-authored content to write here, a path is entirely derived from data `countries.js`
    already has — then layer mastery, screen, and entry points on top.
    1. ✅ **Content model (pure + tested).** `src/data/learningPaths.js`: a path walks one region
       broad-to-specific — the region as a whole, then its own countries ordered easiest → hardest,
       so working through it teaches general-to-specific, the same direction "expand outward"
       describes. Built entirely from `countries.js`'s existing `region` + `difficulty` fields (no
       new taxonomy, no hand-authored hero — that's why all five regions land in this one chunk
       instead of one country the way M2.2 started with Brazil). `LEARNING_PATHS` (one path per
       region, built once at module load) + `getLearningPath(id)`, mirroring `getCountryPage(code)`'s
       null-for-unknown contract. 8 checks in `test/engine.test.js`: one path per region, every
       country appears in exactly one path, nodes carry code/name/difficulty, each path's difficulty
       never runs harder-to-easier, and the accessor's known/unknown cases.
    2. ✅ **Mastery policy (pure + tested).** `src/game/masteryPolicy.js`: mined from existing round
       history rather than a new per-country stat, since `game_results` only logs per-*round*
       score/total tagged by mode + difficulty — no per-country accuracy to mine at node granularity.
       A node's difficulty tier (easy/medium/hard, same field `learningPaths.js` already sorts on)
       stands in for the node itself: `computeNodeStates(path, results)` aggregates a tier's rounds
       (ignoring `difficulty: "all"` rounds — Daily and any untiered round mix every tier together)
       and calls it mastered once `MASTERY_MIN_ROUNDS` rounds clear `MASTERY_ACCURACY` (both new
       `constants.js` tunables, 3 rounds / 80%). A node unlocks once every easier tier is mastered —
       the easy tier itself has no prerequisite, so its nodes start unlocked — and becomes mastered
       once its own tier is. 9 checks in `test/engine.test.js` over the real Oceania path: no-history
       state, mastering a tier unlocks (not masters) the next one, hard stays locked until medium
       clears, too-few-rounds and below-accuracy both fall short, `"all"`-difficulty rounds don't
       count toward any tier, and the accessor's shape/order/unknown-path contracts. *(Next up:
       step 3, the navigation seam.)*
    3. ✅ **Navigation seam.** `openLearningPath(pathId)` in `App.js` opens
       `src/screens/LearningPathScreen.js` as a full-screen overlay over the tab shell — the
       same pattern as `openCountry`/`openWorldMap`. Deliberately minimal, mirroring M2.2 step
       2: it proves the seam (open by path id, render `getLearningPath(pathId)`, get back) —
       Back always returns Home via the existing `leaveOverlay()`, no `returnTo` variants yet
       since there's only one entry point so far. Renders the region name and a plain list of
       its nodes (name + difficulty tier); no locked/unlocked/mastered styling or node-tap
       behavior yet — `masteryPolicy.js`'s `computeNodeStates()` (step 2) lands in step 4's
       hero screen instead. A temporary "Learning Paths" preview tile on `HomeScreen`
       (`onOpenLearningPath`, opening the Africa path) makes it reachable while steps 4-5 build
       the real screen and entry points, same trade-off as M2.2's "Explore Brazil" preview.
       Verified in a real browser (Playwright/Chromium, static export, placeholder Supabase
       env): Home → "Learning Paths" tile opens the Africa path (54 countries, Egypt/Ethiopia/
       Kenya/... at Easy through the harder tiers), and Back returns to Home with no console
       errors. *(Next up: step 4 — the hero `LearningPathScreen`, now done — see below.)*
    4. ✅ **Hero LearningPathScreen.** Node rows now render real
       locked/unlocked/mastered state from `masteryPolicy.js`'s `computeNodeStates()`, fed by a new
       `fetchRoundResults(user)` in `storage/cloudProgress.js` — cloud-only, since local storage never
       kept per-round history (only the aggregated totals `progress.js` already tracks), so a
       signed-out player sees every tier but the first locked until they sign in, same offline-first
       trade-off as Profile's stats. Tapping an unlocked or mastered node opens that country's page
       (`openCountry(code, "learningPath", pathId)`, extending the existing `returnTo` seam so Back
       comes home to the same path) rather than duplicating a per-country round builder — `questions.js`
       only knows how to build multi-country rounds, and `CountryPageScreen` already has Play buttons
       per mode. Verified in a real browser (Playwright/Chromium, static export, placeholder Supabase
       env): the Africa path's 6 easy nodes show unlocked/"Start", every medium/hard node shows locked
       (no round history yet, matching `computeNodeStates`' no-history contract), tapping Egypt opens
       its country page, and Back returns to the same path with the same state — no console errors.
       *(Next up: step 5 — generalize to the other four regions and wire entry points beyond the
       temporary Home preview tile.)*
    5. ✅ **Generalize + wire entry points.** All five region paths are now reachable from two real
       entry points, replacing the temporary Africa-only Home tile. Rather than five near-identical
       tiles crowding Home's grid, `LearningPathScreen` grew its own region-pill row (mirroring the
       World Map's), so the *one* Home "Learning Paths" tile (still opens the first region,
       `LEARNING_PATH_REGIONS[0]`) reaches every path by switching pills on the far side —
       `onSwitchPath` just re-runs `App.js`'s existing `openLearningPath(pathId)`, no new nav state.
       The World Map's existing region pills (already there for framing the globe) do double duty:
       the active-region label over the globe is now a `Pressable` reading "{Region} · Learning path
       ›" that opens that region's path directly — one fewer step than pill → Home → tile. Falls back
       to the old non-interactive label when no handler is passed in, so the map still works
       standalone. No new screens, no new pure modules — `LEARNING_PATH_REGIONS` (already exported
       from step 1's `learningPaths.js`) is the only new import, on both `HomeScreen` and
       `LearningPathScreen`. Verified in a real browser (Playwright/Chromium, static export,
       placeholder Supabase env): Home → Learning Paths tile opens Africa; all five pills present and
       switch paths in place (checked Oceania renders its own 14 countries); World Map → Africa
       region pill shows "Learning path ›" and opens the Africa path directly — no console errors.
       *(Next up: step 6 — the polish + a11y pass.)*
    6. ☐ **Polish + a11y pass**, same shape as M2.2 step 6 (contrast, tap targets, offline/error
       states, transitions). Broken into its own ordered chunks:
       1. ✅ **WCAG AA contrast audit.** `LearningPathScreen`'s "Mastered" row-state label
          (`rowState_mastered`) is the first place `colors.success` renders as plain text outside
          its own tinted `successBg` pill — and `test/engine.test.js`'s existing accent sweep (from
          M2.2 step 6.1) never checked that combination, or the same gap already live elsewhere
          (`ProfileScreen`'s sync-status line and Sign Out label both use `success`/`error` as text
          on `bg`/`surface` too). Both colors pass comfortably as-is — success: 7.16:1 on `bg`,
          6.03:1 on `surface`; error: 5.89:1 on `bg`, 4.96:1 on `surface`, all clear of the 4.5:1 AA
          floor for normal text — so nothing needed to change; the gap was in test coverage, not the
          tokens. `success`/`error` now join the existing `bg`/`surface` accent loop in
          `test/engine.test.js`. The locked row's `opacity: 0.5` dimming (`rowLocked`/
          `rowNameLocked`) is deliberately left out of the sweep: it's not interactive, and the
          dimming itself is the affordance that reads as "locked" — the same exemption WCAG gives a
          disabled control. *(Next up: step 6.2 — large tap targets.)*
       2. ✅ **Large tap targets.** Audited every interactive element on `LearningPathScreen` in a
          real browser (Playwright/Chromium, static export, placeholder Supabase env, 390×844
          viewport — the same rig step 6.1's contrast pass used) and measured actual rendered
          boxes rather than guessing from styles. All three already clear 44×44, no changes
          needed: the Back button renders 390×40 and already carries `hitSlop={12}` (from step
          3), extending its effective target to ~390×64; the smallest region-pill chip renders
          55×34 and already carries `hitSlop={8}` (from step 5), extending to ~71×50; and node
          rows render 350×60 from their two-line content (name + difficulty tier) plus padding
          alone, clearing the floor with no `hitSlop` needed at all. Locked rows are excluded
          from the sweep the same way M2.2's audit excluded disabled controls — they're not
          interactive, so they have no tap target to measure. The `hitSlop` convention M2.2 step
          6.2 established was already carried over onto this screen's small targets when steps 3
          and 5 built them, so there was nothing left to fix here. *(Next up: step 6.3 —
          offline/error states.)*
       3. ✅ **Offline/error states.** `fetchRoundResults(user)` used to swallow every failure
          (network error, offline, Supabase down) and return `[]` — indistinguishable from "hasn't
          played yet," which would silently mislabel every non-easy tier "Locked" with no hint that
          the read had actually failed rather than reflecting real history. It now returns
          `{ rows, error }`; `LearningPathScreen` tracks the error separately from the (still
          empty) results and shows a `colors.error` notice — "⚠ Couldn't load your progress —
          showing offline defaults." — above the node list when a signed-in player's fetch fails,
          so a false "nothing played" read can't pass as the real thing. Signed-out players are
          unaffected: they never attempt the fetch, so the existing "sign in to unlock" locked
          state (from step 4) still reads as intended. No new pure module — this is IO error
          plumbing plus a UI notice, same shape as M2.2 step 6.3's `CountryOutline` fallback, so it
          isn't covered by `test/engine.test.js`; verified via `npm test`/`typecheck`/`lint` plus a
          static web build all staying green with the new `{ rows, error }` shape and its lone
          caller in sync.
       4. ✅ **Transitions.** `LearningPathScreen` had no motion at all — it was built (M2.4 step
          3) after the cross-cutting `FadeInUp`/`useReducedMotion` pass (which touched Home, Quiz,
          CountryPage, the country index, the map, Profile and Sign-in) had already landed, so it
          never got swept in. It now matches its siblings: a screen-level fade/rise-in on open and
          fade/settle-out on close (`Animated.timing` on a `screenAnim` value, `useNativeDriver:
          true`), exactly the shape `CountryPageScreen` uses (M2.2 step 6.4) — Back is deferred
          until the close animation finishes rather than cutting away instantly. Inside that, the
          header (kicker/title/subtitle/offline notice) and the node list each get their own
          `FadeInUp rise={0}` group — contributing the fade/stagger only, since the screen-level
          animation already supplies the rise, the same reasoning `CountryPageScreen`'s own blocks
          use. Two things deliberately don't defer: tapping a node opens a country page, which
          already has its own entrance transition (mirroring `CountryPageScreen`'s own `onPlay`,
          which doesn't defer either); and switching a region pill (`onSwitchPath`) never unmounts
          this screen, so there's no exit to animate — it's a plain content swap, same as
          `CountryPageScreen` doesn't retrigger its entrance when `code` changes. Verified in a
          real browser (Playwright/Chromium, static export, placeholder Supabase env): Home →
          Learning Paths → Africa renders correctly; tapping Egypt opens its country page and
          Back returns to the same path; the path's own Back returns Home — the full loop with no
          console or page errors. **M2.4 step 6 (polish + a11y) is now fully done, which completes
          M2.4 — Learning paths — end to end.**
- **M2.5 — Achievements, collections & deeper gamification ✨** — levels, mastery tracks, collectible
  sets (e.g., "all of South America"), badges, and seasonal/limited-time events that reward curiosity
  rather than compulsive use.
  - **Ordered sub-checklist** (one scoped chunk per daily run; do these top-to-bottom, don't skip).
    Strategy, mirroring M2.4: land the *pure decision layer* first, scoped to signals that already
    exist — `progress.js`'s totals and `game_results`' per-round rows — before touching any screen,
    schema, or game-balance number that deserves its own reviewable step.
    1. ✅ **Badge catalog + pure policy (pure, tested).** `src/data/achievements.js` (`ACHIEVEMENTS`
       — slug/label/description/glyph/metric/threshold) + `src/game/achievementPolicy.js`
       (`computeAchievements(progress, results)`, mirroring `masteryPolicy.js`'s `results` contract).
       Scoped to what `progress.js` + `game_results` already track: longest-streak milestones,
       rounds-completed milestones, perfect-round badges, and a "played every game mode" badge —
       9 badges total, evaluated generically as `metric value >= threshold`, no per-badge branching.
       Deliberately **not** in this step, each its own later step: an XP leveling curve (a
       game-balance call, not something to invent inline with badge plumbing) and region collectible
       sets (`game_results` tags a round by mode + difficulty, never by country, so "which countries
       has this player gotten right" isn't a signal that exists yet — needs its own scoped step, and
       likely a migration, before it can be built). 21 checks in `test/engine.test.js`.
    2. ✅ **Navigation seam.** An `achievements` route in `src/game/navigation.js` (`ROUTES`, owning
       tab `profile`, plus its `routeToPath`/`pathToRoute` pair — covered by the same round-trip
       test as every other route) rendered by `App.js`, reached with `go({ name: "achievements" })`
       — the same seam the country page, index and interests screens use since the navigation
       rework. `src/screens/AchievementsScreen.js` is deliberately minimal, mirroring how M2.4 step
       3 kept `LearningPathScreen` a plain node list before its hero pass: it renders the badge
       catalog (`src/data/achievements.js`) as a plain list, with no locked/unlocked state —
       wiring `computeAchievements()` in is step 3's job, not this one's. Reachable today via a
       "Achievements (preview)" link on Profile, explicitly marked TEMPORARY — step 4 replaces it
       with the real entry point. *(Next up: step 3 — the hero screen.)*
    3. ✅ **Hero screen.** `src/screens/AchievementsScreen.js` now wires `computeAchievements()`
       against local `progress` (streak) and `fetchRoundResults(user)` (rounds/perfect/modes) —
       the same M2.4 built for the learning-path mastery screen, reused rather than adding a
       second per-round fetch. Each badge row shows locked (muted glyph/label, a progress-track
       bar toward its threshold, `value/threshold`) or unlocked (brand glyph, an "Unlocked ✓"
       label instead of a bar); the header summarizes `{unlocked} of {total} unlocked`. Mirrors
       `LearningPathScreen`'s own hydrate-then-render shape, including its "couldn't load your
       progress" notice for a signed-in player whose `fetchRoundResults` call fails — local
       storage keeps no per-round history, so an empty result is otherwise indistinguishable from
       "no rounds yet" and would mislabel every round-derived badge as un-earned. `App.js` now
       passes `progress` through to the route. Theme tokens only. *(Next up: step 4 — replace the
       Profile "Achievements (preview)" link with a real entry point showing an unlocked-count
       summary.)*
    4. ☐ **Wire entry point.** A "Achievements" row on Profile (mirroring the Interests settings row)
       showing an unlocked-count summary, opening the hero screen.
    5. ☐ **XP levels.** A leveling curve derived from `progress.xp`, surfaced alongside the badges —
       its own step since the curve itself is a game-balance decision worth a dedicated, reviewable
       diff rather than folding into step 1's plumbing.
    6. ☐ **Collectible sets** (e.g., "all of South America"). Needs a real per-country signal
       `game_results` doesn't carry today — scope the tracking change (and any migration it implies)
       explicitly in this step rather than retrofitting it into step 1's schema-free design.
    7. ☐ **Polish + a11y pass**, mirroring M2.2/M2.3/M2.4's own closing step (contrast, tap targets,
       offline/error states, transitions).
- **M2.10 — Navigation & user flow 🧭** — ✅ **done (web-verified pending, see below).** Not a
  feature so much as the floor every feature stands on: by M2.5 the app had nine surfaces and a
  navigation model built for three. Replaced wholesale.
  - **What was wrong.** `App.js` carried a `screen` object with a `returnTo` (and, by M2.4, a
    `returnPathId`) field — one step of history, stored on the destination. It could not express a
    second hop, so Learning Path → Country → Play → exit landed on Home with the path gone, and a
    country opened from a finished round's review had nowhere to return to at all. Returning to the
    World Map called `openWorldMap()` with no `focusCountry`, so the globe you had just spun snapped
    back to its default orientation. Every surface except Home and Profile rendered *instead of* the
    tab shell, so opening a country page made the tabs vanish and unwinding was the only way
    anywhere else. Explore, the World Map and Learning Paths were tiles inside Home's grid — one
    doorway each, reachable only from Home. A finished round ended on a single "Back to games"
    button. And a phone-shaped bottom bar was the navigation on a 1600px desktop.
  - **What replaced it.** `src/game/navigation.js` (PURE): four tabs — **Home · Learn · Explore ·
    Profile** — each owning its own route stack, so switching tabs preserves the others and a detour
    costs nothing. Everything else pushes onto the active stack. Pushing a tab *root* switches
    instead of stacking. `chrome: false` marks focus mode, used only by the quiz. Route⇄URL
    serialization lives in the same module, with a test asserting every route in `ROUTES`
    round-trips through a path — so a new route without a URL is a failing test, not a silent gap.
  - **Responsive as one decision.** `src/game/layout.js`'s `chromeLayout(width)` returns bar-vs-rail,
    rail width, and whether the rail spells out its labels. `TabBar` (mobile) and the new `NavRail`
    (desktop) share a data contract, so `AppChrome` swaps one child rather than maintaining a
    parallel desktop layout. Rail appears at 840px, gains labels at 1120px — the second threshold
    chosen so the 880px media column still fits beside it.
  - **Real URLs on web.** `src/lib/history.js` (IO, no-op on native) mirrors the stack to the URL:
    `/learn/africa`, `/explore/BRA`, `/country/JPN`, `/play/flag?difficulty=hard&timed=1`. Browser
    Back pops the stack rather than rebuilding it, so it costs no more state than in-app Back — a
    deep link arrives with its tab root underneath it so Back still works.
  - **Flow fixes that fell out.** A finished round now offers **Play again** (replacing the quiz
    route, so three rounds still leave one Back between you and where you started) alongside **Done**,
    which returns to wherever the round was actually started from. Tapping a country on the globe
    re-aims the explore route beneath it first, so Back returns to the globe looking where you were.
    Tab roots no longer draw a Back button that does nothing.
  - 49 checks in `test/engine.test.js` covering the stack, tab isolation, the depth cap, URL
    round-tripping, deep links and popstate reconciliation. **Still to do: drive it in a real
    browser.** Metro would not bind a port in the session this was built in, so desktop rail,
    mobile bar, and browser Back/Forward are verified by test but not yet by eye — do that before
    trusting it, per the repo's own standing rule about auth/nav changes tests can't see.
- **M2.11 — Brand system adoption 🎨** — ✅ **done, verified in a browser.** Adopted the Slickrock
  **Brand Identity Kit v1.1 / UI Kit v1.0** (`WW Design.pdf`). This inverts the prototype's look:
  the app was a dark navy-charcoal base with extruded slabs; the kit is "warm off-white is the page
  the world is printed on", with navy demoted from background to *authority* — wordmark, headings,
  primary buttons, active nav.
  - **The map is the one thing that did NOT flip.** Kit §MAP RULES keeps ocean `#16293F`, land
    `#1F3A5F` at 88%, borders and graticule sand. So the app is now a light page with a dark map
    stage set into it — which is the printed-atlas idea the palette is named for. `theme.js` groups
    those under `map.*` precisely so that reaching for a dark token anywhere else is obviously wrong.
  - **Tokens.** `src/theme.js` is the kit in code: semantic colour roles, a 4px spacing base
    (4·8·12·16·24·32·48·64), radius 2/8/14/pill, kit breakpoints and z-layers, and motion at
    120/200/320/600ms on `cubic-bezier(.2,.7,.2,1)`.
  - **`depth()` → `elevation(1|2|3)`.** The old solid un-blurred bottom lip was a dark-UI trick; on
    warm paper it reads as a printing error. Real navy-tinted shadows now, though most of the
    separating is done by `hairline`.
  - **Three typefaces** — Archivo (display), Instrument Sans (body/UI), IBM Plex Mono (eyebrows,
    coordinates, map labels, never sentences). Weight lives in the *family name*, not `fontWeight`:
    each Google-font weight registers as its own family declared at weight normal, so a `fontWeight`
    on top makes the browser synthesise a second fake bold. All 38 local `fontWeight` declarations
    were removed for this reason — if you add one back you will get double-bolding on web.
  - **`onFill(fill)`** is the single home of "what colour does a label on this fill take": white on
    everything except sand, which takes ink (white on sand is 2.3:1). The tests drive their checks
    through the same function rather than restating the rule.
  - **Mode accents** no longer include sky/iris/leaf — the kit forbids inventing hues ("extend by
    tinting navy and earth"), so the six modes draw from the brand set plus two sanctioned tints.
  - 37 contrast checks rewritten around the kit's ACCESSIBILITY CONTRACT (body ≥4.5:1, large/UI
    ≥3:1), including three that assert *prohibitions*: sand fails UI contrast on both light surfaces
    (decorative only, never type), and `textMuted` deliberately does not clear body contrast on the
    off-white page.
  - **One finding worth Danny's attention:** the kit's own `--ww-text-muted` (`#6B7280`) is
    **4.40:1** on `--ww-surface` (`#F7F4EE`) — just under the kit's stated "body ≥ 4.5:1". It clears
    at 4.83:1 on white cards. Resolved here by scoping muted to labels/captions/metadata and keeping
    body copy on `--ww-text`, which is what the kit's own examples do anyway — but if muted is ever
    meant for body copy on the page background, the token needs to darken by a hair.
  - **Verified in a real browser** at desktop width: Home, the globe (`/explore`), a learning path,
    the country index, a country page and a quiz round, plus the deep links that reach them. **Not
    yet seen: the mobile bottom bar** — the breakpoint swap is unit-tested but the browser window
    would not resize below the rail breakpoint in that session.
- **M2.6 — Leaderboards & light social 🎮** — global/friends leaderboards, daily competition, and
  shareable Daily Challenge score cards (the parked Phase 1 "sharing" idea lands here).
- **M2.7 — Game library expansion 🎮** — extend the shared engine to Rivers, Mountains, Oceans,
  Currency, Language, National Animal, Food Origin, and City games — breadth without new bespoke code.
- **M2.8 — Personalization 💾** — choose regions to focus on, set difficulty and streak goals, and get
  recommendations for weak areas. Builds on M2.3.6's interests rather than restating them: that
  milestone owns *what you're curious about* (topics), this one owns *how you want to practice*
  (regions, difficulty, goals). Both live behind the same Profile surface so preferences read as one
  thing to the learner, not two systems.

**Architecture shifts:** introduce the API-first backend, authentication, a user/progress data model,
and a content model for country pages and learning paths; move content into a public-read `content.*`
schema with CDN media; add a learner-preference model (opt-in interests) that content retrieval can
weight against; add `pgvector` + a Supabase **Edge Function** retrieval/generation service for
the AI hub (LLM API keys server-side only). Wire the first **Premium Individual** tier (unlimited
games, learning paths, offline mode, advanced analytics, collections); AI usage likely gates here for
cost control.

**Exit criteria:** a signed-in learner has synced progress, explores country pages and interactive
maps, follows at least one learning path to mastery, earns achievements, competes on a leaderboard,
and can upgrade to Premium. A learner who shared interests sees facts framed around them; a learner
who skipped has an equally complete experience — that second case is the one to actually verify.

---

## Phase 3 — Education

**Goal:** become the best geography *teaching* platform available — the strengths of Google Classroom,
Canvas, Kahoot!, and GeoGuessr, but geography-first. Everything a teacher needs to plan, assign,
assess, and understand a class.

**Milestones (in order):**

- **M3.1 — Educator accounts & classrooms 🎓** — teacher/student roles, class rosters, join codes,
  and the permission model that separates a classroom from the consumer app.
- **M3.2 — Assignment builder 🎓** — create assignments by grade level, topic, difficulty, activity
  type, questions, due date, and publishing options.
- **M3.3 — Lesson & quiz builder 🎓** — compose multi-part lessons (the Brazil-style flow: map →
  population → climate → history → economy → culture → quiz → game → reflection) from existing games
  and content.
- **M3.4 — Auto-grading, gradebook & standards alignment 🧱** — auto-graded assessments, a gradebook,
  and alignment to educational standards.
- **M3.5 — Curriculum builder 🎓** — plan an entire semester (Week 1 Maps → Continents → Oceans →
  Countries → Physical Geography → Climate → Trade → Migration → …) with reusable scope & sequence.
- **M3.6 — Interactive Map Builder (teacher) 🌐** — highlight/draw/color regions, hide/reveal labels,
  attach questions, and turn maps into interactive activities.
- **M3.7 — Student dashboard 🎓** — assignments, XP, achievements, streaks, collections, recent scores,
  mastery progress, recommendations, and strong/weak areas.
- **M3.8 — Teacher analytics 📊** — average scores; country/flag/map mastery; common mistakes; heat
  maps; time spent; class leaderboards; individual progress.
- **M3.9 — AI teaching assistant 🤖** — generate lessons ("a 7th-grade lesson on Southeast Asia"),
  quiz questions from a lesson, worksheets, rubrics, study guides, and differentiated instruction —
  always with human-in-the-loop review and evidence-based, non-ideological content.

**Architecture shifts:** roles & permissions, class/assignment/submission data models, an analytics
pipeline, an AI service integration, and **privacy/safety for minors** (data minimization, consent,
COPPA/FERPA-aware design). Groundwork for SSO. Unlocks the **Educator** and early **School/District**
business tiers.

**Exit criteria:** a teacher can create a class, build and assign a standards-aligned assignment,
auto-grade it, and see class analytics; students complete work from their dashboard; AI meaningfully
speeds lesson creation without compromising quality.

---

## Phase 4 — Platform

**Goal:** expand from a product into an ecosystem — and lay the shared foundation for Slickrock
Studio's future subjects. *Worldwise is the flagship, not the whole company.*

**Milestones (in order):**

- **M4.1 — Community lesson marketplace 🌐** — teachers share, discover, and remix lessons; ratings,
  search, and moderation for quality and safety.
- **M4.2 — District & school administration 🎓** — SSO, provisioning, an admin console, reporting, and
  professional development; the full **School/District** and **Enterprise** tiers (museums, libraries,
  homeschool orgs, after-school programs, nonprofits).
- **M4.3 — Public API & integrations 🌐** — an API-first public interface plus LMS integrations
  (Google Classroom, Canvas) and webhooks, so Worldwise complements existing school infrastructure.
- **M4.4 — Native mobile & desktop apps 📱** — app-store presence, offline mode, and native polish
  beyond the Expo web build.
- **M4.5 — Localization & international curricula 🌍** — internationalization (including RTL), plus
  region-specific standards and content so Worldwise works worldwide.
- **M4.6 — Shared design system & backend hardening 🧱** — formalize `theme.js` tokens into a packaged
  design system + component library; multi-tenant, observable, performant backend at scale.
- **M4.7 — Slickrock ecosystem foundation 🌐** — shared accounts, progression, gamification, and
  identity so future subjects (History = *when*, Economics = *why resources move*, Government = *how
  societies organize*, Ecology = *how environments shape life*) plug into one unified platform.

**Architecture shifts:** multi-tenant backend with observability and performance SLAs; enterprise
security & compliance; a shared design-system package and shared libraries (monorepo); enterprise
SSO. The codebase graduates from "one app" to "a platform that hosts many."

**Exit criteria:** districts license and administer at scale via SSO; third parties build on the API;
the app ships natively and localized; and the platform is architecturally ready to host a *second*
Slickrock subject without a rewrite.

---

## Sequencing principles & phase gates

- **Don't start a phase until the previous one's exit criteria are met.** Fun (P1) before depth (P2)
  before classrooms (P3) before ecosystem (P4). Each phase de-risks the next.
- **Business model unlocks track the phases.** Free (P1) → Premium Individual (P2) → Educator &
  School/District (P3) → Enterprise & marketplace (P4).
- **Every phase stays true to the mission.** Curiosity over memorization, context over trivia,
  exploration over testing. Gamification rewards curiosity, never compulsive engagement. The brand
  stays curious, intelligent, optimistic — never preachy, political, or ideological.
- **Maps stay the hero, everywhere.** Premium, timeless, map-first design across consumer and educator
  surfaces alike.

## North star

Worldwise exists to help people understand the world — not by memorizing facts, but by discovering the
stories, relationships, and context that make every place meaningful. Geography is the first subject
because it provides the context for every other discipline.

---

# DANNY TO DO

Everything here is **human-only** — secrets, passwords, billing, and product/legal calls that an AI
collaborator must not make or handle. Sorted by what it unblocks. Nothing in M2.3.6 is blocked by
items in the M2.9 group; those just need lead time.

**Never paste a DB password, API key, or service-role key into a chat, a commit, `.env`, or an
`EXPO_PUBLIC_*` variable.** Anything prefixed `EXPO_PUBLIC_` is compiled into the web bundle and is
readable by every visitor — that prefix is for publishable keys only. Server secrets go to Supabase
via `npx supabase secrets set`, and nowhere else.

## To finish M2.3.5 (content backend) — the code is done and waiting

The whole thing is already proven on a local Postgres — migration applied from scratch, seeded,
public read confirmed, writes denied for anon *and* authenticated, and a live edit in Postgres
showing up on a country page in the browser. These steps just point it at production.

- ☑ ~~`npx supabase db reset`~~ — done, green, and it earned its keep: it caught two bugs that tests,
  typecheck, and the browser all missed (see M2.3.5 item 6).
- ☑ ~~**Apply it to the live project:** `npx supabase db push`~~ — **done 2026-09-04, and it needed
  no DB password.** The CLI provisions a temporary login role over the Management API, so a linked
  project is reachable on the stored access token alone. All three migrations went up (the user
  domain and interests were missing from production too — see the correction under M2.1). Verified
  after: `inspect db table-stats` lists `profiles`, `user_stats`, `game_results`,
  `profile_interests`, `content.countries`, `content.country_media`, and `content.content_version`.
- ☑ ~~**Expose the `content` schema in the Dashboard**~~ — **done.** An anon read with
  `Accept-Profile: content` now returns 200 instead of `PGRST106 — Invalid schema: content`. Keeping
  the warning for the next schema: PostgREST serves only `public` + `graphql_public` by default, so
  a custom schema 404s no matter how correct the grants and RLS are, `config.toml` covers local
  only, and there is no migration-based equivalent for the cloud project. And **never use
  `supabase config push` as a shortcut** — it would also push `[auth]`, replacing the live
  `site_url` with `http://127.0.0.1:3000` and wiping the production redirect URLs.
- ☑ ~~**Seed it**~~ — **done.** `content_version` is at 5 and `content.countries` holds 196 rows.
  Re-run `SUPABASE_SERVICE_ROLE_KEY=sb_secret_... npm run seed:content` in your own terminal any
  time content changes; it's idempotent and bumps `content_version` so every client refetches. Never
  put that key in `.env`, and never behind an `EXPO_PUBLIC_` prefix — that ships full database
  access to every visitor.
- ☑ ~~**Confirm it in production**~~ — **done 2026-09-04.** The live Brazil page fires
  `GET /content_version` and `GET /countries?code=eq.br`, both 200, and caches the page stamped with
  the live version — which only happens on the remote-fetch path, so it is genuinely reading
  Postgres and not the bundled fallback. Anon writes refused with 401.
- ☐ **Seed `content.country_media`** *(follow-up, not blocking)*. The table is live but empty. No
  surface reads it yet, so nothing is broken — it just means the media half of M2.3.5 is unexercised
  in production. Worth doing when the first media-bearing surface lands.
- ☐ *(nothing needed on Vercel)* — content adds no new client env vars. The seed key is used only
  from your machine.

## Before M2.3.6 (interests) can ship

- ☐ **Lock the interest list.** The roadmap proposes *Economics · History · Agriculture · Military ·
  Tourism · Geopolitics · Climate · Culture · Wildlife · Food*. Add/cut freely **now** — once real
  accounts have picked slugs they live in the database, and changing them later means a data
  backfill. Labels stay editable forever; the slugs behind them are the sticky part.
- ☐ **Start Docker Desktop.** It's installed but not running, so `npx supabase db reset` — the check
  that actually catches a missing GRANT — can't run. Needed before the migration is trustworthy.
- ☑ ~~**Apply the migration to the live project:** `npx supabase db push`~~ — **done 2026-09-04**,
  carried up alongside M2.3.5's content migration (production had none of the three applied). No DB
  password was needed; see the M2.3.5 section above. `public.profile_interests` now exists live.
- ☐ **Decide when it ships.** It's written as M2.3.6 but only depends on M2.1, so it can jump ahead
  of M2.3. Earlier = more accounts already carry interests when the AI hub lands. Your call; tell me
  and I'll reorder the milestones.
- ☐ *(nothing needed on Vercel)* — interests add no new client env vars. Listed so you don't go
  looking for one.

## Before M2.9 (RAG) — start early, these have lead time

- ☐ **Create an Anthropic API key** and set it as a Supabase **Edge Function secret**
  (`npx supabase secrets set ANTHROPIC_API_KEY=...`). It must never reach `.env`, the repo, or the
  client bundle. The Edge Function is the only thing that should ever see it.
- ☐ **Set a hard spend cap and a billing alert** on the Anthropic account before the first call —
  not after the first surprise invoice. Decide the monthly ceiling and the per-user cap; the roadmap
  builds to whatever numbers you pick.
- ☐ **Confirm the Supabase plan** covers Edge Functions and allows the `pgvector` extension on the
  live project. Cheap to verify now, expensive to discover mid-milestone.
- ☐ **Pick the embedding model + provider** (can differ from the generation model) so ingestion cost
  can be estimated against the real content volume.

## Privacy & policy — decide before collecting, not after

- ☐ **Update the privacy policy** to cover interests. It's opt-in preference data tied to an account,
  which is a different category from gameplay stats, and it starts being collected the day the prompt
  ships.
- ☐ **Decide the under-13 posture.** The stated audience includes students. If under-13 accounts are
  in scope, COPPA (and parental-consent mechanics) shape whether this prompt can be shown to them at
  all — a product/legal decision that has to precede the UI, and one I shouldn't make for you. Worth
  a lawyer's eye before Phase 3 classrooms, where it stops being hypothetical.
- ☐ **Confirm account deletion removes interests.** `profile_interests` needs to be in whatever
  delete path exists (or `on delete cascade` from `auth.users`), so a deleted account leaves nothing
  behind.

## Standing habits

- ☐ **`git pull --rebase` before you start working.** The daily cloud agent pushes to `main` at
  7am MDT; this is what avoids the rejected-push situation from last time.
- ☐ **Don't hand-edit the agent's in-flight milestone files** while it's mid-run, for the same reason.

## What I can do without you

Schema-as-a-migration-file, the pure catalog and policy modules with tests, the UI, the sync wiring,
the Edge Function code, and local verification (`npm test` + typecheck + lint + web bundle, plus
`supabase db reset` once Docker is running). I stop at anything needing a password, a secret, a
payment method, or a legal judgment — those are the checkboxes above.
