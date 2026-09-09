# Country photos — ingest, review, publish

Operational runbook. The *why* is in [adr/0002-country-photos.md](./adr/0002-country-photos.md).

**The rule that matters:** ingest writes drafts. A draft is `status='pending'`, and the
public-read RLS policy on `content.country_media` only returns `status='approved'`, so a
pending row is invisible to the app **at the database** — not filtered out by client code
that a refactor could drop. Nothing reaches a reader until a human looks at the actual
picture and approves it. Worldwise is used by children, and Wikidata's `P18` is community
curation, not our editorial call.

---

## 0. Prerequisites

- The country-media migration applied (`supabase/migrations/*_country_media_review.sql`).
- The `content` schema exposed to the Data API (Dashboard → Project Settings → API →
  Exposed schemas). Already done for this project; a new project needs it again.
- A **service-role (secret) key**. It bypasses RLS. Pass it inline on the command; never put
  it in `.env`, never behind an `EXPO_PUBLIC_` prefix.

## 1. See what would be ingested (no key, writes nothing)

```bash
npm run media:photos -- --dry-run                # all 196
npm run media:photos -- --dry-run br jp is cl    # a few
```

Prints the Commons file and the credit line for each country. Lines marked `!` have no
author or no licence and **can never be approved** — CC BY and CC BY-SA both require
attribution, so an uncreditable image is a licensing failure, not a cosmetic one.

## 2. Ingest (drafts only)

```bash
SUPABASE_SERVICE_ROLE_KEY=sb_secret_... npm run media:photos
SUPABASE_SERVICE_ROLE_KEY=sb_secret_... npm run media:photos -- --limit 20   # a first pass
```

Idempotent: a country whose row already points at the same Commons file is skipped, so a
re-run costs a few API calls and nothing else. If the upstream image *has* changed, the
object is replaced and the row is reset to `pending` — a new photo is a new review.

Against the local stack, set `SUPABASE_URL=http://127.0.0.1:54321` too. The script prints a
loud LOCAL/PRODUCTION banner before it writes anything; read it.

## 3. Review

```bash
SUPABASE_SERVICE_ROLE_KEY=sb_secret_... npm run media:approve -- --list
```

Prints every pending row with its credit, its image URL, and its Commons source page.
**Open each image.** Things to reject:

- Not the place (a flag, a coat of arms, a map — `P18` returns these often).
- A satellite image where a photograph would teach more. Not wrong, just weak.
- Anything off-tone for a children's product: conflict imagery, anything gratuitous.
- Anything you cannot credit (already refused by the script, but check the caption reads
  like a sentence — Commons author fields are occasionally junk HTML).

The Dashboard works too: **Table Editor → `content` → `country_media`** for the rows,
**Storage → `country-media` → `hero/`** for the images. Editing `status` there is
equivalent — except the Table Editor will *not* enforce the licensing gate, so prefer the
script.

## 4. Publish

```bash
SUPABASE_SERVICE_ROLE_KEY=sb_secret_... npm run media:approve -- br cl jp
```

Refuses any row with no author or no licence. Prints the new `content_version`.

**Approving bumps `content_version`, and that is deliberate.** A photo is the most visible
thing on a country page, so every client must refetch to see it. This is the mirror image
of the embeddings rule: embeddings are invisible to a reader and must **not** bump the
version.

Undo:

```bash
SUPABASE_SERVICE_ROLE_KEY=sb_secret_... npm run media:approve -- --revoke br
```

### The SQL equivalent

If you would rather work in the SQL editor:

```sql
-- what's waiting
select country_code, author, license, url, source_url
  from content.country_media
 where kind = 'hero' and status = 'pending'
 order by country_code;

-- publish (the author/licence guard is yours to keep here)
update content.country_media
   set status = 'approved', approved_at = now()
 where kind = 'hero'
   and country_code in ('br', 'cl', 'jp')
   and author is not null
   and license is not null;

-- unpublish
update content.country_media
   set status = 'pending', approved_at = null
 where kind = 'hero' and country_code = 'br';
```

The `content_version` bump is a statement-level trigger, so it happens either way.

## 5. Replacing a bad image by hand

`P18` is a starting point, not an answer. To override one country, upload your own file to
`country-media/hero/<iso2>.jpg` (Storage UI or `supabase storage cp`) and update the row's
`url`, `author`, `license`, `license_url`, and `source_url` to match **that** image's
licence. Do not leave the Commons attribution on a file that is no longer the Commons file.

A re-run of `media:photos` will not clobber it unless the upstream `P18` has also changed
(matched on `source_url`); pass `--force` only when you mean to discard local overrides.
