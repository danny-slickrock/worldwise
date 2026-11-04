# ADR 0006 — Country photo gallery

**Status:** Pilot (5 countries, local stack). A full fetch waits on review of the pilot.
**Date:** 2026-11-04
**Related:** [ADR 0002](0002-country-photos.md) (the hero pipeline this extends),
[country-photo-review.md](../country-photo-review.md), `content-sources/media/gallery-pilot.md`

## Decision

Country pages gain a gallery of **landmark** photos under the hero. It's the same pipeline and
every guarantee of ADR 0002, widened from one image per country to up to `GALLERY_MAX` (6).

- **Source:** the country's UNESCO World Heritage Sites (Wikidata P1435 = Q9259, located via P17)
  that have a representative image (P18), ranked by sitelink count (ties broken by Q-id).
  It's stable for the same reason P18 is: the same query returns the same places and images run
  after run, so ingest is idempotent and review is finite. It is never an image search of the day.
  World Heritage Sites are also curated, kid-appropriate and geographically meaningful.
- **Re-hosted:** a 1600px Commons rendition goes to the `country-media` bucket at
  `landmark/<iso>/<Q-id>.<ext>`. One object per landmark, overwritten on re-run, never hotlinked.
- **Licensed:** author, license, license_url and source_url are structured columns. A row missing
  an author or licence is refused by `npm run media:approve -- --gallery`.
- **Reviewed at the database:** every row is ingested `status='pending'`, and the existing
  approved-only RLS policy hides it from the app. Never filter in the client.
- **Visible:** approving bumps `content_version` through the existing statement-level trigger, so
  clients refetch, exactly like the hero.
- **Idempotent:** one row per (country, landmark Q-id), via a partial unique index. An unchanged
  image is skipped; a changed one replaces the object and resets the row to pending, because a new
  photo is a new review.

Schema (migration `20261104150000`): `title` (the caption: what the photo is *of*), `position`
(display order) and `source_entity` (the Q-id, the idempotence key). Hero rows don't carry them,
so a hero ingest is unchanged and works against a database without this migration.

**App:** the country fetch embeds hero *and* gallery in one request, so one cache entry can never
mix versions. It falls back to a hero-only read if the database predates the gallery columns, and
then to no media. `CountryGallery` is a swipeable strip of `CountryPhoto` cards (4:3), reusing the
reserved aspect ratio, skeleton placeholder, transform-URL fallback and credit line. Images
**lazy-load** as the strip scrolls (only the first two are requested up front), and visibility is
**never gated on onLoad**. The gallery sits after the country's summary.

## Pilot findings

See `content-sources/media/gallery-pilot.md`: 28 candidates for pe/eg/jp/np/br, which is about
**1,000 reviews at 196 countries**. Three things want a decision before a full fetch:

1. **Ranking isn't fame.** Machu Picchu didn't make Peru's six, and Abu Mena outranks Giza.
   Options: a fame signal other than sitelinks, or a small curated must-include list per country.
2. **Wrong kind of item.** "Kyoto Prefecture" carries the WHS designation in Wikidata. Exclude
   administrative areas.
3. **Un-creditable files exist** (Brazil's "Salvador"). The gate refuses them, as designed.
   They'd want a replacement image rather than a gap.
