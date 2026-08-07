// When to trust cached country content, when to refetch, and what to fall back
// to. Pure — no storage, network, or React — so the rules are stated once and
// unit-tested, rather than being re-derived from an `if (cached)` buried in the
// fetch layer. Same split as syncPolicy.js (decisions) vs cloudProgress.js (IO).
//
// The invalidation model is one integer. `content.content_version` is bumped by
// a trigger on any content write; each cached country carries the version it
// was fetched under. Version differs → the entry is stale. That means a content
// correction invalidates every device's cache without the server tracking who
// cached what, and without the client diffing anything.
import { pageFromCountryRow } from "./contentSync";

// Versioned key prefix, matching the storage/progress.js convention — the ".v1"
// is the *cache shape*, not the content version, so the entry format can change
// later without reading stale data of a different shape.
export const CONTENT_CACHE_PREFIX = "worldwise.content.country.";
export const CONTENT_CACHE_SUFFIX = ".v1";

export function contentCacheKey(code) {
  return `${CONTENT_CACHE_PREFIX}${code}${CONTENT_CACHE_SUFFIX}`;
}

// Wrap a page for storage, stamped with the content version it was fetched
// under. `now` is injected rather than read from the clock so the shape stays
// pure and testable.
export function cacheEntry(page, version, now = null) {
  return { version: version ?? null, page, cachedAt: now };
}

// Parse a stored entry, tolerating anything: corrupt JSON, a half-written
// value, or an entry from an older shape. Returns null rather than throwing,
// because a bad cache entry must degrade to a refetch, never to a crash.
export function parseCacheEntry(raw) {
  if (!raw) return null;
  let parsed;
  try {
    parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  if (!parsed.page || typeof parsed.page !== "object" || !parsed.page.code) return null;
  return { version: parsed.version ?? null, page: parsed.page, cachedAt: parsed.cachedAt ?? null };
}

// Is a cached entry good enough to render without refetching?
//
// A null `version` means we couldn't reach the server to ask. Offline, stale
// content beats no content — and beats a network round trip that will fail —
// so the cache is treated as fresh. That is the deliberate call that keeps the
// country page working on a plane.
export function isCacheFresh(entry, version) {
  if (!entry || !entry.page) return false;
  if (version == null) return true;
  return entry.version === version;
}

// Resolve one country's content, preferring fresh cache → remote → stale cache
// → bundled baseline. Every dependency is injected, so this whole decision tree
// is testable with plain fakes and never touches AsyncStorage or the network.
// The IO wiring lives in src/data/contentSource.js.
//
// deps:
//   getCached(code)   → stored entry (string or object) or null
//   setCached(code, entry) → persist; failures are swallowed
//   getVersion()      → current content version, or null if unreachable
//   fetchRow(code)    → a content.countries row, or null
//   bundled(code)     → the bundled page for this code, or null
//   now()             → optional timestamp for the cache entry; injected rather
//                       than read from the clock so this stays pure
//
// Returns { page, source } where source is one of:
//   "cache" | "remote" | "stale-cache" | "bundled" | "none"
// The source is returned rather than logged so callers (and tests) can tell a
// live read from a fallback — an offline page and a fresh page look identical
// on screen otherwise.
export async function resolveCountryContent(code, deps) {
  const { getCached, setCached, getVersion, fetchRow, bundled, now } = deps;

  const version = await safe(() => getVersion?.(code), null);
  const cached = parseCacheEntry(await safe(() => getCached?.(code), null));

  if (isCacheFresh(cached, version)) {
    return { page: cached.page, source: "cache" };
  }

  const row = await safe(() => fetchRow?.(code), null);
  const remotePage = pageFromCountryRow(row);
  if (remotePage) {
    // A failed write just costs the next launch a refetch, so it never blocks
    // returning the page we already have in hand.
    const stampedAt = await safe(() => now?.(), null);
    await safe(() => setCached?.(code, cacheEntry(remotePage, version, stampedAt)), null);
    return { page: remotePage, source: "remote" };
  }

  // Remote failed. A stale entry is still real content for this country, and
  // is likelier to be richer than the bundled baseline, so it outranks it.
  if (cached?.page) return { page: cached.page, source: "stale-cache" };

  const bundledPage = (await safe(() => bundled?.(code), null)) ?? null;
  if (bundledPage) return { page: bundledPage, source: "bundled" };

  return { page: null, source: "none" };
}

// Run an injected dependency, converting any throw or rejection into a
// fallback. Nothing in this module may throw: content failing to load must
// degrade the page, never break it.
async function safe(fn, fallback) {
  try {
    const value = await fn();
    return value ?? fallback;
  } catch {
    return fallback;
  }
}
