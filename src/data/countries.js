// Curated country dataset for the Phase 1 prototype.
// code = ISO 3166-1 alpha-2 (lowercase). Used for both flag and outline image URLs.
// Flags:   https://flagcdn.com/w320/{code}.png
// Outlines: https://raw.githubusercontent.com/djaiss/mapsicon/master/all/{code}/vector.svg
export const COUNTRIES = [
  { code: "fr", name: "France", capital: "Paris", region: "Europe" },
  { code: "it", name: "Italy", capital: "Rome", region: "Europe" },
  { code: "es", name: "Spain", capital: "Madrid", region: "Europe" },
  { code: "de", name: "Germany", capital: "Berlin", region: "Europe" },
  { code: "gb", name: "United Kingdom", capital: "London", region: "Europe" },
  { code: "pt", name: "Portugal", capital: "Lisbon", region: "Europe" },
  { code: "gr", name: "Greece", capital: "Athens", region: "Europe" },
  { code: "nl", name: "Netherlands", capital: "Amsterdam", region: "Europe" },
  { code: "se", name: "Sweden", capital: "Stockholm", region: "Europe" },
  { code: "no", name: "Norway", capital: "Oslo", region: "Europe" },
  { code: "pl", name: "Poland", capital: "Warsaw", region: "Europe" },
  { code: "ru", name: "Russia", capital: "Moscow", region: "Europe" },
  { code: "ua", name: "Ukraine", capital: "Kyiv", region: "Europe" },
  { code: "ie", name: "Ireland", capital: "Dublin", region: "Europe" },
  { code: "tr", name: "Turkey", capital: "Ankara", region: "Asia" },
  { code: "us", name: "United States", capital: "Washington, D.C.", region: "Americas" },
  { code: "ca", name: "Canada", capital: "Ottawa", region: "Americas" },
  { code: "mx", name: "Mexico", capital: "Mexico City", region: "Americas" },
  { code: "br", name: "Brazil", capital: "Brasília", region: "Americas" },
  { code: "ar", name: "Argentina", capital: "Buenos Aires", region: "Americas" },
  { code: "cl", name: "Chile", capital: "Santiago", region: "Americas" },
  { code: "pe", name: "Peru", capital: "Lima", region: "Americas" },
  { code: "co", name: "Colombia", capital: "Bogotá", region: "Americas" },
  { code: "cu", name: "Cuba", capital: "Havana", region: "Americas" },
  { code: "jp", name: "Japan", capital: "Tokyo", region: "Asia" },
  { code: "cn", name: "China", capital: "Beijing", region: "Asia" },
  { code: "in", name: "India", capital: "New Delhi", region: "Asia" },
  { code: "kr", name: "South Korea", capital: "Seoul", region: "Asia" },
  { code: "th", name: "Thailand", capital: "Bangkok", region: "Asia" },
  { code: "vn", name: "Vietnam", capital: "Hanoi", region: "Asia" },
  { code: "id", name: "Indonesia", capital: "Jakarta", region: "Asia" },
  { code: "sa", name: "Saudi Arabia", capital: "Riyadh", region: "Asia" },
  { code: "ph", name: "Philippines", capital: "Manila", region: "Asia" },
  { code: "eg", name: "Egypt", capital: "Cairo", region: "Africa" },
  { code: "za", name: "South Africa", capital: "Pretoria", region: "Africa" },
  { code: "ng", name: "Nigeria", capital: "Abuja", region: "Africa" },
  { code: "ke", name: "Kenya", capital: "Nairobi", region: "Africa" },
  { code: "ma", name: "Morocco", capital: "Rabat", region: "Africa" },
  { code: "et", name: "Ethiopia", capital: "Addis Ababa", region: "Africa" },
  { code: "gh", name: "Ghana", capital: "Accra", region: "Africa" },
  { code: "au", name: "Australia", capital: "Canberra", region: "Oceania" },
  { code: "nz", name: "New Zealand", capital: "Wellington", region: "Oceania" },
];

export const flagUrl = (code) => `https://flagcdn.com/w320/${code}.png`;
export const outlineUrl = (code) =>
  `https://raw.githubusercontent.com/djaiss/mapsicon/master/all/${code}/vector.svg`;
