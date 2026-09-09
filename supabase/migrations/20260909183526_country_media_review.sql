-- Country photos: a review gate, structured licensing, and somewhere to put the
-- pixels. See docs/adr/0002-country-photos.md.
--
-- content.country_media has been live and empty since M2.3.5. Three things were
-- missing before it could carry a real photo:
--
--   1. A review gate. Worldwise is used by children, and the upstream source
--      (Wikidata P18) is a *draft*, not an editorial decision. `status` defaults
--      to 'pending' and the public-read policy is narrowed to 'approved', so an
--      unreviewed row is invisible to the app at the database — not filtered out
--      by client code that a later refactor could drop.
--   2. Structured licensing. Commons images are free but almost never
--      attribution-free: CC BY and CC BY-SA both require credit, and BY-SA
--      requires the licence be named. Author / licence / licence URL / source
--      URL are four separate things on screen, so they are four columns rather
--      than one prose blob.
--   3. A bucket. Images are downloaded and re-hosted rather than hotlinked, so
--      an approved image stays the exact image that was approved.
--
-- The version bump is free: the statement-level trigger from the M2.3.5
-- migration already fires on any country_media write, and approving a photo is
-- an UPDATE. That is deliberate and is the mirror image of the embeddings rule —
-- embeddings are invisible to a reader and must not bump content_version; a
-- photo is the most visible thing on the page and must.

-- ---------------------------------------------------------------------------
-- 1. Review status + structured attribution
-- ---------------------------------------------------------------------------

-- 'hero' is the one representative image that leads a country page. The
-- existing kinds stay: 'landmark' is the future multi-image case, 'flag' and
-- 'outline' are placeholders for assets that still load from CDNs at runtime.
alter table content.country_media
  drop constraint country_media_kind_check;

alter table content.country_media
  add constraint country_media_kind_check
  check (kind in ('hero', 'landmark', 'flag', 'outline', 'photo'));

alter table content.country_media
  add column status text not null default 'pending'
    check (status in ('pending', 'approved')),
  -- Commons extmetadata.Artist, with its HTML stripped. Null means the image
  -- could not be credited — which is a licensing failure, not a cosmetic one,
  -- so the approval script refuses to publish such a row.
  add column author text,
  -- extmetadata.LicenseShortName, e.g. 'CC BY-SA 4.0', 'Public domain'.
  add column license text,
  add column license_url text,
  -- The Commons file description page: where a reader (or a lawyer) goes to
  -- check the claim this row makes.
  add column source_url text,
  -- The Storage object key behind `url`. Kept separately so the object can be
  -- replaced or deleted without re-parsing a public URL.
  add column storage_path text,
  add column width int check (width > 0),
  add column height int check (height > 0),
  -- Set when status flips to 'approved'. Purely an audit trail — who/when is
  -- answered by the Supabase logs; this answers "has this been looked at".
  add column approved_at timestamptz;

comment on column content.country_media.attribution is
  'Free-form caption override. Normally null: the displayed credit is composed '
  'from author + license. Only set it when a source needs wording the '
  'structured columns cannot express.';

-- Exactly one hero per country. A partial index rather than a plain
-- unique (country_code, kind), because 'landmark' is explicitly a many-per-
-- country kind and must not be constrained by the hero's rule.
create unique index country_media_one_hero_idx
  on content.country_media (country_code)
  where kind = 'hero';

-- The app only ever asks for approved rows; this is the index that serves that.
create index country_media_approved_idx
  on content.country_media (country_code, kind)
  where status = 'approved';

-- ---------------------------------------------------------------------------
-- 2. Narrow public read to approved rows only
--
-- RLS decides which ROWS, and this is the whole review gate. Dropping and
-- recreating rather than altering: a policy's `using` clause is the security
-- boundary, and a diff that shows the full new predicate is worth more at
-- review time than one that shows a delta.
--
-- Writes stay exactly as they were: no insert/update/delete policy and no
-- write grant for anon or authenticated, so authoring is service-role only
-- (scripts/fetch-country-photos.mjs). RLS defaults to deny for any command
-- without a matching policy — the ABSENCE of a write policy is the protection.
-- ---------------------------------------------------------------------------
drop policy "public read country media" on content.country_media;

create policy "public read approved country media" on content.country_media
  for select to anon, authenticated
  using (status = 'approved');

-- Re-stated rather than assumed. content.* is a non-default schema, so it
-- inherits none of the ambient default privileges, and the columns added above
-- are covered by the existing table-level grant — but the M2.1 lesson (RLS
-- without GRANTs = "permission denied" on every query) is cheap to re-assert.
grant select on content.country_media to anon, authenticated;
grant all    on content.country_media to service_role;

-- ---------------------------------------------------------------------------
-- 3. The bucket
--
-- Public read so an image is a plain CDN URL with no signing round trip — the
-- images are already public-domain/CC by the time they are here, and the review
-- gate lives on the row, not the object.
--
-- Writes are service-role only. service_role bypasses RLS entirely, so the
-- protection is the ABSENCE of an insert/update/delete policy on
-- storage.objects for anon/authenticated, exactly as with content.* above.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'country-media',
  'country-media',
  true,
  10485760, -- 10 MiB; ingest stores a 1600px Commons thumbnail, not the original
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- A public bucket is readable through the public object endpoint regardless,
-- but the policy is stated so the intent survives someone flipping `public`.
drop policy if exists "public read country-media objects" on storage.objects;

create policy "public read country-media objects" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'country-media');
