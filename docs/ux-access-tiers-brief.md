# Worldwise — UX Brief: Access Tiers & Interest-Targeted Personalization

> Status: product brief for Phase 2 (personalization) → informs M2.5–M2.9 and the paywall work.
> Guiding rule: **never gate the fun.** Monetization is *additive* — it adds depth and
> personalization on top of games that are always free to play.

## The core idea

Worldwise has four levels of commitment, and each one is a natural, low-friction step up from the
last. A person can go from "just messing around" to "invested learner who supports a cause" without
ever hitting a wall — every upgrade *unlocks more*, it never *removes* anything they had.

The paid experience's superpower is **interest-targeted exploration**: the user tells us what they're
curious about (places + themes), and the app's fun facts, country pages, daily challenges, and AI
"dive deeper" answers all bend toward those interests. Geography becomes the doorway to *their*
obsessions — geopolitics, tourism, agriculture, trade, military history, whatever it is.

## The four tiers

| Tier | Price | Account? | What they get |
|------|-------|----------|---------------|
| **Guest (Vanilla)** | Free | No | Hop on and play every game instantly. Local progress only. |
| **Free account** | Free | Yes | Synced XP, streaks, achievements, leaderboards, basic recommendations. |
| **Premium** | $3/mo | Yes | Everything free, **plus interest-targeted personalization**, unlimited play, offline, advanced stats, AI "dive deeper." |
| **Premium + Give** | $5/mo | Yes | Same as Premium; the extra $2 supports a cause the user chooses. |

### 1. Guest — "just play"
Zero friction. Open the app, tap a game, play. No sign-up wall, no email gate. Progress (XP, streak,
best) is stored locally so a returning guest keeps their stuff on that device. Gentle, dismissible
nudges ("Create a free account to save your streak across devices") — never a blocker. **This is the
top of the funnel; protect its frictionlessness.**

### 2. Free account — "save my progress"
The upgrade reason is **permanence and identity**: progress follows the person across devices,
plus leaderboards, achievements, and light recommendations. Sign-in is email magic-link or Google
(already built). On first sign-in, local guest progress merges up (already built). Still 100% of the
games, just now *yours*.

### 3. Premium ($3/mo) — "make it about me"
The paid unlock is **personalization**, not a bigger pile of the same content. On upgrade, the user
picks their interests (see below), and the app starts targeting exploration and fun facts to them.
Also includes the "premium individual" perks from the business plan: unlimited games, offline mode,
advanced analytics, collections, and AI-assisted "dive deeper" on any place.

### 4. Premium + Give ($5/mo) — "learn and do good"
Same product as Premium, framed as a values-aligned choice: the extra $2/mo goes to a cause the user
selects from a curated list (e.g., global education, conservation, clean water, refugee support,
map/geography nonprofits). This expresses the brand — *curiosity, empathy, global awareness* — and
gives the higher price a warm reason to exist rather than feeling like an upsell. Show impact softly
("You've contributed $6 to Room to Read"), never preachy.

## The interest system (the vision)

Personalization runs on two axes the user selects and can edit anytime:

- **Places** — regions/continents, or specific countries they want to focus on.
- **Themes / lenses** — the *why they care* dimension: geopolitics, military history, tourism &
  travel, agriculture & food, trade / imports & exports, economics, culture & religion, climate &
  environment, cities & infrastructure, current events.

Together these form a **personalization profile**. It doesn't change *which games exist* — it changes
*what the world says back*:

- **Country pages & fun facts** rank and surface the hooks that match the user's lenses (a trade nerd
  sees Brazil's export story first; a tourism fan sees the landmarks and culture).
- **Daily Challenge & exploration** weight toward chosen places/themes while still stretching them.
- **The AI "dive deeper" (RAG)** uses interests to steer retrieval and framing — this is why the
  interest profile is metadata on the content, not just a UI toggle.
- **Recommendations** ("Because you're into geopolitics, explore the South China Sea").

Architecturally this extends what's already in the schema (`profiles.difficulty_pref`,
`focus_regions`) with a `focus_themes` set, and those tags become weights in M2.9 retrieval.

## The value ladder (upgrade moments)

Surface each step at the *natural* moment, never as a nag:

1. **Guest → Free:** after a good run or a lost streak — "Save this streak across your devices."
2. **Free → Premium:** when they linger on a country page or ask a question the AI could answer —
   "Want Worldwise tailored to what *you're* curious about?" Show a 1-tap interest preview.
3. **Premium → Give:** at checkout, present $3 and $5+Give side by side; make Give feel good, not
   guilt-y. Let them switch anytime.

## Key UX principles

- **Never paywall the core games.** Fun is the funnel; keep it wide open.
- **Personalization is a reveal, not a chore.** The interest picker should feel like choosing a
  superpower — visual, tactile, a few taps — not filling out a form.
- **Every tier adds, none subtracts.** Downgrading never deletes a user's data; it just pauses perks.
- **Values without preaching.** The donation tier and the "why it matters" ethos stay optimistic and
  evidence-based, never ideological.

## What to build (surfaces)

- **Interest picker / personalization onboarding** (premium) — editable later in settings.
- **Plans / paywall screen** — Free · Premium $3 · Premium+Give $5, with the cause selector.
- **Personalized Home / Explore feed** — country cards + fun facts ranked by the interest profile.
- **Account & subscription management** — plan, cause, interests, restore purchases.

## Implementation notes (decisions to make, not blockers)

- **Payments:** web can use Stripe directly; **mobile app stores require in-app purchase** (Apple/
  Google take 15–30%), so a cross-platform layer like RevenueCat is worth considering. This affects
  net revenue on the $3 tier — model it.
- **The donation split is legally non-trivial.** Passing $2/user directly to a charity implies you're
  collecting on their behalf (tax/receipting complications). Simpler, cleaner options: (a) you donate
  an equivalent share of *your* revenue to the chosen org (you're the donor, users direct it), or
  (b) use a donation platform / fiscal sponsor. Decide before launch; don't hand-roll charity payouts.
- **Interests + minors:** once classrooms/Phase 3 arrive, treat interest data with the same
  minimization discipline as everything else (COPPA/FERPA).

## Where this sits in the roadmap

Free accounts + sync are **done** (M2.1). The interest profile + paywall + targeting is the
**personalization milestone (M2.8)** and pairs with the content backend (M2.3.5) and AI hub (M2.9),
since interests are the weights those systems read. Build the interest picker and plans UI first
(they're pure front-end), wire targeting as the content/AI layers land.
