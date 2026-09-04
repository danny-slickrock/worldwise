-- M2.9 step 1 — the embeddings store for the AI knowledge hub (RAG).
--
-- The milestone's whole premise is that answers are **grounded in our own
-- verified content** — the audience includes students, so a free-floating
-- hallucination is not an acceptable failure mode. This table is what makes
-- grounding mechanically possible: every chunk we might quote back is a row
-- derived from content.countries, and retrieval can only ever return rows that
-- are in here. Nothing is embedded that we did not write.
--
-- Embeddings are produced by Supabase's built-in gte-small model (Supabase.ai,
-- 384 dimensions), so there is no external embedding vendor and no second API
-- key to hold. gte-small returns normalized vectors, which is why the index
-- below uses cosine distance.

-- pgvector. Supabase's convention is to install extensions into `extensions`
-- rather than `public`, so a schema dump stays clean and the type is still
-- resolvable everywhere via the default search_path.
create extension if not exists vector with schema extensions;

-- ---------------------------------------------------------------------------
-- content.embeddings — one row per chunk of country content.
--
-- Lives in `content` rather than `public` for the same reason countries does:
-- it is world-readable derived content, not per-user data. The domain split
-- from the M2.1 user tables is deliberate and worth preserving.
-- ---------------------------------------------------------------------------
create table content.embeddings (
  id            bigint generated always as identity primary key,

  -- Cascade: if a country is ever deleted, its chunks must not outlive it and
  -- become orphaned context the model could still be handed.
  country_code  text not null references content.countries (code) on delete cascade,

  -- Position within that country's chunk sequence. Paired with country_code in
  -- the unique constraint below so re-ingestion is an upsert rather than an
  -- ever-growing pile of near-duplicate chunks — the ingestion job re-runs on
  -- every content_version bump, so this is the difference between a stable
  -- table and unbounded growth.
  chunk_index   integer not null check (chunk_index >= 0),

  -- The exact text handed to the model as context, and the exact text a
  -- citation points at. Stored rather than recomputed so an answer's sources
  -- can always be shown verbatim, even if the chunking logic changes later.
  content       text not null check (length(trim(content)) > 0),

  -- gte-small, 384 dimensions.
  embedding     extensions.vector(384),

  -- Which field the chunk came from ('summary', 'facts.climate', …). Kept so a
  -- citation can say where in a country page a claim lives, and so a bad
  -- chunker can be diagnosed without re-deriving anything.
  source        text,

  created_at    timestamptz not null default now(),

  unique (country_code, chunk_index)
);

-- Retrieval is almost always "nearest chunks, optionally within one country",
-- so the country filter earns a plain btree index alongside the vector one.
create index embeddings_country_code_idx on content.embeddings (country_code);

-- HNSW over cosine distance. gte-small emits normalized vectors, so cosine and
-- inner product rank identically; cosine is the conventional, less
-- foot-gun-prone choice. HNSW (not IVFFlat) because it needs no training pass
-- and stays accurate on a table this size that is rebuilt on every content
-- bump — an IVFFlat index built against 196 countries' chunks would need its
-- lists retuned as content grows, and a stale list count silently degrades
-- recall rather than erroring.
create index embeddings_embedding_idx
  on content.embeddings
  using hnsw (embedding extensions.vector_cosine_ops);

-- Deliberately NO content_version bump trigger here. content_version drives the
-- *client's* per-country page cache; embeddings are server-side retrieval data
-- no client reads directly. Bumping on re-ingestion would invalidate every
-- cached country page on every device for a change none of them can see.
-- The dependency runs the other way: a version bump triggers re-ingestion.

-- ---------------------------------------------------------------------------
-- Privileges. RLS says *which rows*; it never grants the table itself. Stated
-- explicitly rather than leaning on ambient defaults — a policy without a grant
-- returns "permission denied" on every query, which has already cost this
-- project one debugging session (see the M2.1 correction in ROADMAP.md).
--
-- Read is public, matching the rest of `content`: these chunks are verbatim
-- slices of text we already serve on public country pages, so there is nothing
-- here that isn't already readable. Worth knowing, though, that retrieval
-- actually runs server-side in the `ask` Edge Function — no client is expected
-- to select from this table, and the read grant could be tightened to
-- service_role later without breaking the feature.
--
-- Writes are service-role only. Ingestion is the sole writer.
-- ---------------------------------------------------------------------------
grant select on content.embeddings to anon, authenticated;
grant all    on content.embeddings to service_role;

-- ---------------------------------------------------------------------------
-- Row-Level Security. Enabled with a select-only policy: RLS defaults to deny,
-- so the *absence* of insert/update/delete policies is what protects the table,
-- not an oversight. anon and authenticated can read; nobody but the service
-- role (which bypasses RLS entirely) can write.
-- ---------------------------------------------------------------------------
alter table content.embeddings enable row level security;

create policy "embeddings are publicly readable"
  on content.embeddings
  for select
  using (true);

-- ---------------------------------------------------------------------------
-- content.match_country_chunks — the retrieval entry point.
--
-- This exists because vector search is not expressible through PostgREST's
-- query syntax: there is no way to write `order by embedding <=> $1` as a REST
-- filter. Without a function here, step 3's Edge Function would have no way to
-- retrieve at all. Keeping it in the migration also means the ranking SQL is
-- versioned with the schema it depends on, rather than embedded in a
-- separately-deployed function.
--
-- `filter_country` is optional: null searches every country (the discovery
-- surface), a code scopes to one (the "Ask about {place}" entry point).
--
-- Returns the cosine *similarity* (1 - distance) rather than the raw distance,
-- so callers can apply an intuitive "at least this relevant" floor without
-- having to remember which direction is better.
--
-- SECURITY INVOKER (the default) on purpose: this reads a public table, so it
-- should not run with definer privileges it does not need.
-- ---------------------------------------------------------------------------
create function content.match_country_chunks(
  query_embedding extensions.vector(384),
  match_count     integer default 8,
  filter_country  text    default null,
  min_similarity  float   default 0.0
)
returns table (
  id           bigint,
  country_code text,
  chunk_index  integer,
  content      text,
  source       text,
  similarity   float
)
language sql
stable
set search_path = ''
as $$
  select
    e.id,
    e.country_code,
    e.chunk_index,
    e.content,
    e.source,
    1 - (e.embedding operator(extensions.<=>) query_embedding) as similarity
  from content.embeddings e
  where e.embedding is not null
    and (filter_country is null or e.country_code = filter_country)
    and 1 - (e.embedding operator(extensions.<=>) query_embedding) >= min_similarity
  order by e.embedding operator(extensions.<=>) query_embedding
  limit greatest(match_count, 1);
$$;

grant execute on function content.match_country_chunks(
  extensions.vector(384), integer, text, float
) to anon, authenticated, service_role;
