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
| **C** | 💾 Content | Per-country "context card" (why this place matters) shown after answers | **The thesis.** This is what makes it Worldwise, not Sporcle |
| **D** | 🧱 Navigation | Proper tab bar (Home · Play · Profile) + game-select screen | Prerequisite: the Profile tab is where sign-in will live |

**Next up:** Day C — per-country "context card" shown after each answer during play.

After Day D, Phase 1 is *functionally* complete and we move straight to **M2.1 — accounts &
cloud sync**. The backlog below gets picked up opportunistically, not as a gate.

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

- **M2.1 — Accounts & cloud sync 🧱** — auth provider, user model, and migration of Phase 1's local
  progress into a synced account. This is the foundation everything social/educational builds on.
- **M2.2 — Country pages 💾** — the core learning surface: a beautiful page per country answering
  "why should I care?" (map, key facts, a short story, climate/trade/culture hooks, related games).
  Expands the Phase 1 "context card" into a real hub.
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
