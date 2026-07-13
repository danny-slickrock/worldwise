# Phase 2 — Data Model (sketch)

> **Status:** planning note, not a spec. Nothing here ships in Phase 1.
> Build this only when Phase 1's exit criteria are met and M2.1 (accounts &
> cloud sync) begins. See [ROADMAP.md](../ROADMAP.md) Phase 2.

Phase 1 is client-only: local progress in AsyncStorage, content bundled or
loaded from CDNs. Phase 2 introduces the first backend. This note sketches the
schema so the transition is a migration, not a rewrite.

Target: **Supabase (Postgres + Auth + Row-Level Security)**. The schema is plain
Postgres, so it ports to any SQL host; RLS is the Supabase-specific bit that
earns its keep for per-user isolation (and later, per-classroom in Phase 3).

---

## Principle: two domains, kept apart

| Domain | What | Access | Where it can live |
|--------|------|--------|-------------------|
| **Content** | Countries, facts, stories, landmark media | Read-only for players, author-time writes | Bundled JSON / CDN **or** a public-read `content` schema |
| **User** | Accounts, progress, results, achievements | Per-user read/write, private by default | Postgres with RLS (required) |

The trigger for a database is **accounts**, not "more geographic data."
Content can stay static/bundled for a long time. Only move content into Postgres
when you want it queried *alongside* user data (e.g. "countries this user hasn't
mastered"). Until then, keep it as versioned JSON — cheaper and simpler.

---

## User domain (M2.1 — accounts & cloud sync)

Supabase Auth owns the `auth.users` table (email/social login, sessions). Our
tables hang off `auth.users.id`.

```sql
-- One row per player, keyed to the auth user. Public-facing identity + prefs.
create table profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  username     text unique,
  display_name text,
  avatar_url   text,
  -- personalization (M2.8): default difficulty, regions to focus on
  difficulty_pref text default 'all',
  focus_regions   text[] default '{}',
  settings     jsonb default '{}'::jsonb,   -- sound, haptics, etc.
  role         text not null default 'player',  -- seam for Phase 3 (teacher/student)
  created_at   timestamptz not null default now()
);

-- Denormalized running totals — the direct heir of the local progress object
-- { xp, streak, bestScore }. One row per user; updated as rounds finish.
create table user_stats (
  user_id        uuid primary key references profiles(id) on delete cascade,
  xp             integer not null default 0,   -- was progress.xp
  current_streak integer not null default 0,   -- was progress.streak
  longest_streak integer not null default 0,   -- new: worth tracking server-side
  best_score     integer not null default 0,   -- was progress.bestScore
  last_played_on date,                          -- enables calendar-aware streaks (Day 6)
  updated_at     timestamptz not null default now()
);

-- Append-only log of finished rounds. Aggregates above derive from this;
-- also the source for leaderboards (M2.6) and, later, teacher analytics (Phase 3).
create table game_results (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references profiles(id) on delete cascade,
  mode        text not null,     -- 'flag' | 'capital' | 'capitalReverse' | 'shape' | 'daily' | 'locator' ...
  difficulty  text not null default 'all',
  timed       boolean not null default false,
  score       integer not null,
  total       integer not null,
  xp_awarded  integer not null,
  daily_date  date,              -- set only for mode='daily' (one entry per user per day)
  played_at   timestamptz not null default now()
);
create index on game_results (user_id, played_at desc);
create unique index on game_results (user_id, daily_date) where mode = 'daily';
```

`user_stats` mirrors today's `src/game/progress.js` shape almost 1:1, which is
the point — `applyRoundResult()` becomes "insert a `game_results` row + bump
`user_stats`." Keep `progress.js` pure; add a sync adapter beside it rather than
rewriting it.

### Gamification (M2.5) and social (M2.6) — forward-looking

```sql
-- Catalog of earnable achievements + collectible sets (author-time content).
create table achievements (
  key text primary key, title text, description text, icon text, criteria jsonb
);
create table collections (
  key text primary key, title text, description text,
  member_codes text[]              -- e.g. all South America country codes
);

-- Per-user unlocks / collected items.
create table user_achievements (
  user_id uuid references profiles(id) on delete cascade,
  achievement_key text references achievements(key),
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement_key)
);
create table user_collected (
  user_id uuid references profiles(id) on delete cascade,
  country_code text,               -- fk to content.countries once content is in DB
  collected_at timestamptz not null default now(),
  primary key (user_id, country_code)
);
```

Leaderboards (M2.6) are **views over `game_results`**, not new tables — e.g. a
daily leaderboard is `select user_id, score from game_results where mode='daily'
and daily_date = current_date order by score desc`. Add materialized views only
if query volume demands it.

---

## Content domain (M2.2 — country pages)

Superset of today's `src/data/countries.js`. Whether this stays JSON or becomes
tables, the *shape* is the same; showing it as SQL to make relationships clear.

```sql
create schema content;

create table content.countries (
  code       text primary key,     -- ISO 3166-1 alpha-2, lowercase (matches current data)
  name       text not null,
  capital    text,
  region     text,                 -- Europe | Asia | Africa | Americas | Oceania
  difficulty text,                 -- easy | medium | hard (existing tier)
  -- Phase 2 expansion — the "why should I care?" surface:
  summary       text,              -- one-paragraph story (the Day 10 context card, expanded)
  population    bigint,
  area_km2      numeric,
  lat           numeric,           -- for the Country Locator map (Day 4) + map centering
  lng           numeric,
  has_outline   boolean default true,  -- replaces the noOutline flag
  facts         jsonb default '{}'::jsonb  -- climate/trade/culture hooks, flexible
);

-- Landmark / photo media (Day 7 game + country pages).
create table content.country_media (
  id bigint generated always as identity primary key,
  country_code text references content.countries(code),
  kind text,                       -- 'landmark' | 'flag' | 'outline'
  url text,
  attribution text                 -- keep licensing/credit with the asset
);
```

Assets (flags, outlines, landmark photos) stay **URLs**, consistent with the
current runtime-loading convention — don't store binaries in Postgres.

---

## Row-Level Security (the reason to use Supabase)

```sql
alter table profiles     enable row level security;
alter table user_stats   enable row level security;
alter table game_results enable row level security;

-- A player can read/write only their own rows.
create policy "own stats" on user_stats
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own results" on game_results
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Content is world-readable, writable only by admins/service role.
-- (content.* tables: enable RLS, add a `for select using (true)` policy.)
```

This pushes "a user sees only their own data" into the database itself — much
safer than enforcing it in app code, and it's the exact seam Phase 3 extends to
"a teacher sees only their class." **Once minors are involved (Phase 3), RLS +
data minimization stop being nice-to-haves** (COPPA/FERPA).

---

## Migrating Phase 1 progress → cloud

The local key is already versioned (`worldwise.progress.v1`,
`src/storage/progress.js`), which anticipates exactly this. On first successful
sign-in:

1. Read local `{ xp, streak, bestScore }` via `loadProgress()`.
2. `upsert` into `user_stats` (take the max of local vs. any existing cloud row —
   a returning user on a new device shouldn't lose the higher total).
3. Write a local flag (`worldwise.migrated.v1`) so it runs once.
4. From then on, cloud is the source of truth; local becomes an offline cache.

No destructive migration — local data is only ever read, never cleared.

---

## Deliberately out of scope here

- **Classrooms, rosters, assignments, gradebooks** — Phase 3. The `profiles.role`
  column is the only seam we plant now; the rest waits so we don't over-design.
- **Multi-tenant / district data** — Phase 4.
- **Choosing an ORM / query layer** — an M2.1 implementation detail, not a schema
  decision.

## Open questions to resolve when M2.1 starts

- Fold `user_stats` into `profiles`, or keep separate? (Separate favors a clean
  1:1 with the local shape and cheaper writes on every round.)
- Derive aggregates from `game_results` on read, or denormalize into `user_stats`
  on write? (Sketch assumes denormalize — fewer, simpler reads for the home screen.)
- Keep content as bundled JSON vs. move into `content.*`? Decide based on whether
  you need to *query* content against user data, not on volume alone.
