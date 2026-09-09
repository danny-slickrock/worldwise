# ADR 0002 — Country photos: sourcing, storage, licensing, review

**Status:** Accepted
**Date:** 2026-09-09
**Related:** [0001-content-enrichment-sourcing.md](./0001-content-enrichment-sourcing.md),
[phase-2-data-model.md](../phase-2-data-model.md), ROADMAP M2.3.5 (`content.country_media`)

## Context

`content.country_media` shipped with M2.3.5 and has been live and empty ever since. Nothing
read it, so nothing was broken — but the media half of the content backend has never been
exercised, and a country page today is an outline on a navy card and nothing else.

A photo is the fastest way to answer "why should I care about this place?" before a single
word is read. It is also the fastest way to get it badly wrong: Worldwise is used by
children, and an image that is off-tone, misattributed, or simply of the wrong place does
more damage than no image at all.

This ADR fixes where photos come from, where they live, what we owe their authors, and who
decides they may be shown.

## Decision

### Source: Wikidata `P18` — the canonical representative image

Each country's Wikidata entity carries **`P18` ("image")**: a single, community-curated
image chosen to *represent that entity*. We resolve the entity from the country's
**ISO 3166-1 alpha-2 code (`P297`)**, which is the key we already store as
`content.countries.code`, then read `P18`.

Why this and not the obvious alternatives:

- **Not an image search.** A search returns whatever ranks, per query, per day. It is
  unreviewed, unstable across runs, and its licensing is unknown until someone checks each
  result by hand. `P18` returns *one* image per country, chosen deliberately by editors, and
  it is the same image on every run — which is what makes ingestion idempotent and review
  finite.
- **Not a hand-picked set.** 196 hand-picked images is a week of work that has to be redone
  the first time a licence or a URL rots. `P18` gives a reviewable *starting draft* for all
  196 in one pass; the human effort goes into approving or replacing, not sourcing.
- **`P18` is a draft, not an answer.** It is frequently a flag, a map, or a mediocre
  snapshot. That is exactly why nothing it produces is displayed before a human approves it
  (see *Review*).

Every `P18` value is a file on **Wikimedia Commons**, which is what makes the licensing
story tractable — see below.

### Storage: download and re-host in Supabase Storage. Never hotlink.

Images are downloaded from Commons at ingest time and uploaded to a public
**`country-media`** Storage bucket, one object per country (`hero/<iso2>.jpg`). The
`content.country_media.url` column holds *our* object URL, not upload.wikimedia.org.

Why:

- **Hotlinking is not ours to do.** Commons' own guidance is to serve copies, not to point
  a product's traffic at their infrastructure.
- **A third-party URL can change under us.** A Commons file can be renamed, replaced, or
  deleted. Re-hosting means an approved image stays exactly the image that was approved —
  the review is meaningless otherwise.
- **CDN + transforms.** Supabase Storage serves from a CDN and can resize / re-encode on the
  fly (`/storage/v1/render/image/public/...?width=...`), so one stored original serves a
  phone and a desktop without shipping a 4 MB JPEG to either. The stored object is itself
  already a 1600px Commons thumbnail rather than the full-resolution original, so the
  bucket stays small even if transforms are unavailable on the current plan.
- **Transforms are a Pro-plan feature, so they are an optimisation, not a dependency.** The
  canonical object URL is what is stored; the transform URL is *derived* in one pure
  function, and the client falls back to the plain object URL if a transform request fails.

Binaries still never go in Postgres — the M2.3.5 rule ("media stays URLs") is unchanged;
the URLs simply now point at storage we control.

### Licensing: Commons images are free, and free is not the same as unattributed

Commons files are public-domain or CC-licensed. The CC licences in practice — **CC BY**,
**CC BY-SA** — **require attribution**, and BY-SA also requires that the licence be named.
Meeting that obligation is not optional and cannot be retrofitted from a URL, so it is
captured per image at ingest time, as structured columns rather than one prose blob:

| column        | source                                    |
| ------------- | ----------------------------------------- |
| `author`      | Commons `extmetadata.Artist` (HTML stripped) |
| `license`     | `extmetadata.LicenseShortName` (e.g. "CC BY-SA 4.0") |
| `license_url` | `extmetadata.LicenseUrl`                  |
| `source_url`  | the Commons file description page         |

Structured, not a single `attribution` string, because the caption, the licence link, and
the source link are three different things on screen, and because a machine has to be able
to answer "which images are share-alike?" later without parsing prose.

The display side renders **`Photo: {author} / Wikimedia ({license})`** beneath every image.
An image whose author or licence could not be resolved is ingested but **can never be
approved** — an un-creditable image is a licensing problem, not a cosmetic one.

### Review: nothing reaches a child's screen unapproved

`content.country_media` gains a **`status`** column, `'pending' | 'approved'`, defaulting to
`'pending'`. The public-read RLS policy is narrowed to `status = 'approved'`, so:

- Ingestion writes drafts that are **invisible to the app by construction** — not hidden by
  a client-side filter that a future refactor could drop, but unreadable by `anon` and
  `authenticated` at the database.
- Approval is a deliberate human act (`npm run media:approve <iso2>...`, or the Table
  Editor), performed after looking at the actual picture.
- Re-ingesting an image that has changed resets its status to `'pending'`. A new photo is a
  new review; inheriting the old approval would let an unreviewed image onto the page
  through the back door.

Approval is an `update`, which the existing statement-level trigger turns into a
`content_version` bump — so clients refetch and see newly approved photos. **This is the
opposite of the embeddings rule:** embeddings are invisible to the reader and must *not*
bump the version; images are the most visible thing on the page and must.

## Consequences

- The first run produces 196 drafts, of which a meaningful fraction will be flags, maps, or
  weak photographs. That is expected: the pipeline's job is to make review cheap, not to be
  right first time.
- Countries with no `P18` are skipped and logged. The country page must render with no
  photo and no gap — the photo is an enhancement to a page that already worked.
- We inherit Commons' curation, including its blind spots. A wrong-looking hero is fixed by
  overriding the row, not by arguing with Wikidata.

## Not building now (noted so it isn't rediscovered)

- **Openverse** as a second source, for landmark and place shots beyond the one
  representative image. It aggregates Flickr/Commons/museum collections under CC filters and
  would fit the same `country_media` shape (`kind='landmark'`). Worth it once one hero per
  country is approved and the review workflow has been used in anger — not before.
- **Blurhash placeholders.** The placeholder today is a theme-toned block. A blurhash needs
  a decode step in the client and a hash column; the block already prevents layout shift,
  which was the actual problem.
