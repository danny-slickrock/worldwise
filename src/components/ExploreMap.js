/* global setTimeout, clearTimeout */
import React, { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import Svg, { Rect, Path, Circle, Text as SvgText } from "react-native-svg";
import { COUNTRY_PATHS, MAP_W } from "../data/worldMap";
import { countryName } from "../data/countries";
import { map } from "../theme";
import { smallCountryHitTargets, countryCentroids } from "../game/mapHitTargets";
import {
  MAP_SMALL_COUNTRY_MAX_SIZE,
  MAP_SMALL_HIT_RADIUS,
  MAP_TAP_LABEL_DELAY_MS,
  MAP_TAP_LABEL_FONT_SIZE,
} from "../constants";

// The World Map explore screen's answer surface (M2.3 step 1): every country
// with map data renders as a tappable shape, opening its country page.
// Unlike the Locator's WorldMap (candidates + correct/wrong answer state),
// there's no round here — every shape behaves the same, it's just a way to
// browse the world.
//
// Same platform tap-handling split as WorldMap.js: react-native-svg <Path>
// onPress goes through RN's responder system, which a surrounding
// ScrollView/View steals on web, so web binds a real DOM onClick instead.
function pickHandler(code, onTap) {
  return Platform.OS === "web" ? { onClick: () => onTap(code) } : { onPress: () => onTap(code) };
}

// Hover is web-only (M2.3 step 3a) — touch has no equivalent, and these
// handlers never fire on native — so it's a plain onMouseEnter/onMouseLeave
// pair rather than anything routed through RN's responder system.
const HOVER_HANDLERS_SUPPORTED = Platform.OS === "web";
const HOVER_STYLE = { cursor: "pointer" };

// Same inhabited-band crop as the Locator's map (see WorldMap.js), so the two
// views read as the same instrument at different zoom levels.
const VIEW_TOP = 22;
const VIEW_HEIGHT = 290;
const VIEWBOX = `0 ${VIEW_TOP} ${MAP_W} ${VIEW_HEIGHT}`;

// Exported so WorldMapScreen's region picker (M2.3 step 5.2) can feed this
// exact viewBox into mapRegions.js's regionView() — it has to match what's
// actually rendered here, or the computed scale/pan would frame the wrong
// crop of the map.
export const EXPLORE_MAP_VIEW = { x: 0, y: VIEW_TOP, width: MAP_W, height: VIEW_HEIGHT };

const ALL_CODES = Object.keys(COUNTRY_PATHS);

// Computed once from the static path data (M2.3 step 3.2) — see
// game/mapHitTargets.js for why only the smallest countries qualify.
const SMALL_HIT_TARGETS = smallCountryHitTargets(
  COUNTRY_PATHS,
  MAP_SMALL_COUNTRY_MAX_SIZE,
  MAP_SMALL_HIT_RADIUS
);

// Every country's own bounding-box center (M2.3 step 3.3), computed once —
// anchors the tap label regardless of whether the tap landed on the real
// shape or an enlarged small-country hit circle.
const CENTROIDS = countryCentroids(COUNTRY_PATHS);

export default function ExploreMap({ onSelect }) {
  const [hoveredCode, setHoveredCode] = useState(null);
  // The tapped country's name floats at its centroid for MAP_TAP_LABEL_DELAY_MS
  // before onSelect actually opens its page — a beat that confirms what was
  // tapped instead of cutting away instantly.
  const [tapped, setTapped] = useState(null);
  const tapTimer = useRef(null);
  useEffect(() => () => clearTimeout(tapTimer.current), []);

  const handleTap = (code) => {
    setTapped(code);
    clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => onSelect(code), MAP_TAP_LABEL_DELAY_MS);
  };

  return (
    <Svg viewBox={VIEWBOX} width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
      {/* Lit land on deep water, matching the Locator's map exactly: on the dark
          UI the reverse (navy land on a lighter ocean) inverts the figure and
          the continents stop reading as the subject. */}
      <Rect x="0" y={VIEW_TOP} width={MAP_W} height={VIEW_HEIGHT} fill={map.ocean} />
      {ALL_CODES.map((code) => (
        <Path
          key={code}
          d={COUNTRY_PATHS[code]}
          // Same accent the Locator uses for a live candidate — the shape
          // under the cursor (or the one just tapped, on touch devices with
          // no hover) reads as "about to be tapped" before it is.
          fill={code === hoveredCode || code === tapped ? map.landActive : map.land}
          stroke={map.border}
          strokeWidth={0.4}
          style={HOVER_HANDLERS_SUPPORTED ? HOVER_STYLE : undefined}
          {...pickHandler(code, handleTap)}
          {...(HOVER_HANDLERS_SUPPORTED
            ? { onMouseEnter: () => setHoveredCode(code), onMouseLeave: () => setHoveredCode(null) }
            : null)}
        />
      ))}
      {/* Invisible, oversized tap targets for the smallest countries, layered
          on top so they win the hit test over whatever larger neighbor they
          overlap — the real (tiny) shape still carries the visible fill, keyed
          off the same hoveredCode/handleTap. */}
      {Object.entries(SMALL_HIT_TARGETS).map(([code, { cx, cy, r }]) => (
        <Circle
          key={`hit-${code}`}
          cx={cx}
          cy={cy}
          r={r}
          fill="transparent"
          {...pickHandler(code, handleTap)}
          {...(HOVER_HANDLERS_SUPPORTED
            ? { onMouseEnter: () => setHoveredCode(code), onMouseLeave: () => setHoveredCode(null) }
            : null)}
        />
      ))}
      {/* The tap label (M2.3 step 3.3): drawn last so it sits above every
          shape, anchored on the tapped country's own centroid. A dark stroke
          under the fill keeps it legible over both land and water. Lives
          inside the same <Svg> the pan/zoom transform wraps, so it tracks
          the map instead of needing its own position math. */}
      {tapped && (
        <SvgText
          x={CENTROIDS[tapped].cx}
          y={CENTROIDS[tapped].cy}
          textAnchor="middle"
          fontSize={MAP_TAP_LABEL_FONT_SIZE}
          fontWeight="bold"
          fill={map.onMap}
          stroke={map.border}
          strokeWidth={0.5}
        >
          {countryName(tapped)}
        </SvgText>
      )}
    </Svg>
  );
}
