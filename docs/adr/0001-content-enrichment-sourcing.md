# ADR 0001 — Content enrichment: sourcing and review

**Status:** Proposed (pilot of 6 countries; scaling to 196 gated on review)
**Date:** 2026-09-04
**Related:** [content-response-policy.md](../content-response-policy.md), ROADMAP M2.9

## Context

The RAG corpus is 196 country summaries plus 196 geography lines, and exactly one
country (Brazil) carries `facts.*`. That is ~395 chunks of roughly two sentences
each. Retrieval and generation both work — a production question returns a
correct, cited answer — but every non-Brazil answer is drawn from the same two
thin chunks, and interest-aware re-ranking has almost nothing to reorder.

**Content depth, not the pipeline, is the ceiling on answer quality.** This ADR
covers where richer content comes from and how it gets reviewed.

## Decision

### Two sources, split by kind of claim

**Structured facts come from Wikidata.** Area, population, capital, official
languages, currency, continent. These arrive as numbers and entity labels, so
there is no paraphrase step and therefore no opportunity to invent. Licensed
**CC0** — no attribution obligation, no share-alike.

**Prose facts are drafted by the model from the CIA World Factbook.** Climate,
physical geography, economy, people and culture, and a "why it matters" hook. The
Factbook is a work of the US federal government and is therefore **public
domain**. Fetched via the `factbook.json` community conversion, which changes
format rather than content.

The model **rewrites** Factbook prose into engaging, curiosity-first language for
a capable adult, per the response policy. It never adds a fact that is not in the
source. Every prose section records which source it came from.

### Rejected alternatives

- **Wikipedia as a primary source.** CC BY-SA is share-alike; building a
  commercial product's core content on it invites a licensing argument we have no
  reason to have. Fine as an onward-pointing reference for readers (the response
  policy already allows that), not as a content input.
- **Model-from-memory.** Fast, and fatally wrong for this product: an
  uncited claim is exactly what the grounding rules exist to prevent, and it would
  make the citation UI a lie.
- **Wikidata `P47` for land borders.** See below — it is wrong for our purpose.

### Scope of this pass: uncontested factual content only

Geography, climate, economy, culture. History and conflict are deferred **for
sequencing — to prove the pipeline on easy material first — not because they are
off-limits.** They are legitimate adult content and come as a later, deliberately
scoped pass under the response policy's editorial rules.

## The land-borders trap (found during the pilot)

Wikidata's `P47` ("shares border with") **includes maritime borders**. It lists
six neighbours for Japan and two for Iceland; both have *no land border at all*.
For Brazil it adds France, via French Guiana.

Our chunker writes "shares a land border with", so using `P47` would have
published confidently-worded falsehoods at scale — and they would have been
retrieved and cited, which is worse than having no content.

**Land borders come from the Factbook's explicit `Land boundaries > border
countries` field**, which is absent exactly when a country has none. `P47` is
still cached for provenance, under a name that says what it actually is
(`sharesBorderWithAnyType`).

This is the general lesson: a structured source is only deterministic about the
question it is actually answering.

## Pipeline

```
fetch  →  content-sources/raw/<iso>.json      cached; never refetched without --force
draft  →  content-sources/drafts/<iso>.json   structured auto-filled, prose model-authored
review →  git diff                            Danny approves or edits. Nothing auto-publishes.
promote → src/data/countryPages.js  →  npm run seed:content  →  content_version bumps
                                    →  npm run ingest:embeddings
```

Review is a git diff over per-country draft files. Drafting **preserves existing
prose** on re-run, so a re-fetch cannot silently overwrite approved text.

## Invariants carried from M2.9

- Every chunk names its country. An unattributed fact gets misattributed.
- Chunks stay under the gte-small 512-token cap (1200 chars), which truncates
  silently.
- Shrinking a country's content deletes its orphaned chunks, or retired text
  stays retrievable and citable.
- **`content_version` bumps on content changes only, never for embeddings alone.**
  It drives the client's page cache; embeddings are server-side.
- Each facts section carries its source, for citation and license cleanliness.

## Consequences

- **The 0.80 similarity floor must be re-measured** once the corpus is denser. It
  was calibrated against five ingested countries; more content per country will
  move the bands.
- Chunk count grows roughly 5-8× (2 chunks/country → ~10-14), so ingestion runtime
  and the `WORKER_LIMIT` batch size need re-checking at scale.
- Two upstreams to re-pull as content ages. Both are stable and free; neither
  requires a key.
- Drafting currently runs through this session rather than a keyed script, because
  `ANTHROPIC_API_KEY` lives only in Edge secrets. Scaling to 196 needs either
  batched sessions or a local key — an open question for the scale decision.
