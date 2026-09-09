// The Worldwise mark, drawn rather than loaded.
//
// The brand kit ships the logo as PNGs and admits they soften above ~150px.
// This renders the same artwork from `game/brandMark.js`'s geometry, so it is
// crisp at 1024 and legible at 16, tints to any of the three sanctioned tones
// without a second file, and — the part a PNG can never do — comes apart.
//
// COMING APART IS THE POINT. A compass has a fixed globe and a needle that
// turns inside it, so `parts` splits the mark into exactly those two layers:
//
//   parts="globe"   ring + graticule — the instrument's housing, always still
//   parts="needle"  star + pivot dot — the part that swings
//   parts="all"     both, as one static mark (the default)
//
// SpinningMark stacks the two and rotates only the needle. That reads as an
// instrument settling on a bearing; rotating the whole mark reads as a spinner
// with a logo in it, which is what every other app does.
//
// Level of detail is NOT a prop. The kit forbids downscaling the full artwork
// below 32px, so the size decides — see markDetail() in game/brandMark.js.
import React from "react";
import { View } from "react-native";
import Svg, { Circle, Path, Polygon, G } from "react-native-svg";
import {
  MARK_VIEWBOX,
  MARK_MIN_SIZE,
  markDetail,
  starPoints,
  dotRadius,
  ringWidth,
  hasRing,
  hasGraticule,
  graticuleArcs,
  markTone,
  RING_RADIUS,
} from "../game/brandMark";

const CENTER = MARK_VIEWBOX / 2;
const ARCS = graticuleArcs();

// Points as SVG's space-separated pair list.
function polygonPoints(detail) {
  return starPoints(detail)
    .map(([x, y]) => `${x},${y}`)
    .join(" ");
}

export default function CompassMark({
  size = 40,
  // A tone name ("pine" | "cream" | "brass") or a single colour to flatten the
  // whole mark to — see markTone().
  tone = "pine",
  parts = "all",
  // Overrides the size-derived level of detail. Only for a rasterizer or a
  // deliberate showcase; leaving it alone is what keeps the kit's rule.
  detail: detailOverride = null,
  style,
  ...rest
}) {
  // Never render below the kit's icon minimum. Clamping is quieter than
  // throwing and matches how the rest of the system degrades.
  const px = Math.max(size, MARK_MIN_SIZE);
  const detail = detailOverride ?? markDetail(px);
  const c = markTone(tone);

  const showGlobe = parts === "all" || parts === "globe";
  const showNeedle = parts === "all" || parts === "needle";

  return (
    <View
      style={[{ width: px, height: px }, style]}
      accessible={false}
      // The mark is decoration wherever it appears beside the name; Wordmark
      // and any standalone use label themselves.
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      {...rest}
    >
      <Svg width={px} height={px} viewBox={`0 0 ${MARK_VIEWBOX} ${MARK_VIEWBOX}`}>
        {showGlobe && hasRing(detail) && (
          <G>
            <Circle
              cx={CENTER}
              cy={CENTER}
              r={RING_RADIUS}
              fill="none"
              stroke={c.ring}
              strokeWidth={ringWidth(detail)}
            />
            {hasGraticule(detail) &&
              ARCS.map((d) => (
                <Path
                  key={d}
                  d={d}
                  fill="none"
                  stroke={c.graticule}
                  strokeWidth={2}
                  strokeLinecap="round"
                />
              ))}
          </G>
        )}

        {showNeedle && (
          <G>
            <Polygon points={polygonPoints(detail)} fill={c.star} />
            <Circle cx={CENTER} cy={CENTER} r={dotRadius(detail)} fill={c.dot} />
          </G>
        )}
      </Svg>
    </View>
  );
}
