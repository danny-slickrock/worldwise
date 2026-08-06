// Pure region-preset math for the World Map's region-zoom feature (M2.3 step
// 5.1): given a region's countries, compute the scale + pan the screen's
// existing zoom/pan transform (see mapZoom.js) needs to frame just that
// region. No RN/DOM imports, so test/engine.test.js can exercise it directly
// under tsx; the screen wiring (region picker, animating to a preset) is a
// later step.
import { pathBounds } from "./mapHitTargets";
import { clampScale, clampPan } from "./mapZoom";

// The five regions countries.js/countryIndex.js already group countries
// into (countryIndex.js's REGIONS also has a leading "All", which isn't a
// zoomable preset here).
export const MAP_REGIONS = ["Africa", "Americas", "Asia", "Europe", "Oceania"];

// Union bounding box (map viewBox units — see data/worldMap.js) of every
// `codes` entry that has path data. Countries without map data (the 29 of
// 196 with no Natural Earth shape) are skipped, so a region with an unmapped
// member still resolves from the rest; returns null only if none do.
export function regionBounds(countryPaths, codes) {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  let found = false;
  for (const code of codes) {
    const d = countryPaths[code];
    if (!d) continue;
    const b = pathBounds(d);
    found = true;
    if (b.minX < minX) minX = b.minX;
    if (b.maxX > maxX) maxX = b.maxX;
    if (b.minY < minY) minY = b.minY;
    if (b.maxY > maxY) maxY = b.maxY;
  }
  return found ? { minX, minY, maxX, maxY } : null;
}

// Converts a region's bounding box into { scale, pan } for the World Map
// screen's transform (scale applied to the whole map, then pan in the map's
// own pre-scale units — the same model dragPan/clampPan already use, see
// mapZoom.js). `view` is the SVG's own viewBox ({ x, y, width, height } —
// data/worldMap.js's MAP_W and ExploreMap's cropped inhabited-band height);
// `box` is the actual on-screen box the map renders into (WorldMapScreen's
// boxSizeRef, from onLayout) — needed because pan lives in box-pixel units,
// not viewBox units, and the two only match when the box is exactly
// view-sized. `margin` inflates the fit slightly so edge countries aren't
// flush against the frame. Falls back to the full, unzoomed view when the
// region has no mapped countries or the box hasn't been measured yet.
export function regionView(bounds, view, box, min, max, margin = 1.15) {
  if (!bounds || box.width <= 0 || box.height <= 0) {
    return { scale: 1, pan: { x: 0, y: 0 } };
  }

  const boundsW = Math.max(bounds.maxX - bounds.minX, 1);
  const boundsH = Math.max(bounds.maxY - bounds.minY, 1);
  // viewBox units -> box pixels at scale 1 (preserveAspectRatio="meet").
  const boxScale = Math.min(box.width / view.width, box.height / view.height);
  const fitScale =
    Math.min(box.width / (boundsW * boxScale), box.height / (boundsH * boxScale)) / margin;
  const scale = clampScale(fitScale, min, max);

  const cx = (bounds.minX + bounds.maxX) / 2;
  const cy = (bounds.minY + bounds.maxY) / 2;
  const viewCx = view.x + view.width / 2;
  const viewCy = view.y + view.height / 2;
  // Box-pixel offset between the region's center and the viewBox's own
  // center, in the pre-scale space clampPan expects.
  const pan = { x: (viewCx - cx) * boxScale, y: (viewCy - cy) * boxScale };

  return { scale, pan: clampPan(pan, scale, box.width, box.height) };
}
