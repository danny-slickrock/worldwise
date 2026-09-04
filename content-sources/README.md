# content-sources/

Working files for the content-enrichment pipeline (M2.9). See
[docs/adr/0001-content-enrichment-sourcing.md](../docs/adr/0001-content-enrichment-sourcing.md).

**Committed on purpose.** `raw/` is the provenance — the exact upstream snapshot
each draft was written from, so a claim can be checked against its source without
refetching. `drafts/` is the review surface: approval happens as a git diff.
Together they are ~128 KB for six countries, so the whole 196-country corpus lands
around 4 MB of JSON. Cheap for a reviewable audit trail.

```
raw/_factbook-index.json   GEC code -> factbook.json path. Built once, cached.
raw/<iso>.json             Wikidata + trimmed CIA World Factbook, with licences.
drafts/<iso>.json          structured (generated) + prose (authored) + excerpts.
```

`structured` is regenerated from `raw/` on every scaffold run and must never be
hand-edited — fix it upstream or in the script. `prose` is preserved across runs,
so refetching sources cannot clobber approved text.

Nothing here is served to the app. Content reaches production only via promotion:
`src/data/countryPages.js` → `npm run seed:content` → `npm run ingest:embeddings`.

## Licences

- **Wikidata** — CC0 1.0. No attribution obligation, no share-alike.
- **CIA World Factbook** — US Government work, public domain. Retrieved via the
  `factbook.json` community conversion (a format change, not an editorial one).

Wikipedia is deliberately *not* a source: CC BY-SA share-alike is a poor fit for
product content. It remains fine as an onward-pointing reference for readers.
