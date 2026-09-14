import React from "react";
import { Platform } from "react-native";
import Svg, { Rect, Path } from "react-native-svg";
import { MAP_PATHS, MAP_W } from "../data/worldMap";
import { colors, map } from "../theme";

// Bind the tap on the right event per platform. react-native-svg routes <Path>
// onPress through React Native Web's responder system, which the surrounding
// ScrollView steals on web — so onPress never fires there. On web we bind a real
// DOM onClick (passed straight through to the <path>), and keep onPress on native
// where the responder system works correctly.
function pickHandler(code, answered, onPick) {
  if (answered) return null;
  return Platform.OS === "web" ? { onClick: () => onPick(code) } : { onPress: () => onPick(code) };
}

// The Country Locator's answer surface. Draws the whole world as inert land for
// context, then paints the round's candidate countries as tappable targets.
//
// Uses react-native-svg's <Path> primitive (not <SvgUri>), so tap handling works
// identically on web and native — unlike the remote-SVG loader, which the web
// build omits (see CountryOutline.js). Geometry is pre-projected to a plain
// equirectangular grid in worldMap.js, so nothing projects at runtime.

// Crop the full 720×360 grid to the inhabited band (+84°…−66° latitude),
// dropping the empty polar margins so the map fills its box. The top used to
// sit at +79°, which cut the northern tips off Greenland, Canada and Russia.
const VIEW_TOP = 12;
const VIEW_HEIGHT = 300;

// Antarctica is the one landmass this crop deliberately leaves out. It sits
// almost entirely below the band, so it would render as a sliver pinned to the
// bottom edge — and an equirectangular projection stretches it into the largest
// thing on the map, which is the classic way a flat map miseducates. It draws
// correctly on the globe, which is where it belongs.
const OFF_BAND = new Set(["aq"]);
const LOCATOR_VIEWBOX = `0 ${VIEW_TOP} ${MAP_W} ${VIEW_HEIGHT}`;

const ALL_CODES = Object.keys(MAP_PATHS).filter((code) => !OFF_BAND.has(code));

export default function WorldMap({ choices, correctCode, pickedCode, answered, onPick }) {
  const candidateCodes = new Set(choices.map((c) => c.code));

  // Fill for a candidate country once the question is answered.
  const resolvedFill = (code) => {
    if (code === correctCode) return colors.success;
    if (code === pickedCode) return colors.danger; // the player's wrong pick
    return map.onMapMuted; // other candidates, now dimmed
  };

  return (
    <Svg viewBox={LOCATOR_VIEWBOX} width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
      {/* Ocean — the deepest token, so land and targets both read as lit on top */}
      <Rect x="0" y={VIEW_TOP} width={MAP_W} height={VIEW_HEIGHT} fill={map.ocean} />

      {/* Inert land — every country, for geographic context */}
      {ALL_CODES.map((code) =>
        candidateCodes.has(code) ? null : (
          <Path
            key={code}
            d={MAP_PATHS[code]}
            fill={map.land}
            stroke={map.border}
            strokeWidth={0.4}
          />
        )
      )}

      {/* Candidate countries — the tappable targets, drawn on top */}
      {choices.map(({ code }) => (
        <Path
          key={code}
          d={MAP_PATHS[code]}
          fill={answered ? resolvedFill(code) : map.landActive}
          stroke={map.border}
          strokeWidth={0.6}
          {...pickHandler(code, answered, onPick)}
        />
      ))}
    </Svg>
  );
}
