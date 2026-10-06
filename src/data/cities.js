// Each sovereign state's largest city by population, for City Quiz (M2.7 step 5).
//
// Keyed by the same ISO 3166-1 alpha-2 code COUNTRIES uses — a sibling lookup,
// the same pattern currencies.js/languages.js/nationalAnimals.js/foodOrigin.js
// already use for a fact that isn't on COUNTRIES itself.
//
// Hand-compiled rather than drafted from the Factbook/Wikidata pipeline (see
// docs/adr/0001), the same way those four files were. Worth a second pair of
// eyes before a classroom relies on it, the same spirit as every other
// hand-typed fact in this codebase — population rankings shift and a few of
// these (conflict-affected cities especially) are more "commonly cited" than
// "freshly verified."
//
// THIS IS THE WHOLE POINT OF THE MODE: `capital` already exists on COUNTRIES,
// so a dataset that just mirrored it would make this Capital Quiz with extra
// steps (see ROADMAP.md's own warning on this step). Most countries' largest
// city IS their capital, and those entries are left alone rather than forced
// apart — but nearly a fifth of this catalog (37 of 196) is a genuine,
// well-known split between the seat of government and the most populous
// city: Turkey/Istanbul,
// Brazil/São Paulo, Nigeria/Lagos, Australia/Sydney, the US/New York City,
// Switzerland/Zürich, Vietnam/Ho Chi Minh City, Pakistan/Karachi, and more.
// Those are the cases that make "largest city" a genuinely different question
// from "capital," not a reskin of it.
export const LARGEST_CITY_BY_CODE = {
  // ── Europe ──────────────────────────────────────────────
  al: "Tirana",
  ad: "Andorra la Vella",
  at: "Vienna",
  by: "Minsk",
  be: "Brussels",
  ba: "Sarajevo",
  bg: "Sofia",
  hr: "Zagreb",
  cy: "Nicosia",
  cz: "Prague",
  dk: "Copenhagen",
  ee: "Tallinn",
  fi: "Helsinki",
  fr: "Paris",
  de: "Berlin",
  gr: "Athens",
  hu: "Budapest",
  is: "Reykjavík",
  ie: "Dublin",
  it: "Rome",
  lv: "Riga",
  // Liechtenstein's capital is Vaduz, but its most populous municipality is
  // Schaan — a genuinely distinct fact, not a slip.
  li: "Schaan",
  lt: "Vilnius",
  lu: "Luxembourg",
  // Malta's capital, Valletta, has under 6,000 residents; Birkirkara is the
  // country's most populous locality.
  mt: "Birkirkara",
  md: "Chișinău",
  mc: "Monaco",
  me: "Podgorica",
  nl: "Amsterdam",
  mk: "Skopje",
  no: "Oslo",
  pl: "Warsaw",
  pt: "Lisbon",
  ro: "Bucharest",
  ru: "Moscow",
  sm: "San Marino",
  rs: "Belgrade",
  sk: "Bratislava",
  si: "Ljubljana",
  es: "Madrid",
  se: "Stockholm",
  // Switzerland's capital is Bern; its largest city is Zürich.
  ch: "Zürich",
  ua: "Kyiv",
  gb: "London",
  va: "Vatican City",

  // ── Asia / Middle East ──────────────────────────────────
  af: "Kabul",
  am: "Yerevan",
  az: "Baku",
  bh: "Manama",
  bd: "Dhaka",
  bt: "Thimphu",
  bn: "Bandar Seri Begawan",
  kh: "Phnom Penh",
  // China's capital is Beijing; its largest city is Shanghai.
  cn: "Shanghai",
  ge: "Tbilisi",
  // India's capital is New Delhi; its largest city is Mumbai.
  in: "Mumbai",
  id: "Jakarta",
  ir: "Tehran",
  iq: "Baghdad",
  il: "Jerusalem",
  jp: "Tokyo",
  jo: "Amman",
  // Kazakhstan's capital is Astana; its largest city is Almaty, the former
  // capital.
  kz: "Almaty",
  kw: "Kuwait City",
  kg: "Bishkek",
  la: "Vientiane",
  lb: "Beirut",
  my: "Kuala Lumpur",
  mv: "Malé",
  mn: "Ulaanbaatar",
  // Myanmar's capital is Naypyidaw, a purpose-built seat of government; its
  // largest city by far is Yangon, the former capital.
  mm: "Yangon",
  np: "Kathmandu",
  kp: "Pyongyang",
  om: "Muscat",
  // Pakistan's capital is Islamabad; its largest city is Karachi.
  pk: "Karachi",
  // Ramallah is Palestine's administrative seat; Gaza City is its largest.
  ps: "Gaza City",
  // Manila is the capital; Quezon City, part of Metro Manila, is the
  // country's most populous city.
  ph: "Quezon City",
  qa: "Doha",
  sa: "Riyadh",
  sg: "Singapore",
  kr: "Seoul",
  // Sri Jayawardenepura Kotte is the capital; Colombo is the largest city.
  lk: "Colombo",
  // Aleppo is traditionally Syria's largest city, ahead of the capital,
  // Damascus.
  sy: "Aleppo",
  // Taipei is the capital; neighbouring New Taipei City is more populous.
  tw: "New Taipei City",
  tj: "Dushanbe",
  th: "Bangkok",
  tl: "Dili",
  // Ankara is the capital; Istanbul, the former capital, is by far the
  // largest city.
  tr: "Istanbul",
  tm: "Ashgabat",
  // Abu Dhabi is the capital; Dubai is the largest city.
  ae: "Dubai",
  uz: "Tashkent",
  // Hanoi is the capital; Ho Chi Minh City is the largest city.
  vn: "Ho Chi Minh City",
  ye: "Sanaa",

  // ── Africa ──────────────────────────────────────────────
  dz: "Algiers",
  ao: "Luanda",
  // Porto-Novo is Benin's official capital; Cotonou is the seat of
  // government and largest city.
  bj: "Cotonou",
  bw: "Gaborone",
  bf: "Ouagadougou",
  // Gitega became Burundi's capital in 2019; Bujumbura, the former capital,
  // remains the largest city.
  bi: "Bujumbura",
  cv: "Praia",
  // Yaoundé is the capital; Douala is the largest city and main port.
  cm: "Douala",
  cf: "Bangui",
  td: "N'Djamena",
  km: "Moroni",
  cg: "Brazzaville",
  cd: "Kinshasa",
  // Yamoussoukro is the official capital; Abidjan is the seat of government
  // and by far the largest city.
  ci: "Abidjan",
  dj: "Djibouti",
  eg: "Cairo",
  gq: "Malabo",
  er: "Asmara",
  // Mbabane is the administrative capital; Manzini is Eswatini's largest
  // city.
  sz: "Manzini",
  et: "Addis Ababa",
  ga: "Libreville",
  // Banjul, the capital, has only a few thousand residents; Serekunda is
  // the Gambia's largest city by a wide margin.
  gm: "Serekunda",
  gh: "Accra",
  gn: "Conakry",
  gw: "Bissau",
  ke: "Nairobi",
  ls: "Maseru",
  lr: "Monrovia",
  ly: "Tripoli",
  mg: "Antananarivo",
  mw: "Lilongwe",
  ml: "Bamako",
  mr: "Nouakchott",
  mu: "Port Louis",
  // Rabat is the capital; Casablanca is the largest city.
  ma: "Casablanca",
  mz: "Maputo",
  na: "Windhoek",
  ne: "Niamey",
  // Abuja is the capital; Lagos, the former capital, is Nigeria's largest
  // city and one of the largest in Africa.
  ng: "Lagos",
  rw: "Kigali",
  st: "São Tomé",
  sn: "Dakar",
  sc: "Victoria",
  sl: "Freetown",
  so: "Mogadishu",
  // Pretoria is the administrative capital; Johannesburg is South Africa's
  // largest city.
  za: "Johannesburg",
  ss: "Juba",
  sd: "Khartoum",
  // Dodoma is the official capital; Dar es Salaam is the former capital and
  // by far the largest city.
  tz: "Dar es Salaam",
  tg: "Lomé",
  tn: "Tunis",
  ug: "Kampala",
  zm: "Lusaka",
  zw: "Harare",

  // ── Americas ─────────────────────────────────────────────
  ag: "Saint John's",
  ar: "Buenos Aires",
  bs: "Nassau",
  bb: "Bridgetown",
  // Belmopan, built inland as the capital after a hurricane, is tiny;
  // Belize City remains the country's largest.
  bz: "Belize City",
  // Sucre is Bolivia's constitutional capital; Santa Cruz de la Sierra has
  // long since overtaken both it and the seat of government, La Paz.
  bo: "Santa Cruz de la Sierra",
  // Brasília is the capital; São Paulo is Brazil's largest city.
  br: "São Paulo",
  // Ottawa is the capital; Toronto is Canada's largest city.
  ca: "Toronto",
  cl: "Santiago",
  co: "Bogotá",
  cr: "San José",
  cu: "Havana",
  dm: "Roseau",
  do: "Santo Domingo",
  // Quito is the capital; Guayaquil is Ecuador's largest city.
  ec: "Guayaquil",
  sv: "San Salvador",
  gd: "Saint George's",
  gt: "Guatemala City",
  gy: "Georgetown",
  ht: "Port-au-Prince",
  hn: "Tegucigalpa",
  jm: "Kingston",
  mx: "Mexico City",
  ni: "Managua",
  pa: "Panama City",
  py: "Asunción",
  pe: "Lima",
  kn: "Basseterre",
  lc: "Castries",
  vc: "Kingstown",
  sr: "Paramaribo",
  // Port of Spain is the capital, but Chaguanas is Trinidad and Tobago's
  // most populous municipality.
  tt: "Chaguanas",
  // Washington, D.C. is the capital; New York City is the largest city.
  us: "New York City",
  uy: "Montevideo",
  ve: "Caracas",

  // ── Oceania ──────────────────────────────────────────────
  // Canberra was purpose-built as the capital; Sydney is Australia's
  // largest city.
  au: "Sydney",
  fj: "Suva",
  ki: "South Tarawa",
  mh: "Majuro",
  // Palikir is the purpose-built capital on Pohnpei; Weno, in Chuuk State,
  // is the Federated States of Micronesia's most populous town.
  fm: "Weno",
  nr: "Yaren",
  // Wellington is the capital; Auckland is New Zealand's largest city.
  nz: "Auckland",
  // Ngerulmud, purpose-built, has only a few hundred residents; Koror is
  // Palau's largest city and former capital.
  pw: "Koror",
  pg: "Port Moresby",
  ws: "Apia",
  sb: "Honiara",
  to: "Nuku'alofa",
  tv: "Funafuti",
  vu: "Port Vila",
};

export function largestCityFor(code) {
  return LARGEST_CITY_BY_CODE[code] ?? null;
}

// Every distinct city NAME in the catalog — same convention
// CURRENCY_NAMES/LANGUAGE_NAMES/NATIONAL_ANIMAL_NAMES/FOOD_NAMES use, kept
// here rather than recomputed at every call site.
export const CITY_NAMES = [...new Set(Object.values(LARGEST_CITY_BY_CODE))];
