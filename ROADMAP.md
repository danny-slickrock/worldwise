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

**M2.1 — accounts & cloud sync is complete and verified in production** (migration, client, sync
adapter, and sign-in all shipped; see Phase 2 below). **M2.2 — country pages is underway:** the
content model, navigation seam, polished Brazil hero page, generalization to all 196 countries
(with a clean hero fallback for the 4 without a mapsicon outline), and two of three entry points —
a "Learn more about {country}" link on the in-play context card, and a searchable/filterable
country index reachable from Home — have landed. The third entry point, from the map, is blocked
on M2.3. The polish + a11y pass (step 6) is underway: the WCAG AA contrast audit, large tap
targets, and `CountryOutline` offline/image-load fallbacks are done; next up is transitions.
The backlog below gets picked up opportunistically, not as a gate.

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

- **M2.1 — Accounts & cloud sync 🧱** — ✅ **complete, verified in production.** Auth provider, user
  model, and migration of Phase 1's local progress into a synced account. The foundation everything
  social/educational builds on.
  - ✅ Postgres schema as code (`supabase/migrations/`): profiles, user_stats, game_results, RLS
    owner policies, signup trigger. Applied to the live project; isolation checked (one player
    cannot read or write another's rows).
  - ✅ Supabase client (`src/lib/supabase.js`) + sync adapter (`src/storage/cloudProgress.js`,
    `src/game/cloudSync.js`), keeping `progress.js` pure and offline-first.
  - ✅ Sign-in on the Profile tab: email magic-link + Google, wired to the sync layer.
  - ✅ Proven end-to-end in prod: a real sign-in syncs progress, the local→cloud merge runs once,
    and a finished round lands in `game_results`. Vercel carries the Supabase env vars.
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
       - ☐ **From the map** (blocked on M2.3 — interactive maps).
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
       4. ☐ **Transitions.** Bring the country-page overlay's open/close in line with the rest of
          the app's transition feel.
  - **Guardrails for this milestone:** honor the pure/IO split so the tsx tests keep running; any
    Supabase work stays migrations-as-files with RLS + explicit CRUD grants (never `db push`/`link`,
    never handle secrets — leave those as manual steps). Gate each commit on
    `npm test` + typecheck + lint + web bundle.
- **M2.3 — Interactive maps 🌐** — pan/zoom world and region maps; tap a place to explore it; the map
  as the primary way to navigate learning (maps stay the hero).
- **M2.4 — Learning paths 🎓** — guided, mastery-based sequences that "expand outward"
  (hemisphere → continent → region → country), unlocking as the learner demonstrates mastery.
- **M2.5 — Achievements, collections & deeper gamification ✨** — levels, mastery tracks, collectible
  sets (e.g., "all of South America"), badges, and seasonal/limited-time events that reward curiosity
  rather than compulsive use.
- **M2.6 — Leaderboards & light social 🎮** — global/friends leaderboards, daily competition, and
  shareable Daily Challenge score cards (the parked Phase 1 "sharing" idea lands here).
- **M2.7 — Game library expansion 🎮** — extend the shared engine to Rivers, Mountains, Oceans,
  Currency, Language, National Animal, Food Origin, and City games — breadth without new bespoke code.
- **M2.8 — Personalization 💾** — choose regions to focus on, set difficulty and streak goals, and get
  recommendations for weak areas.

**Architecture shifts:** introduce the API-first backend, authentication, a user/progress data model,
and a content model for country pages and learning paths; wire the first **Premium Individual** tier
(unlimited games, learning paths, offline mode, advanced analytics, collections).

**Exit criteria:** a signed-in learner has synced progress, explores country pages and interactive
maps, follows at least one learning path to mastery, earns achievements, competes on a leaderboard,
and can upgrade to Premium.

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
