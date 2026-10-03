// Official (or primary national) language per sovereign state, for Language
// Quiz (M2.7 step 2).
//
// Keyed by the same ISO 3166-1 alpha-2 code COUNTRIES uses — a sibling lookup,
// the same pattern currencies.js/countryMetrics.js/countryTerrain.js already
// use for a fact that isn't on COUNTRIES itself.
//
// Hand-compiled rather than drafted from the Factbook/Wikidata pipeline (see
// docs/adr/0001), the same way currencies.js and COUNTRIES' own `capital`
// column were: general-knowledge, stable facts that are nonetheless easy to
// get subtly wrong. A currency has one legal answer; a LANGUAGE often does
// not — many states name two or more languages co-official with no single
// "the" one. Where that's true, this picks the one most commonly cited as
// primary (usually the most widely spoken as a first language, occasionally
// a constitutionally "national" language distinct from a co-official
// administrative one — Ireland's Irish over English is the clearest example).
// That is a judgment call, not a fact with one right answer, so — same spirit
// as currencies.js's own note — this is worth a second pair of eyes before a
// classroom relies on it. Botswana, Haiti, Kenya, Singapore, South Africa,
// Vanuatu and Zimbabwe are the ones most likely to draw a disagreement.
//
// Like currencies.js, the prompt and options are the language's NAME rather
// than an ISO code — nobody quizzes "which language is code PUS?".
export const LANGUAGE_BY_CODE = {
  // ── Europe ──────────────────────────────────────────────
  al: "Albanian",
  ad: "Catalan",
  at: "German",
  by: "Belarusian",
  be: "Dutch",
  ba: "Bosnian",
  bg: "Bulgarian",
  hr: "Croatian",
  cy: "Greek",
  cz: "Czech",
  dk: "Danish",
  ee: "Estonian",
  fi: "Finnish",
  fr: "French",
  de: "German",
  gr: "Greek",
  hu: "Hungarian",
  is: "Icelandic",
  // Co-official with English; Irish is the constitutionally-named national
  // and first official language even though English is the majority first
  // language day to day.
  ie: "Irish",
  it: "Italian",
  lv: "Latvian",
  li: "German",
  lt: "Lithuanian",
  lu: "Luxembourgish",
  mt: "Maltese",
  md: "Romanian",
  mc: "French",
  me: "Montenegrin",
  nl: "Dutch",
  mk: "Macedonian",
  no: "Norwegian",
  pl: "Polish",
  pt: "Portuguese",
  ro: "Romanian",
  ru: "Russian",
  sm: "Italian",
  rs: "Serbian",
  sk: "Slovak",
  si: "Slovenian",
  es: "Spanish",
  se: "Swedish",
  ch: "German",
  ua: "Ukrainian",
  gb: "English",
  va: "Italian",

  // ── Asia ────────────────────────────────────────────────
  af: "Pashto",
  am: "Armenian",
  az: "Azerbaijani",
  bh: "Arabic",
  bd: "Bengali",
  bt: "Dzongkha",
  bn: "Malay",
  kh: "Khmer",
  cn: "Mandarin Chinese",
  ge: "Georgian",
  in: "Hindi",
  id: "Indonesian",
  ir: "Persian",
  iq: "Arabic",
  il: "Hebrew",
  jp: "Japanese",
  jo: "Arabic",
  kz: "Kazakh",
  kw: "Arabic",
  kg: "Kyrgyz",
  la: "Lao",
  lb: "Arabic",
  my: "Malay",
  mv: "Dhivehi",
  mn: "Mongolian",
  mm: "Burmese",
  np: "Nepali",
  kp: "Korean",
  om: "Arabic",
  pk: "Urdu",
  ps: "Arabic",
  // Co-official with English; Filipino is the constitutionally-named
  // national language.
  ph: "Filipino",
  qa: "Arabic",
  sa: "Arabic",
  // Four co-official languages (Malay, Mandarin, Tamil, English); Malay is
  // the one named "national language" in the constitution, though English
  // is the dominant working language.
  sg: "Malay",
  kr: "Korean",
  lk: "Sinhala",
  sy: "Arabic",
  tw: "Mandarin Chinese",
  tj: "Tajik",
  th: "Thai",
  // Co-official with Portuguese; Tetum is the national lingua franca most
  // Timorese actually speak, while Portuguese is spoken by a minority.
  tl: "Tetum",
  tr: "Turkish",
  tm: "Turkmen",
  ae: "Arabic",
  uz: "Uzbek",
  vn: "Vietnamese",
  ye: "Arabic",

  // ── Africa ──────────────────────────────────────────────
  dz: "Arabic",
  ao: "Portuguese",
  bj: "French",
  // Official language is English; Setswana is the national language spoken
  // by the large majority. Picked for the same reason Ireland's answer is
  // Irish rather than English.
  bw: "Setswana",
  bf: "French",
  bi: "Kirundi",
  cv: "Portuguese",
  cm: "French",
  // Co-official with French; Sango is the lingua franca almost everyone
  // actually speaks.
  cf: "Sango",
  td: "French",
  km: "Comorian",
  cg: "French",
  cd: "French",
  ci: "French",
  dj: "French",
  eg: "Arabic",
  gq: "Spanish",
  // Eritrea has no de jure official language; Tigrinya is the most widely
  // used working language.
  er: "Tigrinya",
  sz: "siSwati",
  et: "Amharic",
  ga: "French",
  gm: "English",
  gh: "English",
  gn: "French",
  gw: "Portuguese",
  // Co-official with English; Swahili is the national language and the one
  // most strongly associated with Kenya.
  ke: "Swahili",
  ls: "Sesotho",
  lr: "English",
  ly: "Arabic",
  mg: "Malagasy",
  mw: "English",
  ml: "French",
  mr: "Arabic",
  mu: "English",
  ma: "Arabic",
  mz: "Portuguese",
  na: "English",
  ne: "French",
  ng: "English",
  rw: "Kinyarwanda",
  st: "Portuguese",
  sn: "French",
  sc: "Seychellois Creole",
  sl: "English",
  so: "Somali",
  // One of 11 co-equal official languages; isiZulu has the most first-
  // language speakers of any of them.
  za: "Zulu",
  ss: "English",
  sd: "Arabic",
  tz: "Swahili",
  tg: "French",
  tn: "Arabic",
  ug: "English",
  zm: "English",
  // One of 16 co-official languages (2013 constitution); Shona is spoken by
  // the large majority.
  zw: "Shona",

  // ── Americas ────────────────────────────────────────────
  ag: "English",
  ar: "Spanish",
  bs: "English",
  bb: "English",
  bz: "English",
  bo: "Spanish",
  br: "Portuguese",
  // Canada is officially bilingual (English + French), co-equal in federal
  // law; English is the first official language of a larger share of the
  // population nationally.
  ca: "English",
  cl: "Spanish",
  co: "Spanish",
  cr: "Spanish",
  cu: "Spanish",
  dm: "English",
  do: "Spanish",
  ec: "Spanish",
  sv: "Spanish",
  gd: "English",
  gt: "Spanish",
  gy: "English",
  // Co-official with French; Haitian Creole is spoken by virtually the
  // entire population, French by a small educated minority.
  ht: "Haitian Creole",
  hn: "Spanish",
  jm: "English",
  mx: "Spanish",
  ni: "Spanish",
  pa: "Spanish",
  // Co-official with Guaraní, which actually has more first-language
  // speakers — but Spanish is the one used in government and schooling.
  py: "Spanish",
  pe: "Spanish",
  kn: "English",
  lc: "English",
  vc: "English",
  sr: "Dutch",
  tt: "English",
  // The US has no federally-designated official language; English is the
  // de facto national language.
  us: "English",
  uy: "Spanish",
  ve: "Spanish",

  // ── Oceania ─────────────────────────────────────────────
  au: "English",
  fj: "English",
  ki: "English",
  mh: "Marshallese",
  fm: "English",
  nr: "Nauruan",
  // English is the dominant first language; Māori and NZ Sign Language are
  // also official.
  nz: "English",
  pw: "Palauan",
  // Co-official with English (and Hiri Motu); Tok Pisin is the country's
  // actual lingua franca.
  pg: "Tok Pisin",
  ws: "Samoan",
  sb: "English",
  to: "Tongan",
  tv: "Tuvaluan",
  // One of three co-official languages (with English and French); Bislama
  // is the national lingua franca.
  vu: "Bislama",
};

export function languageFor(code) {
  return LANGUAGE_BY_CODE[code] ?? null;
}

// Every distinct language name in the catalog, mirroring CURRENCY_NAMES —
// unused by the easy multiple-choice round today, kept for a future typed
// tier's autocomplete pool.
export const LANGUAGE_NAMES = [...new Set(Object.values(LANGUAGE_BY_CODE))];
