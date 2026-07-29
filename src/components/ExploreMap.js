import React from "react";
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

// Same inhabited-band crop as the Locator's map (see WorldMap.js), so the two
// views read as the same instrument at different zoom levels.
const VIEW_TOP = 22;
const VIEW_HEIGHT = 290;
const VIEWBOX = `0 ${VIEW_TOP} ${MAP_W} ${VIEW_HEIGHT}`;

const ALL_CODES = Object.keys(COUNTRY_PATHS);

export default function ExploreMap({ onSelect }) {
  return (
    <Svg viewBox={VIEWBOX} width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
      <Rect x="0" y={VIEW_TOP} width={MAP_W} height={VIEW_HEIGHT} fill={colors.surfaceAlt} />
      {ALL_CODES.map((code) => (
        <Path
          key={code}
          d={COUNTRY_PATHS[code]}
          fill={colors.navy}
          stroke={colors.surface}
          strokeWidth={0.4}
          {...pickHandler(code, onSelect)}
        />
      ))}
    </Svg>
  );
}
