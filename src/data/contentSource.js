// Country content, fetched (M2.3.5). The IO half of the content layer: reads
// content.countries over the Data API, caches each country in AsyncStorage, and
// falls back to the bundled JSON when the network isn't there.
//
// Every *decision* — is the cache fresh, what do we fall back to, in what order
// — lives in game/contentPolicy.js and is unit-tested with fakes. This file only
// wires real dependencies into it, the same way cloudProgress.js wires IO into
// cloudSync.js. That's why there's almost no logic here.
//
// Nothing throws. A country page must render offline, on a cold cache, and
// against an unseeded database — worst case it shows the bundled baseline,
// which is exactly what shipped before this milestone.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabase";
import { getCountryPage } from "./countryPages";
import {
  CONTENT_CACHE_PREFIX,
  contentCacheKey,
  resolveCountryContent,
} from "../game/contentPolicy";

// content.* is a separate schema from the user domain, so every query goes
// through .schema() — and the schema must also be listed under the project's
// exposed schemas or PostgREST 404s regardless of grants (see the migration).
const CONTENT_SCHEMA = "content";

// Named explicitly rather than select("*") so a column added later can't start
// silently inflating every country fetch.
const COUNTRY_COLUMNS =
  "code, name, capital, region, difficulty, summary, population, area_km2, " +
  "lat, lng, has_outline, neighbors, related_game_modes, facts";

// The content version is process-wide, not per country: one read serves every
// country page opened this session. Memoized as a promise so concurrent opens
// share a single request rather than racing.
let versionPromise = null;

// Read the singleton content_version row. A failure resolves to null, which
// contentPolicy reads as "server unreachable — trust the cache".
async function fetchContentVersion(client) {
  if (!versionPromise) {
    versionPromise = (async () => {
      try {
        const { data, error } = await client
          .schema(CONTENT_SCHEMA)
          .from("content_version")
          .select("version")
          .maybeSingle();
        if (error) return null;
        return data?.version ?? null;
      } catch {
        return null;
      }
    })();
  }

  const version = await versionPromise;
  // Don't memoize a failure: an app that launched offline would otherwise never
  // see fresh content until it was force-quit. Success stays memoized, so the
  // happy path is still one request per session.
  if (version == null) versionPromise = null;
  return version;
}

// Read one country row. Returns null on any error so the resolver falls through
// to its next source rather than surfacing a Postgres error to a learner.
async function fetchCountryRow(code, client) {
  try {
    const { data, error } = await client
      .schema(CONTENT_SCHEMA)
      .from("countries")
      .select(COUNTRY_COLUMNS)
      .eq("code", code)
      .maybeSingle();
    if (error) return null;
    return data;
  } catch {
    return null;
  }
}

// Fetch one country's page content.
//
// Returns { page, source } — source being "cache" | "remote" | "stale-cache" |
// "bundled" | "none". Callers can ignore it; it exists so a fallback is
// distinguishable from a live read, which is otherwise invisible on screen.
//
// `client` is injectable for the same reason cloudProgress.js does it: it keeps
// this callable against a test double without reaching for module mocking.
export async function fetchCountry(code, client = supabase) {
  return resolveCountryContent(code, {
    getCached: (c) => AsyncStorage.getItem(contentCacheKey(c)),
    setCached: (c, entry) => AsyncStorage.setItem(contentCacheKey(c), JSON.stringify(entry)),
    getVersion: () => fetchContentVersion(client),
    fetchRow: (c) => fetchCountryRow(c, client),
    // The bundled dataset stays the floor under everything: it's the seed
    // source for Postgres *and* the offline baseline, so these agree by
    // construction rather than by anyone remembering to update both.
    bundled: (c) => getCountryPage(c),
    now: () => new Date().toISOString(),
  });
}

// Drop one country's cached entry, or all of them. Not used by the app yet —
// a content bump invalidates entries on its own — but a "content looks wrong"
// escape hatch is much easier to add now than to retrofit.
export async function clearCountryCache(code = null) {
  try {
    if (code) {
      await AsyncStorage.removeItem(contentCacheKey(code));
      return;
    }
    const keys = await AsyncStorage.getAllKeys();
    const contentKeys = keys.filter((k) => k.startsWith(CONTENT_CACHE_PREFIX));
    if (contentKeys.length) await AsyncStorage.multiRemove(contentKeys);
  } catch {
    /* storage unavailable — the cache is disposable by definition */
  } finally {
    versionPromise = null;
  }
}
