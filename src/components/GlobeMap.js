/* global setTimeout, clearTimeout */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";
import Svg, { Circle, Path, Text as SvgText } from "react-native-svg";
import { COUNTRY_RINGS, COUNTRY_CENTERS, GLOBE_COUNTRY_CODES } from "../data/worldGeo";
import { countryName } from "../data/countries";
import { colors } from "../theme";
import { orientation, rotate, toScreen, projectCountry, isVisible } from "../game/globeProjection";
import { angleBetween } from "../game/globeMotion";
import {
  GLOBE_VIEW_SIZE,
  GLOBE_BASE_RADIUS,
  GLOBE_BORDER_WIDTH,
  GLOBE_SMALL_COUNTRY_MAX_DEGREES,
  GLOBE_SMALL_HIT_RADIUS,
  MAP_TAP_LABEL_DELAY_MS,
  MAP_TAP_LABEL_FONT_SIZE,
} from "../constants";

// The globe (M2.3.7) — the Explore surface's replacement for the flat
// ExploreMap. Every country facing the viewer is a real, tappable SVG <Path>,
// exactly as before; what changed is that the path data is recomputed for the
// current orientation instead of being a fixed string.
//
// Two properties fall out of drawing the sphere into a FIXED viewBox and
// growing its radius with zoom, rather than scaling the canvas:
//   · Borders and labels keep a constant on-screen thickness at every zoom.
//     The flat map had the opposite problem — a scaled canvas fattens its own
//     strokes as it zooms in.
//   · The back of the globe is genuinely absent, not hidden. projectRing()
//     returns null for a ring that faces away, so those countries emit no
//     <Path> at all and can't be tapped through the sphere.
const VIEWBOX = `0 0 ${GLOBE_VIEW_SIZE} ${GLOBE_VIEW_SIZE}`;
const CENTER = GLOBE_VIEW_SIZE / 2;

// Same platform tap-handling split as ExploreMap/WorldMap: react-native-svg's
// onPress rides RN's responder system, which a surrounding View steals on web,
// so web binds a real DOM onClick instead.
function pickHandler(code, onTap) {
  return Platform.OS === "web" ? { onClick: () => onTap(code) } : { onPress: () => onTap(code) };
}

const HOVER_HANDLERS_SUPPORTED = Platform.OS === "web";
const HOVER_STYLE = { cursor: "pointer" };

// Which countries are too small to tap reliably, measured once in ANGULAR
// terms — the widest arc from a country's center to its own outline. Degrees,
// not pixels, because a country's pixel size now changes with both zoom and
// where it sits on the disc (foreshortening squashes everything near the
// limb), while its angular size never changes.
const SMALL_COUNTRIES = GLOBE_COUNTRY_CODES.filter((code) => {
  const center = COUNTRY_CENTERS[code];
  if (!center) return false;
  let widest = 0;
  for (const ring of COUNTRY_RINGS[code]) {
    for (let i = 0; i < ring.length; i += 3) {
      widest = Math.max(widest, angleBetween(center, [ring[i], ring[i + 1], ring[i + 2]]));
      if (widest > GLOBE_SMALL_COUNTRY_MAX_DEGREES) return false;
    }
  }
  return true;
});

export default function GlobeMap({ spin, zoom = 1, onSelect }) {
  const [hoveredCode, setHoveredCode] = useState(null);
  const [tapped, setTapped] = useState(null);
  const tapTimer = useRef(null);
  useEffect(() => () => clearTimeout(tapTimer.current), []);

  const handleTap = (code) => {
    setTapped(code);
    clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => onSelect(code), MAP_TAP_LABEL_DELAY_MS);
  };

  // The whole projection for this frame. Memoized on orientation and zoom
  // alone: hovering or tapping changes only fills, so it must not pay for a
  // reprojection of all 8,190 points.
  const { paths, radius, centers } = useMemo(() => {
    const o = orientation(spin.lng, spin.lat);
    const r = GLOBE_BASE_RADIUS * zoom;
    const view = { cx: CENTER, cy: CENTER, radius: r };

    const drawn = [];
    for (const code of GLOBE_COUNTRY_CODES) {
      const d = projectCountry(COUNTRY_RINGS[code], o, view);
      if (d) drawn.push([code, d]);
    }

    // Projected centers, for the tap label and the small-country hit circles.
    // Only for countries actually facing us — a center behind the horizon
    // would otherwise anchor a label on the wrong side of the world.
    const centerPoints = {};
    for (const code of GLOBE_COUNTRY_CODES) {
      const c = COUNTRY_CENTERS[code];
      if (!c) continue;
      const v = rotate(c, o);
      if (isVisible(v[2])) centerPoints[code] = toScreen(v, view);
    }

    return { paths: drawn, radius: r, centers: centerPoints };
  }, [spin.lng, spin.lat, zoom]);

  return (
    <Svg viewBox={VIEWBOX} width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
      {/* The ocean is the sphere itself, so the globe reads as an object with
          an edge rather than as land floating on a panel. Same lit-land-on-deep-
          water relationship the flat map uses, just bounded by a circle. */}
      <Circle cx={CENTER} cy={CENTER} r={radius} fill={colors.navyDeep} />

      {paths.map(([code, d]) => (
        <Path
          key={code}
          d={d}
          fill={code === hoveredCode || code === tapped ? colors.teal : colors.surfaceAlt}
          // Borders in the ocean's own color, so every country reads as its
          // own island and shared land borders are as legible as coastlines.
          stroke={colors.navyDeep}
          strokeWidth={GLOBE_BORDER_WIDTH}
          strokeLinejoin="round"
          style={HOVER_HANDLERS_SUPPORTED ? HOVER_STYLE : undefined}
          {...pickHandler(code, handleTap)}
          {...(HOVER_HANDLERS_SUPPORTED
            ? { onMouseEnter: () => setHoveredCode(code), onMouseLeave: () => setHoveredCode(null) }
            : null)}
        />
      ))}

      {/* Enlarged invisible tap targets for the countries too small to hit,
          placed on this frame's projected center and only while they face us. */}
      {SMALL_COUNTRIES.map((code) =>
        centers[code] ? (
          <Circle
            key={`hit-${code}`}
            cx={centers[code][0]}
            cy={centers[code][1]}
            r={GLOBE_SMALL_HIT_RADIUS}
            fill="transparent"
            {...pickHandler(code, handleTap)}
            {...(HOVER_HANDLERS_SUPPORTED
              ? { onMouseEnter: () => setHoveredCode(code), onMouseLeave: () => setHoveredCode(null) }
              : null)}
          />
        ) : null
      )}

      {/* Tap confirmation, drawn last so it sits above every shape. Skipped if
          the country has spun out of view mid-delay, which would otherwise
          strand its name over open ocean. */}
      {tapped && centers[tapped] && (
        <SvgText
          x={centers[tapped][0]}
          y={centers[tapped][1]}
          textAnchor="middle"
          fontSize={MAP_TAP_LABEL_FONT_SIZE}
          fontWeight="bold"
          fill={colors.headline}
          stroke={colors.navyDeep}
          strokeWidth={0.5}
        >
          {countryName(tapped)}
        </SvgText>
      )}
    </Svg>
  );
}
