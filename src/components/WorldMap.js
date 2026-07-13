import React from "react";
import Svg, { Rect, Path } from "react-native-svg";
import { COUNTRY_PATHS, MAP_W } from "../data/worldMap";
import { colors } from "../theme";

// The Country Locator's answer surface. Draws the whole world as inert land for
// context, then paints the round's candidate countries as tappable targets.
//
// Uses react-native-svg's <Path> primitive (not <SvgUri>), so tap handling works
// identically on web and native — unlike the remote-SVG loader, which the web
// build omits (see CountryOutline.js). Geometry is pre-projected to a plain
// equirectangular grid in worldMap.js, so nothing projects at runtime.

// Crop the full 720×360 grid to the inhabited band (roughly +79°…−56° latitude),
// dropping the empty polar margins so the map fills its box.
const VIEW_TOP = 22;
const VIEW_HEIGHT = 290;
const LOCATOR_VIEWBOX = `0 ${VIEW_TOP} ${MAP_W} ${VIEW_HEIGHT}`;

const ALL_CODES = Object.keys(COUNTRY_PATHS);

export default function WorldMap({ choices, correctCode, pickedCode, answered, onPick }) {
  const candidateCodes = new Set(choices.map((c) => c.code));

  // Fill for a candidate country once the question is answered.
  const resolvedFill = (code) => {
    if (code === correctCode) return colors.success;
    if (code === pickedCode) return colors.error; // the player's wrong pick
    return colors.muted; // other candidates, now dimmed
  };

  return (
    <Svg viewBox={LOCATOR_VIEWBOX} width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
      {/* Ocean */}
      <Rect x="0" y={VIEW_TOP} width={MAP_W} height={VIEW_HEIGHT} fill={colors.surfaceAlt} />

      {/* Inert land — every country, for geographic context */}
      {ALL_CODES.map((code) =>
        candidateCodes.has(code) ? null : (
          <Path key={code} d={COUNTRY_PATHS[code]} fill={colors.line} stroke={colors.surface} strokeWidth={0.4} />
        )
      )}

      {/* Candidate countries — the tappable targets, drawn on top */}
      {choices.map(({ code }) => (
        <Path
          key={code}
          d={COUNTRY_PATHS[code]}
          fill={answered ? resolvedFill(code) : colors.navy}
          stroke={colors.surface}
          strokeWidth={0.6}
          onPress={answered ? undefined : () => onPick(code)}
        />
      ))}
    </Svg>
  );
}
