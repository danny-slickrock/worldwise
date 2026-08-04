// Pure geometry for the World Map's tap affordance polish (M2.3 step 3.2):
// tiny countries (Luxembourg, Vatican-scale states, small islands) render as
// only a handful of viewBox units, far below anything reliably tappable at
// the map's default (unzoomed) fit. No RN/DOM imports, so test/engine.test.js
// can exercise it directly under tsx.
//
// COUNTRY_PATHS only ever uses M/L/Z (see scripts/build-worldmap.mjs), so
// every number in the string is one half of an x/y point pair.
export function pathBounds(d) {
  const nums = d.match(/-?\d+\.?\d*/g).map(Number);
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (let i = 0; i < nums.length; i += 2) {
    const x = nums[i];
    const y = nums[i + 1];
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
}

// A country counts as "small" when its longest bounding-box side is under
// maxSize (viewBox units) — reserved for the long tail of micro-states, not
// merely-smallish countries the existing pinch-zoom already lets you tap into.
// Returns { code: { cx, cy, r } } — an invisible circle, centered on the
// shape's own bounding box, sized to hitRadius regardless of how much smaller
// the real shape is.
export function smallCountryHitTargets(countryPaths, maxSize, hitRadius) {
  const targets = {};
  for (const code of Object.keys(countryPaths)) {
    const b = pathBounds(countryPaths[code]);
    const longestSide = Math.max(b.maxX - b.minX, b.maxY - b.minY);
    if (longestSide < maxSize) targets[code] = { cx: b.cx, cy: b.cy, r: hitRadius };
  }
  return targets;
}

// Every country's own bounding-box center (M2.3 step 3.3) — anchors the tap
// label near whichever country was actually tapped, whether the tap landed on
// its real shape or on one of the small-country hit circles above.
export function countryCentroids(countryPaths) {
  const centroids = {};
  for (const code of Object.keys(countryPaths)) {
    const { cx, cy } = pathBounds(countryPaths[code]);
    centroids[code] = { cx, cy };
  }
  return centroids;
}
