// M2.5 step 6.2: collection policy — the pure decision layer over "how much
// of a region has this player collected," mined from the per-country signal
// step 6.1 started capturing (game_results.countries).
//
// No React Native or network import, so test/engine.test.js can exercise
// this directly under tsx — same discipline as every other pure game/ module.
import { COUNTRIES } from "../data/countries";
import { REGIONS } from "./countryIndex";

// countryIndex.js's REGIONS leads with "All" for its filter UI, which isn't
// a collectible set of its own — every other region already covers it.
const COLLECTION_REGIONS = REGIONS.filter((region) => region !== "All");

// Fold every row's countries[] (game_results' new column, one { code,
// correct } per answered question) into the set of codes this player has
// ever gotten right. A row with no countries (older rounds, or a caller
// passing local records) simply contributes nothing — same "tolerate a
// sparser shape" contract countriesFromHistory and resultRowFromRound use.
function correctCodes(results) {
  const codes = new Set();
  for (const row of results ?? []) {
    for (const entry of row?.countries ?? []) {
      if (entry?.correct && entry?.code) codes.add(entry.code);
    }
  }
  return codes;
}

// One entry per region, in countryIndex.js's own order, each carrying enough
// for a hero screen to render a progress bar directly — mirrors
// achievementPolicy.js's { value/progress } shape and masteryPolicy.js's
// "map the catalog, don't invent one" contract.
export function computeCollections(results, countries = COUNTRIES) {
  const collected = correctCodes(results);
  return COLLECTION_REGIONS.map((region) => {
    const regionCountries = countries.filter((c) => c.region === region);
    const collectedCount = regionCountries.filter((c) => collected.has(c.code)).length;
    return {
      region,
      collected: collectedCount,
      total: regionCountries.length,
      progress: regionCountries.length > 0 ? collectedCount / regionCountries.length : 0,
    };
  });
}
