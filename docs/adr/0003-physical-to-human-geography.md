# ADR 0003 — Physical geography → human geography

**Status:** Accepted for the pilot; six countries drafted, scaling gated on review
**Date:** 2026-09-14
**Related:** [ADR 0001](0001-content-enrichment-sourcing.md),
[content-response-policy.md](../content-response-policy.md), ROADMAP M2.9

## Context

The first enrichment pass gave every country five prose fields: a hook, physical
geography, climate, economy, and people and culture. It works, and it is thin in
exactly the place the product's thesis lives. `physicalGeography` is two or three
sentences of Factbook terrain prose — "central plain with mountains to north and
south" — and nothing anywhere connects that to why people are where they are.

Worldwise exists to teach _how the world works_, and its first claim is that
geography is the context for every other subject. A country page that names a
mountain range and stops has not made that claim; it has published a landform.

This pass adds the physical detail (Layer A) and the connection to human
settlement (Layer B). The two are separated deliberately, because they carry
very different risk.

## Decision

### Four physical fields, one connective field

| Draft key   | Fact key    | Page label              | Layer |
| ----------- | ----------- | ----------------------- | ----- |
| `landforms` | `landforms` | Landforms & geology     | A     |
| `waters`    | `waters`    | Rivers & water          | A     |
| `biomes`    | `biomes`    | Biomes & land cover     | A     |
| `resources` | `resources` | Natural resources       | A     |
| `whyHere`   | `why_here`  | Why people settled here | **B** |

`physical_geography` stays as the short overview it already is. The new fields
go beneath it, so the page reads general → specific → human.

`biomes` rather than `landscapes`, because `physical_geography` is already
labelled "Landscape" on the page and two sections with near-identical names is a
worse page than one with a slightly technical word in it.

**Geology lives inside `landforms` rather than in a field of its own.** The
Factbook has no geology section; what it has is `Elevation`, `Terrain` and the
volcanism and seismicity inside `Natural hazards`. Those describe the structure
of the ground, which is what `landforms` is. A separate `geology` field would
have been empty or padded for most of the world, and a field that is usually
empty teaches the model to pad — which is the one thing the grounding rules
cannot tolerate.

### Layer A sources — the Factbook fields we were already caching and not using

Every Layer A field is drafted from CIA World Factbook geography fields (public
domain). Three of them are new to the cache, and one was being cached and
silently discarded:

- **`Elevation` was already fetched and contributed nothing.** It is a _nested_
  node — `{ "highest point": { text }, "lowest point": { text }, "mean
elevation": { text } }` — and the excerpt builder only ever read `node.text`,
  which is undefined for a nested node. So every draft in the corpus was written
  without knowing any country's highest point. `flatten()` in
  `scripts/draft-country-content.js` now renders nested nodes as
  `"highest point: Mount Catherine 2,629 m; lowest point: …"`. The same bug was
  swallowing `Land use`.
- **Newly cached:** `Major rivers (by length in km)`, `Major lakes (area sq km)`,
  `Major watersheds (area sq km)`, `Major aquifers`, `Irrigated land`.

### Layer B's source is a real field, not an inference

The temptation with a "why here" field is to let the model reason from the
physical facts to a settlement story. That is exactly how geographic determinism
gets written, and it would be ungrounded besides.

**Layer B's primary source is the Factbook's `Population distribution` field**,
which states where people actually live and usually why, in the source's own
words. Egypt's reads: _"approximately 95% of the population lives within 20 km
(12 mi) of the Nile River and its delta; vast areas of the country remain
sparsely populated or uninhabited."_ That is a sourced fact about settlement, not
a theory about it. `Geography - note` (land bridges, straits, canals) and
`Irrigated land` back it up, and the Layer A facts are the anchor every claim has
to rest on.

Consequence worth stating plainly: **where the source says nothing about
settlement, the field is empty.** That is the rule working, not a gap to fill.

### The anti-determinism rule

The full rule lives in
[content-response-policy.md](../content-response-policy.md#physical-geography-and-human-settlement--the-anti-determinism-rule),
because it binds all authored content and not just this pass. Its four load-bearing
clauses: possibility never destiny; never rank or compare peoples; uncontested
connections only, anchored in stated physical facts; settlement not conflict.

It is enforced in three places rather than trusted once:

1. **The drafting prompt** (`supabase/functions/draft-content/index.ts`) carries it
   as literal rules, with the banned verbs named. Vague guidance does nothing under
   pressure.
2. **The validator** (`scripts/validate-drafts.js`) matches determinism-shaped
   language mechanically, in two severities:
   - **ERROR — do not promote.** Ranking and supremacist language: _superior_,
     _inferior_, _more/less advanced_, _primitive_, _backward_, _savage_,
     _civilised peoples_, _master race_, _racially_, _inherently_. A ranking claim
     is a factual error about how human societies work, so it blocks promotion
     rather than being softened.
   - **WARN — a human reads it.** Straight-line causal language: _determined_,
     _dictated_, _destined_, _destiny_, _inevitable_, _ensured_, _guaranteed_,
     _bound to_, _could only_, _explains why_, _meant that_. These have innocent
     senses ("determined by survey", "the inevitable tide"), so they are surfaced
     rather than refused.
3. **Review.** Every `whyHere` field is printed in full in its own section of the
   validation report, marked `LAYER B`, separately from the physical fields — the
   response policy requires heavier review for these and a report that mixes them
   in with mountain heights does not deliver it.

### Rejected alternatives

- **Model-from-memory for the settlement connection.** The model knows a great deal
  about the Nile. Using it would break the grounding invariant that makes the
  citation UI honest, and "well-known" is exactly the category where a confident
  wrong claim survives review.
- **Wikidata for rivers and mountains.** `P610` (highest point) is added as a
  cross-check on the Factbook's own figure. Rivers are not: a SPARQL query for
  "rivers in country X" returns an unranked list including creeks, with no length
  ordering and no indication of which matter — while the Factbook ships a curated,
  length-ranked list with shared-basin annotations. A structured source is only
  worth using for the question it actually answers (ADR 0001's `P47` lesson).
- **A single merged "geography" field.** Cheaper to draft and worse to retrieve:
  the chunker splits on fields, so one long field becomes several anonymous-ish
  pieces of the same topic, and interest-aware re-ranking loses the topic signal
  it re-ranks on.
- **Drafting Layer B for all 196 in the same run as Layer A.** Layer B needs its
  own review pass. Running them together would mean either approving 196 Layer B
  fields at once or blocking 196 Layer A fields behind that review.

## Pipeline (unchanged)

```
fetch  →  content-sources/raw/<iso>.json      cached; --force to refresh
draft  →  content-sources/drafts/<iso>.json   structured auto-filled, prose model-authored
validate → npm run content:validate           determinism + grounding + chunk invariants
review →  git diff                            Danny approves or edits. Nothing auto-publishes.
promote → src/data/countryContent.js  →  npm run seed:content  →  content_version bumps
                                      →  npm run ingest:embeddings  →  re-measure the floor
```

No new infrastructure. The drafting Edge Function, the local driver, the review
gate, the seed and the embedding ingest are the same ones ADR 0001 built; this
pass widens the field list they all carry.

## Invariants carried forward

- Every chunk names its country; `contentChunks.js` is generic over `facts` keys, so
  the new fields chunk and stay named without a change.
- Chunks stay under the gte-small 512-token cap (1200 chars). Five new fields per
  country roughly doubles the corpus, so **the 0.80 similarity floor must be
  re-measured after ingestion** — ADR 0001 re-measured it at 1,168 chunks and both
  bands moved.
- **Adding fact keys shifts chunk indexes**, because the chunker sorts keys and the
  upsert key is positional. This is safe only because the ingest deletes stale
  indexes per country after re-embedding it; that behaviour is load-bearing now in a
  way it was not before.
- `content_version` bumps on the re-seed, never for embeddings alone.
- Each field carries its source. Promotion now writes a **per-field** source map
  (`facts._sources.fields`) rather than one blanket line, so a citation can name the
  Factbook section a specific claim came from.

## Consequences

- Ten prose fields per country instead of five. Drafting cost roughly doubles; the
  driver prints it.
- `physicalGeography` now overlaps its more specific neighbours. Accepted: it is the
  overview, and the prompt tells the model to keep it general and not repeat the
  detail fields.
- Countries with thin sources get shorter pages, and some will have an empty
  `why_here`. The validator warns per field rather than failing, because "the source
  does not say" is a correct outcome here.
