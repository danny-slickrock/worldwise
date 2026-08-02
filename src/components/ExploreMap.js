import React, { useState } from "react";
import { Platform } from "react-native";
import Svg, { Rect, Path } from "react-native-svg";
import { COUNTRY_PATHS, MAP_W } from "../data/worldMap";
import { colors } from "../theme";

// The World Map explore screen's answer surface (M2.3 step 1): every country
// with map data renders as a tappable shape, opening its country page.
// Unlike the Locator's WorldMap (candidates + correct/wrong answer state),
// there's no round here — every shape behaves the same, it's just a way to
// browse the world.
//
// Same platform tap-handling split as WorldMap.js: react-native-svg <Path>
// onPress goes through RN's responder system, which a surrounding
// ScrollView/View steals on web, so web binds a real DOM onClick instead.
function pickHandler(code, onSelect) {
  return Platform.OS === "web" ? { onClick: () => onSelect(code) } : { onPress: () => onSelect(code) };
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

const ALL_CODES = Object.keys(COUNTRY_PATHS);

export default function ExploreMap({ onSelect }) {
  const [hoveredCode, setHoveredCode] = useState(null);

  return (
    <Svg viewBox={VIEWBOX} width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
      {/* Lit land on deep water, matching the Locator's map exactly: on the dark
          UI the reverse (navy land on a lighter ocean) inverts the figure and
          the continents stop reading as the subject. */}
      <Rect x="0" y={VIEW_TOP} width={MAP_W} height={VIEW_HEIGHT} fill={colors.navyDeep} />
      {ALL_CODES.map((code) => (
        <Path
          key={code}
          d={COUNTRY_PATHS[code]}
          // Same accent the Locator uses for a live candidate — the shape
          // under the cursor reads as "about to be tapped" before it is.
          fill={code === hoveredCode ? colors.teal : colors.surfaceAlt}
          stroke={colors.navy}
          strokeWidth={0.4}
          style={HOVER_HANDLERS_SUPPORTED ? HOVER_STYLE : undefined}
          {...pickHandler(code, onSelect)}
          {...(HOVER_HANDLERS_SUPPORTED
            ? { onMouseEnter: () => setHoveredCode(code), onMouseLeave: () => setHoveredCode(null) }
            : null)}
        />
      ))}
    </Svg>
  );
}
