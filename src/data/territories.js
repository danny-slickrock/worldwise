// The places on the map that are not sovereign states.
//
// countries.js is deliberately exactly the 196 sovereign states, and that
// number is load-bearing — it is what the quiz pools, the learning paths and
// the region collections are built from. But the *map* is not a list of
// sovereign states: it is the surface of the Earth, and drawing only those 196
// leaves ten visible holes in it. Greenland, the largest island on Earth, was
// simply missing from the North Atlantic; so were Antarctica, Western Sahara,
// Kosovo, Puerto Rico, New Caledonia, the Falklands and the French Southern
// Lands, plus Somaliland- and Northern-Cyprus-shaped bites out of Somalia and
// Cyprus. A hole reads as a bug, because it is one.
//
// So these are places, not countries, and the distinction is enforced rather
// than described:
//   · they are NOT in COUNTRIES, so no quiz pool, learning path or region
//     collection can pick one up by accident;
//   · they ARE in PLACES (see countries.js), which is what the map, the
//     country page and the search index read;
//   · every one carries a `status` line, shown on its page where a country
//     shows its capital, so the app never implies a territory is a country.
//
// Somaliland and Northern Cyprus are the two exceptions, and they are absent
// on purpose: neither has an ISO 3166-1 code to key on, and this whole app is
// keyed on ISO codes. Their land is merged into Somalia and Cyprus by
// scripts/build-worldmap.mjs, which follows ISO and removes the hole without
// the app having to invent a code — or a position.
//
// `status` wording follows the map source and the ISO register rather than any
// party to a dispute, and says who administers and who claims where both are
// true. This is a product used by children; the right move is to state the
// situation plainly, not to pick a side and not to leave a hole.
//
// Content (summary, population, area, facts) is NOT here. It comes through the
// same enrichment pipeline every country uses — content-sources/ → drafts →
// countryContent.js — so a territory page is built from CIA World Factbook
// prose and Wikidata numbers exactly like a country page is.

export const TERRITORIES = [
  {
    code: "gl",
    name: "Greenland",
    capital: "Nuuk",
    region: "Americas",
    status: "Autonomous territory of the Kingdom of Denmark",
    sovereign: "dk",
    territory: true,
  },
  {
    code: "aq",
    name: "Antarctica",
    // No capital, and no government to have one: the field is null rather than
    // a placeholder, and every surface that shows a capital has to handle that.
    capital: null,
    region: "Antarctica",
    status: "Continent governed by the Antarctic Treaty — no permanent population",
    sovereign: null,
    territory: true,
  },
  {
    code: "eh",
    name: "Western Sahara",
    capital: "El Aaiún",
    region: "Africa",
    status:
      "Disputed territory — administered by Morocco, claimed by the Sahrawi Arab Democratic Republic",
    sovereign: null,
    territory: true,
  },
  {
    code: "xk",
    name: "Kosovo",
    capital: "Pristina",
    region: "Europe",
    // "XK" is a user-assigned ISO code rather than an assigned one, which is
    // also why mapsicon has no outline for it — hence noOutline.
    status: "Partially recognised state",
    sovereign: null,
    territory: true,
    noOutline: true,
  },
  {
    code: "pr",
    name: "Puerto Rico",
    capital: "San Juan",
    region: "Americas",
    status: "Unincorporated territory of the United States",
    sovereign: "us",
    territory: true,
  },
  {
    code: "nc",
    name: "New Caledonia",
    capital: "Nouméa",
    region: "Oceania",
    status: "Special collectivity of France",
    sovereign: "fr",
    territory: true,
  },
  {
    code: "fk",
    name: "Falkland Islands",
    capital: "Stanley",
    region: "Americas",
    status: "British Overseas Territory — claimed by Argentina",
    sovereign: "gb",
    territory: true,
  },
  {
    code: "tf",
    name: "French Southern and Antarctic Lands",
    capital: "Port-aux-Français",
    region: "Antarctica",
    status: "Overseas territory of France — no permanent population",
    sovereign: "fr",
    territory: true,
  },
];

export const TERRITORY_CODES = TERRITORIES.map((t) => t.code);
