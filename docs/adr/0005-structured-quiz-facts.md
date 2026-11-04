# ADR 0005 — Structured quiz facts: one unambiguous answer, or no question

**Status:** Pilot (6 countries). Scaling to 196 is gated on review of the pilot.
**Date:** 2026-11-04
**Related:** [0001](0001-content-enrichment-sourcing.md) (sources), [0003](0003-physical-to-human-geography.md)
(the physical pass and its Factbook water fields), the "coming" Pro quizzes (City, River, Mountain,
Ocean, National Animal)

## Context

Five Pro quizzes were built on hand-compiled facts and are now "coming", because a product for
students never invents its content. They need structured, sourced facts. A fair quiz question
also needs more than a source: it needs **exactly one unambiguous answer per country**. "What is
Japan's ocean?" has two true answers, and a quiz that marks one of them wrong teaches something
false.

## Decision

A deterministic pass with no model in the loop: `scripts/fetch-quiz-facts.js` → validate
(`src/game/quizFactPolicy.js`, pure and tested) → human review (in
`content-sources/quiz-facts/<iso>.json`, as a git diff) → `scripts/promote-quiz-facts.js`. Every
field resolves to **usable / missing / multiple / contested**, and only usable + human-approved
values are promoted.

| Field | Source | Rule for "usable" |
|---|---|---|
| highestPoint | Wikidata P610 + P2044 | exactly one P610, **agreeing with the Factbook's** highest point (name match allowing transliteration, e.g. Hüiten/Khuiten; elevation within 1.5%) |
| largestCity | Wikidata P17 cities by P1082 | the top city, not within 5% of the next, **and agreeing with the Factbook's** largest urban area |
| longestRiver | Factbook "Major rivers (by length)" | the top of its length-ranked list; a tie is contested |
| waters | Factbook Coastline + Location | landlocked (itself a valid fact), or exactly one named body; two or more is *multiple* (the set is kept for a possible "which of these does it border?" question, never promoted as a single answer) |
| nationalAnimal | Factbook "National symbol(s)", each symbol classified by Wikidata (does it descend from Animalia, Q729?) | exactly one symbol that Wikidata confirms is an animal. Best-effort and partial by design; an unresolvable symbol is never assumed to be an animal |

### Two lessons from the pilot, now encoded

- **Largest city needs a second source.** Wikidata files some cities as metropolitan areas
  ("Greater Rio de Janeiro" outranked São Paulo; "Lagos" disappeared once metro items were
  excluded, which made Kano the "largest" city in Nigeria). Wikidata alone produced confident,
  wrong answers in both directions, so largest city now requires the Factbook's urban-area list to
  agree. Definition: city proper; items that are *directly* a metropolitan or urban area are
  excluded. A subclass-path exclusion was tried and wrongly dropped Istanbul, a "metropolitan
  municipality".
- **Parse on phrases, not substrings.** The national-symbols filter dropped "chrysanthemum"
  because it contains "anthem". There's now a regression test.

### Promotion

Approved values go into `src/data/quizFacts.js`, a generated, synchronous accessor
(`quizFactFor(code, field)`, `countriesWithFact(field)`) in the countryMetrics.js mould, so a
round builds without a network call. Wiring these into `content.countries` and the
`content_version` bump lands with the first approved batch. Nothing is approved yet.

## Pilot result (np, br, jp, tr, ng, bo)

See `content-sources/quiz-facts/_coverage.md`. Usable: highest point 6/6, largest city 5/6,
longest river 3/6, waters 4/6 (2 multiple), national animal 1/6. National animal and longest
river look too sparse for a fair 196-country quiz. That is the decision the coverage report
exists to force *before* those quizzes are built.

## Scaling notes

The largest-city query takes ~10–40 s per country (the city class path), so a 196-country run
is about an hour of polite SPARQL. It runs once and its results are cached. It is re-runnable,
and a re-run keeps a review decision only if the value is unchanged.
