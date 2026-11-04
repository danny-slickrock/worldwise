-- Country photo GALLERY: many landmark images per country, alongside the one
-- hero. See docs/adr/0006-country-photo-gallery.md.
--
-- The kind already exists ('landmark', allowed since the review migration),
-- and so does everything that makes a row safe to show: status defaults to
-- 'pending', the public-read policy is `status = 'approved'`, the licensing
-- columns, and the statement-level trigger that bumps content_version on every
-- write (so approving a gallery image refetches clients, exactly like a hero).
-- Gallery rows need three more facts the hero never did:
--
--   title          what the photo is OF ("Machu Picchu") — the caption, and
--                  half of why a gallery teaches anything
--   position       display order (0 first): the ingest's stable ranking
--   source_entity  the Wikidata item the image represents (Q-id) — the
--                  idempotence key. One row per landmark per country, so a
--                  re-run updates that row rather than stacking a duplicate
--                  when the landmark's representative image changes.
--
-- No grant/RLS change: new columns ride on the existing select grant and the
-- approved-only policy.
alter table content.country_media
  add column title text,
  add column position smallint check (position is null or position >= 0),
  add column source_entity text;

create unique index country_media_landmark_entity_idx
  on content.country_media (country_code, source_entity)
  where kind = 'landmark';
