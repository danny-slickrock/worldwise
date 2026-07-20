// Pure search/filter logic for the browsable country index (M2.2 step 5b).
// No RN or network here, so test/engine.test.js can exercise it directly.
export const REGIONS = ["All", "Africa", "Americas", "Asia", "Europe", "Oceania"];

export function searchCountries(countries, { query = "", region = "All" } = {}) {
  const q = query.trim().toLowerCase();
  return countries
    .filter((c) => region === "All" || c.region === region)
    .filter((c) => !q || c.name.toLowerCase().includes(q) || c.capital.toLowerCase().includes(q))
    .sort((a, b) => a.name.localeCompare(b.name));
}
