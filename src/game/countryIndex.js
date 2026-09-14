// Pure search/filter logic for the browsable country index (M2.2 step 5b).
// No RN or network here, so test/engine.test.js can exercise it directly.

// The five buckets COUNTRIES groups into, plus "All". This list is NOT just a
// filter UI: collectionPolicy.js builds the region collectible sets from it, so
// adding an entry here invents a collection. That is why the territories filter
// below is a separate export rather than a sixth region.
export const REGIONS = ["All", "Africa", "Americas", "Asia", "Europe", "Oceania"];

// The index lists PLACES, not COUNTRIES, so Greenland is findable by typing
// "Greenland" — which it previously was not, anywhere in the app. Most
// territories sit in one of the five regions and show up under it; Antarctica
// and the French Southern Lands sit outside all five, so without this filter
// they would be reachable only from "All" or by knowing to search for them.
export const TERRITORY_FILTER = "Territories";
export const INDEX_FILTERS = [...REGIONS, TERRITORY_FILTER];

export function searchCountries(countries, { query = "", region = "All" } = {}) {
  const q = query.trim().toLowerCase();
  return (
    countries
      .filter((c) =>
        region === "All"
          ? true
          : region === TERRITORY_FILTER
            ? Boolean(c.territory)
            : c.region === region
      )
      // Antarctica has no capital, so this cannot assume one: `c.capital` was
      // dereferenced directly, which threw on the first keystroke of any search
      // once the index started listing places rather than only countries.
      .filter(
        (c) => !q || c.name.toLowerCase().includes(q) || (c.capital ?? "").toLowerCase().includes(q)
      )
      .sort((a, b) => a.name.localeCompare(b.name))
  );
}
