// What kind of ground a country actually is — the globe's realistic basemap.
//
// The first version of this shaded land by the latitude of a country's centre.
// That is a real signal, but it is a crude one: it paints Egypt and Greece the
// same because they sit in the same band, and it has no idea that most of
// Australia is desert or that Norway is conifer forest. The globe looked
// striped rather than mapped.
//
// This classifies each country from the prose the repo already holds: the
// CIA World Factbook climate and landform lines carried in
// data/countryContent.js for all 194 countries (see
// docs/adr/0001-content-enrichment-sourcing.md — public domain, and already the
// source for what a country page says). So the shading is derived from the same
// reviewed description a player can read on the page, rather than from a
// formula. Latitude survives only as the fallback for a country with no prose.
//
// PURE: no RN, no theme, no dataset import. The class names map to colours in
// theme.js's `map.terrain`, exactly the way locatorRound.js names states and
// GlobeMap.js owns the fills.
import {
  CLIMATE_TROPIC_DEG,
  CLIMATE_ARID_DEG,
  CLIMATE_TEMPERATE_DEG,
  CLIMATE_POLAR_DEG,
} from "../constants";

// Ordered cold → hot, then the two that are about relief rather than climate.
// The order is the legend's reading order, so it is worth keeping meaningful.
export const TERRAIN_CLASSES = [
  "ice",
  "tundra",
  "boreal",
  "temperate",
  "mediterranean",
  "grassland",
  "drySteppe",
  "desert",
  "tropicalDry",
  "tropicalWet",
  "highland",
];

// Signals, extracted from the text. Each is a boolean question about the
// country, not a vote for a class — which is the difference between this and
// the keyword-scoring version that came before it. The Factbook's prose is
// DESCRIPTIVE ("hot, dry summers give way to moderate winters"), not
// classificatory; it almost never uses the word "boreal" or "savanna". So the
// text is asked about moisture, relief and the far north, and latitude supplies
// the thermal axis. That is also how a real biome map is built.
const SIGNALS = {
  ice: /\bice ?cap|ice sheet|permanent ice\b/,
  // "subarctic" is masked out before matching (see normalize), so this is only
  // ever a genuine arctic claim.
  // "the Arctic Ocean" is a coastline, not a biome — Norway's landform line
  // names it and Norway is conifer forest. Same lookahead trick as
  // `mediterranean`, for the same reason.
  tundra: /\btundra\b|\bpermafrost\b|\barctic(?!\s+(?:ocean|circle|sea))/,
  boreal: /\bsubarctic\b|\btaiga\b|\bboreal\b|\bconiferous\b/,
  arid: /\bdesert\b|\barid\b|\bhyperarid\b/,
  // Named desert, as opposed to merely arid. "Arid to semiarid" describes
  // dryness whose meaning depends on how cold it is — cold steppe at 48°N,
  // hot sand at 25°S — while a country whose prose NAMES a desert has one.
  namedDesert: /\bdesert\b/,
  semiarid: /\bsemiarid\b|\bsemi-arid\b|\bsteppe\b|\bscrub\b|\bsahel\b/,
  wet: /\brainforest\b|\brain forest\b|\bequatorial\b|\bmonsoon\b|\bhumid\b|\brainy seasons?\b|\bwet seasons?\b/,
  savanna: /\bsavanna\b|\bsavannah\b|\bgrassland\b|\bprairie\b|\bpampas\b|\bveld\b/,
  temperate: /\btemperate\b/,
  // "the Mediterranean coast" is a location, not a climate. France's climate
  // line mentions the sea; Italy's says the climate IS Mediterranean. The
  // lookahead is what separates them, and this signal is read from the CLIMATE
  // text only — a geography line naming the Mediterranean Sea says nothing
  // about what covers the ground.
  mediterranean: /\bmediterranean(?!\s+(?:coast|sea|basin|region))/,
  // The textbook Mediterranean description, for the countries whose prose gives
  // the pattern without ever naming it.
  medPattern: /(hot,? dry summers?[^.]*mild|mild,? wet winters?[^.]*hot,? dry)/,
  mountains: /\bmountainous\b|\bmountains?\b|\balps\b|\bhimalaya|\bandes\b|\bcaucasus\b/,
  // The signal that a country is a MOUNTAIN country rather than one that merely
  // has mountains. Almost every country has a range somewhere; only a few have
  // a climate that is organised by altitude.
  elevationClimate:
    /\bwith (altitude|elevation)\b|\bby elevation\b|\bshifts? .{0,24}(altitude|elevation)\b/,
};

// "Temperate rather than arctic, despite the latitude" is Iceland's actual
// climate line, and a naive match reads it as an arctic claim. Negated and
// comparative clauses are removed before anything is matched, and "subarctic"
// is masked so it can never satisfy the arctic pattern.
export function normalizeTerrainText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/\brather than [a-z-]+/g, " ")
    .replace(/\bnot (?:an? )?[a-z-]+/g, " ")
    .replace(/\bsubarctic\b/g, "\u0001subarctic\u0001");
}

// Restore the masked token for the patterns that actually want it.
const unmask = (t) => t.replace(/\u0001/g, "");

// Coerce a latitude, treating "absent" as absent.
//
// Number(null) is 0, not NaN — so a plain Number() coercion silently turns
// "this country has no centroid" into "this country is on the equator", and
// every polygon-less microstate comes out equatorial. Found the hard way.
function latitudeOf(value) {
  if (value == null || value === "") return NaN;
  const n = Math.abs(Number(value));
  return Number.isFinite(n) ? n : NaN;
}

// Latitude → class, the fallback when a country carries no usable prose. This
// is the whole of the old model, kept as a floor rather than as the answer.
export function bandFromLatitude(latitude) {
  const lat = latitudeOf(latitude);
  if (!Number.isFinite(lat)) return "temperate";
  if (lat <= CLIMATE_TROPIC_DEG) return "tropicalDry";
  if (lat <= CLIMATE_ARID_DEG) return "drySteppe";
  if (lat <= CLIMATE_TEMPERATE_DEG) return "temperate";
  if (lat <= CLIMATE_POLAR_DEG) return "boreal";
  return "tundra";
}

// Decide a country's terrain from its own description plus its latitude.
//
// Latitude gives the thermal band; the text can override it where the ground
// says something latitude cannot know — that Mongolia at 46°N is desert, that
// Nepal is organised by altitude, that most of Australia is sand.
//
// Order matters and is the whole design:
//   1. The far north first. Russia's climate line mentions steppe AND tundra;
//      checking dryness first would paint Siberia as dry grassland.
//   2. Mountain countries next, before moisture — Nepal is a highland country
//      whether or not its southern plain is humid.
//   3. Then moisture, which is the strongest thing text can tell us.
//   4. Then the thermal band, refined by whatever else the text offered.
//
// Returns { terrain, source } — the source so "did this come from real text or
// from a latitude guess?" is answerable, which matters when a country looks
// wrong on the globe.
export function classifyTerrain({
  climate = "",
  geography = "",
  summary = "",
  latitude = null,
} = {}) {
  // Climate is the primary statement; landform and summary corroborate. They
  // are concatenated rather than weighted because the signals are boolean — the
  // question is "does the country's own description say this at all?".
  const climateText = normalizeTerrainText(climate);
  const masked = `${climateText} ${normalizeTerrainText(geography)} ${normalizeTerrainText(summary)}`;
  const text = unmask(masked);

  // `tundra` reads the masked text so "subarctic" can never satisfy it;
  // `mediterranean` reads the climate line alone, for the reason at its
  // definition. Everything else reads all three sources.
  const has = (key) =>
    SIGNALS[key].test(key === "tundra" ? masked : key === "mediterranean" ? climateText : text);

  const lat = latitudeOf(latitude);
  const known = Number.isFinite(lat);

  const mediterranean = has("mediterranean") || SIGNALS.medPattern.test(climateText);
  const highland = has("elevationClimate") && has("mountains");

  // 1. The far north, first. Russia's climate line mentions steppe AND tundra;
  //    checking dryness first would paint Siberia as dry grassland. A high
  //    centroid alone is not enough, though — Norway's centroid sits at 71.8°
  //    only because the polygon includes Svalbard, while the country it
  //    describes is conifer forest.
  if (known && lat > 55) {
    if (has("ice")) return { terrain: "ice", source: "text" };
    if (has("tundra")) return { terrain: "tundra", source: "text" };
    return { terrain: "boreal", source: "latitude" };
  }

  // 2. Mountain countries, before moisture: Nepal is organised by altitude
  //    whether or not its southern plain is humid.
  if (highland) return { terrain: "highland", source: "text" };

  // 3. Moisture — the strongest thing text can tell us.
  if (has("arid")) {
    // Dryness in the tropics that comes WITH a wet season is the savanna and
    // Sahel transition, not desert: Kenya and Nigeria are both "arid in the
    // north" and neither is the Sahara.
    if (known && lat <= 20 && has("wet")) return { terrain: "tropicalDry", source: "text" };
    // A named desert is a desert wherever it is. Otherwise, high-latitude
    // aridity is cold steppe (Kazakhstan) and low-latitude aridity is hot sand
    // (Australia) — the same words meaning different ground.
    if (has("namedDesert")) return { terrain: "desert", source: "text" };
    return { terrain: known && lat > 40 ? "drySteppe" : "desert", source: "text+latitude" };
  }
  if (has("semiarid")) return { terrain: "drySteppe", source: "text" };

  // 4. The thermal band, refined by whatever else the text offered.
  if (!known) return { terrain: has("wet") ? "tropicalWet" : "temperate", source: "text" };
  if (lat > 48) {
    const boreal = has("boreal");
    return { terrain: boreal ? "boreal" : "temperate", source: boreal ? "text" : "latitude" };
  }
  if (lat > CLIMATE_TROPIC_DEG) {
    if (mediterranean) return { terrain: "mediterranean", source: "text" };
    return { terrain: "temperate", source: "latitude" };
  }
  if (has("wet")) return { terrain: "tropicalWet", source: "text" };
  if (has("savanna")) return { terrain: "grassland", source: "text" };
  return { terrain: "tropicalDry", source: "latitude" };
}
