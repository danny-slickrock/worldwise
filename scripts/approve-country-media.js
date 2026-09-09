// Country hero photos — review and publish. See docs/adr/0002-country-photos.md.
//
// Ingest writes drafts (status='pending'), which RLS hides from the app
// entirely. This is the only thing that makes one visible, and it is a
// deliberate human act performed AFTER looking at the actual picture. Worldwise
// is used by children; an off-tone or wrong-place image is a real risk, and the
// upstream source (Wikidata P18) is community curation, not our editorial call.
//
//   npm run media:approve -- --list            what's waiting, with its credit
//   npm run media:approve -- --list --all      including already-approved rows
//   npm run media:approve -- br cl jp          publish these countries
//   npm run media:approve -- --revoke br       send one back to pending
//
// Approving is an UPDATE, and the statement-level trigger from the M2.3.5
// migration turns any country_media write into a content_version bump — so
// every client refetches and sees the new photo. That is deliberate and is the
// mirror image of the embeddings rule: embeddings are invisible to a reader and
// must NOT bump the version; a photo is the most visible thing on the page and
// must.
//
// Reviewing in the Dashboard instead is equally valid: Table Editor →
// content.country_media → set `status`. The bucket's objects are browsable
// under Storage → country-media → hero/. This script exists because it also
// enforces the licensing rule below, which the Table Editor will not.
import { HERO_KIND, isPublishable, formatPhotoCredit } from "../src/game/mediaPolicy.js";
import { requireServiceConfig } from "./lib/env.mjs";
import { announceTarget } from "./lib/target-banner.mjs";

const args = process.argv.slice(2);
const list = args.includes("--list");
const all = args.includes("--all");
const revoke = args.includes("--revoke");
const codes = args.filter((a) => !a.startsWith("--")).map((c) => c.toLowerCase());

const { url, serviceKey } = requireServiceConfig("npm run media:approve");
const restUrl = `${url}/rest/v1`;
const headers = {
  apikey: serviceKey,
  Authorization: `Bearer ${serviceKey}`,
  "Accept-Profile": "content",
  "Content-Profile": "content",
};

async function fetchRows(filter) {
  const res = await fetch(
    `${restUrl}/country_media?kind=eq.${HERO_KIND}${filter}` +
      "&select=id,country_code,url,author,license,license_url,source_url,status" +
      "&order=country_code",
    { headers }
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

async function setStatus(ids, status) {
  const res = await fetch(`${restUrl}/country_media?id=in.(${ids.join(",")})`, {
    method: "PATCH",
    headers: { ...headers, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({
      status,
      // Null on revoke: the audit trail should say "not currently approved",
      // not carry a stale timestamp from a decision that has been reversed.
      approved_at: status === "approved" ? new Date().toISOString() : null,
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
}

async function contentVersion() {
  const res = await fetch(`${restUrl}/content_version?select=version`, { headers });
  if (!res.ok) return null;
  const [row] = await res.json();
  return row?.version ?? null;
}

async function main() {
  announceTarget(url);

  if (list) {
    const rows = await fetchRows(all ? "" : "&status=eq.pending");
    if (!rows.length) {
      console.log(all ? "No hero media at all. Run: npm run media:photos" : "Nothing pending.");
      return;
    }
    for (const row of rows) {
      const mark = row.status === "approved" ? "✓" : isPublishable(row) ? "·" : "!";
      console.log(`${mark} ${row.country_code}  [${row.status}]`);
      console.log(`    ${formatPhotoCredit(row) ?? "NO CREDIT — cannot be approved"}`);
      console.log(`    image:  ${row.url}`);
      console.log(`    source: ${row.source_url ?? "—"}`);
    }
    console.log(`\n${rows.length} row(s).  '!' cannot be approved: no author or no licence.`);
    console.log("Look at each image before approving:  npm run media:approve -- <iso2>...");
    return;
  }

  if (!codes.length) {
    console.error(
      "usage:\n" +
        "  npm run media:approve -- --list            what's waiting, with its credit\n" +
        "  npm run media:approve -- --list --all      including approved rows\n" +
        "  npm run media:approve -- br cl jp          publish these countries\n" +
        "  npm run media:approve -- --revoke br       send one back to pending"
    );
    process.exit(1);
  }

  const rows = await fetchRows(`&country_code=in.(${codes.join(",")})`);
  const found = new Set(rows.map((r) => r.country_code));
  for (const code of codes) if (!found.has(code)) console.warn(`  ! no hero row for ${code}`);

  if (revoke) {
    if (!rows.length) return;
    await setStatus(
      rows.map((r) => r.id),
      "pending"
    );
    console.log(`Revoked ${rows.length}: ${rows.map((r) => r.country_code).join(", ")}`);
    console.log(`content_version is now ${await contentVersion()} — clients will refetch.`);
    return;
  }

  // The licensing gate. CC BY and CC BY-SA both require attribution and BY-SA
  // requires the licence be named, so an image we cannot credit is a licensing
  // failure rather than a cosmetic one — it is refused here rather than shipped
  // with a blank caption.
  const publishable = rows.filter(isPublishable);
  for (const row of rows) {
    if (!isPublishable(row)) {
      console.error(
        `  ✗ ${row.country_code} — refusing: no author or no licence. Fix the row first.`
      );
    }
  }
  if (!publishable.length) {
    console.log("\nNothing approved.");
    return;
  }

  await setStatus(
    publishable.map((r) => r.id),
    "approved"
  );
  for (const row of publishable) {
    console.log(`  ✓ ${row.country_code} — ${formatPhotoCredit(row)}`);
  }
  console.log(`\nApproved ${publishable.length}.`);
  console.log(`content_version is now ${await contentVersion()} — clients refetch on next launch.`);
}

main().catch((err) => {
  console.error(`\n${err.message ?? err}`);
  process.exit(1);
});
