// Which climate band a latitude falls in. Pure, and separated from the colours
// it drives so the geography and the palette can be argued about
// independently — the same split as locatorRound.js (states) vs GlobeMap.js
// (fills).
//
// The globe used to paint all 196 countries one flat navy, which reads as a
// diagram of the world rather than the world. Latitude is the one piece of
// terrain information a country's own center vector already carries, and it is
// genuinely predictive: the great deserts sit in the subtropical dry belts, the
// rainforests on the equator, the taiga above them. So the shading is real
// information rather than decoration, at the cost of one honest simplification
// — a country is banded by its CENTER, so a long country like Chile is painted
// by its middle rather than its extremes.
import {
  CLIMATE_TROPIC_DEG,
  CLIMATE_ARID_DEG,
  CLIMATE_TEMPERATE_DEG,
  CLIMATE_POLAR_DEG,
} from "../constants";

export const CLIMATE_BANDS = ["tropical", "arid", "temperate", "boreal", "polar"];

// Bands are symmetric about the equator, so only |latitude| matters.
export function climateBand(latitude) {
  const lat = Math.abs(Number(latitude));
  if (!Number.isFinite(lat)) return "temperate";
  if (lat <= CLIMATE_TROPIC_DEG) return "tropical";
  if (lat <= CLIMATE_ARID_DEG) return "arid";
  if (lat <= CLIMATE_TEMPERATE_DEG) return "temperate";
  if (lat <= CLIMATE_POLAR_DEG) return "boreal";
  return "polar";
}
