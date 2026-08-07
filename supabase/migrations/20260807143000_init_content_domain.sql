-- M2.3.5 — Content domain: country content in Postgres.
--
-- Implements the Content domain from docs/phase-2-data-model.md. Until now
-- content lived only in bundled JSON (src/data/countries.js, whyItMatters.js,
-- countryPages.js); moving it here means a fact can be corrected without
-- shipping an app release, and the same rows can be chunked + embedded for RAG
-- in M2.9.
--
-- Two rules carried over from the data-model note:
--   * Media stays URLs. Never binaries in Postgres — assets keep loading from
--     flagcdn/mapsicon/Storage at runtime, same as today.
--   * Content is a *separate domain* from the user domain. It is world-readable
--     (no auth required) and writable only by the service role, which is the
--     mirror image of the owner-only RLS on profiles/user_stats/game_results.
--
-- The bundled JSON does not go away: it stays the seed source (scripts/
-- seed-content.mjs) and the offline/first-paint baseline the app falls back to.

create schema if not exists content;

-- ---------------------------------------------------------------------------
-- content.countries — superset of the bundled country record. Columns 1:1 with
-- the shape src/data/countryPages.js already returns, so the fetch layer is a
-- rename rather than a reshape.
--
-- `neighbors`, `related_game_modes` and `has_outline` are not in the original
-- data-model sketch but are in the shipped M2.2 content model — the country
-- page renders a Borders section, a "Play with …" row, and an outline
-- placeholder from them. Without these columns a fetched page would silently
-- lose sections the bundled one shows.
-- ---------------------------------------------------------------------------
create table content.countries (
  code               text primary key check (code ~ '^[a-z]{2}$'), -- ISO 3166-1 alpha-2, lowercase
  name               text not null,
  capital            text,
  region             text,   -- Europe | Asia | Africa | Americas | Oceania
  difficulty         text check (difficulty in ('easy', 'medium', 'hard')),
  -- The "why should I care?" surface.
  summary            text,
  population         bigint  check (population >= 0),
  area_km2           numeric check (area_km2 >= 0),
  lat                numeric check (lat between -90 and 90),
  lng                numeric check (lng between -180 and 180),
  has_outline        boolean not null default true, -- replaces the bundled `noOutline` flag
  neighbors          text[]  not null default '{}', -- ISO codes; the Borders section
  related_game_modes text[]  not null default '{}', -- 'flag' | 'capital' | 'shape' | 'locator'
  facts              jsonb   not null default '{}'::jsonb, -- climate/trade/culture hooks, flexible
  updated_at         timestamptz not null default now()
);

create index countries_region_idx on content.countries (region);

-- ---------------------------------------------------------------------------
-- content.country_media — landmark/photo media for country pages and the
-- future landmark game. URLs only; attribution rides along with the asset so
-- licensing/credit can never drift away from what it credits.
-- ---------------------------------------------------------------------------
create table content.country_media (
  id           bigint generated always as identity primary key,
  country_code text not null references content.countries (code) on delete cascade,
  kind         text not null check (kind in ('landmark', 'flag', 'outline', 'photo')),
  url          text not null,
  attribution  text,
  created_at   timestamptz not null default now(),
  -- Lets the seed script re-run without stacking duplicate rows.
  unique (country_code, kind, url)
);

create index country_media_country_idx on content.country_media (country_code);

-- ---------------------------------------------------------------------------
-- content.content_version — one row, one integer. The app reads this on launch
-- and compares it against the version stamped on each cached country; a bump
-- invalidates every cached entry at once without the client having to diff
-- anything or the server having to track per-device state.
--
-- The `id` column is the standard singleton trick: a boolean primary key that
-- must be true, so a second row is a constraint violation rather than a subtle
-- bug where half the clients read a different version.
-- ---------------------------------------------------------------------------
create table content.content_version (
  id         boolean primary key default true check (id),
  version    bigint not null default 1,
  updated_at timestamptz not null default now()
);

insert into content.content_version (id) values (true);

-- Bump on any content write. Statement-level (not row-level) so seeding 196
-- countries bumps the version once, not 196 times.
create function content.bump_content_version()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update content.content_version
     set version = version + 1,
         updated_at = now()
   where id;
  return null;
end;
$$;

create trigger countries_bump_version
  after insert or update or delete on content.countries
  for each statement execute function content.bump_content_version();

create trigger country_media_bump_version
  after insert or update or delete on content.country_media
  for each statement execute function content.bump_content_version();

-- ---------------------------------------------------------------------------
-- Privileges. RLS decides *which rows* a role may touch; it never grants access
-- to the table itself. The M2.1 migration learned this the hard way — policies
-- without grants return "permission denied" on every query — so the grants here
-- are explicit rather than leaning on ambient defaults.
--
-- Read is granted to anon as well as authenticated: country content is public,
-- and a signed-out visitor must be able to browse country pages.
--
-- No insert/update/delete is granted to anon or authenticated at all. Authoring
-- goes through the service role (scripts/seed-content.mjs), which bypasses both
-- grants and RLS. That is belt-and-braces with the select-only policies below.
-- ---------------------------------------------------------------------------
grant usage on schema content to anon, authenticated, service_role;

grant select on content.countries       to anon, authenticated;
grant select on content.country_media   to anon, authenticated;
grant select on content.content_version to anon, authenticated;

-- The service role owns authoring. Granted explicitly because a brand-new
-- schema inherits none of the ambient defaults that cover `public`.
grant all on all tables    in schema content to service_role;
grant all on all sequences in schema content to service_role;

-- ---------------------------------------------------------------------------
-- Row-Level Security — public read, no public write.
--
-- Every table gets RLS enabled *and* a select-only policy. Enabling RLS with no
-- policy would deny everything; a `using (true)` select policy with no
-- insert/update/delete policy denies exactly the writes we want denied, because
-- RLS defaults to deny for any command without a matching policy.
-- ---------------------------------------------------------------------------
alter table content.countries       enable row level security;
alter table content.country_media   enable row level security;
alter table content.content_version enable row level security;

create policy "public read countries" on content.countries
  for select to anon, authenticated using (true);

create policy "public read country media" on content.country_media
  for select to anon, authenticated using (true);

create policy "public read content version" on content.content_version
  for select to anon, authenticated using (true);
