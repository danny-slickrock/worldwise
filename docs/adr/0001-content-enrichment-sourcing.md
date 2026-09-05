# ADR 0001 — Content enrichment: sourcing and review

**Status:** Accepted for the pilot; scaled pipeline built, drafting run gated on review
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

## Scaling findings (all 196 fetched)

- **Border-name resolution needed a real table, not a guess.** Across 196 countries
  there are 168 distinct border names; 157 matched our dataset directly, 11 needed
  aliases (Burma, Cote d'Ivoire, Czech Republic, Macedonia, The Gambia, both
  Congos, Holy See, US/UK/UAE abbreviations) and 12 references are to territories.
  `src/data/borderAliases.js` holds both tables, and an unknown name is a
  validation failure rather than a silent drop. Result: **616 coded relations, 12
  territories correctly uncoded, 0 unknown.**
- **Kosovo gets no code**, for a different reason than the other territories: it is
  a recognition dispute, and the response policy says to stay out of those.
- **A parsing bug only visible at scale.** `"Zambia 0.15 km"` and `"Italy 3."` left
  `"Zambia 0."` and `"Italy 3."` as names, because the pattern assumed integer
  distances. The six-country pilot never hit it.
- **Two countries have no Factbook entry** (`cy`, `ps`). Cyprus and Palestine are
  split across other Factbook entries; they keep structured facts and get no
  prose until handled.
- **A latent chunker bug, surfaced by testing the validator rather than the
  content.** `splitProse` ran on the *already-labelled* string, so splitting a long
  fact put "Brazil — Climate:" on the first piece only and left every continuation
  chunk anonymous — the exact misattribution the naming rule exists to prevent. It
  was invisible because short content never splits; model-drafted prose would have
  made it real. Fixed in `contentChunks.js` (`namedPieces`), which also re-splits
  against a reduced budget so the added prefix cannot push a piece over the cap.

## Do NOT promote Wikidata's `continent`

Wikidata answers a different question than our `region` field. It uses "North
America" / "South America" where we use "Americas", and "Insular Oceania" for six
countries; it also places Georgia, Kazakhstan and Turkey in Europe where our
dataset says Asia.

`content.countries.region` drives region filters and the learning paths, so
adopting Wikidata's taxonomy would reshuffle those silently. **Keep the existing
`region` values at promotion.** `continent` stays in the draft as a cross-check
only — the three disagreements are all transcontinental countries, which is a
real ambiguity rather than an error in either source.

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
- **Drafting at scale runs through an Edge Function** (`supabase/functions/draft-content`)
  with a local driver (`scripts/draft-via-edge.js`), mirroring the ingestion split
  for the same reason: `ANTHROPIC_API_KEY` stays in Edge secrets and never reaches
  a developer machine or the repo. The driver writes prose into the per-country
  draft files so a git diff stays the review surface.
- **Sonnet for drafting, Haiku for `ask`.** Drafting is one-time, human-reviewed,
  and its prose quality compounds into every future answer; the in-app path stays
  cheap. Cost is printed at the end of a run.
- **Validation is machine-checkable** (`scripts/validate-drafts.js`), because
  196 × 5 fields cannot be hand-read. It checks source-excerpt backing, deferred-scope
  leakage, territory-called-a-country, border-list consistency, the chunk cap, and
  that every chunk names its country. Verified to have teeth: 8 of 9 deliberately
  broken drafts were caught, and the ninth exposed the chunker bug above.
