// The globe inset on a country page: this country, highlighted, in the context
// of the world around it.
//
// A flat outline answers "what shape is it?". The country page's actual
// question is "where is this, and what is it next to?" — which is the thing an
// outline on a navy card cannot say. Spinning the globe to the country and
// lighting it up answers both at once: the silhouette is still there, now with
// its neighbours, its coastline, and its climate band around it.
//
// Framing reuses exactly what the Explore map's "View on map" link does:
// groupSpin for direction, and countryAngularRadius (NOT groupZoom) for the
// zoom — groupZoom compares countries' centres against each other, so a lone
// country reads as a zero-width point and always zooms to max, whether it is
// Russia or the Vatican.
import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import GlobeMap from "./GlobeMap";
import useGlobeGestures from "../hooks/useGlobeGestures";
import { COUNTRY_CENTERS, COUNTRY_RINGS, GLOBE_COUNTRY_CODES } from "../data/worldGeo";
import { groupSpin, countryAngularRadius, zoomForRadius } from "../game/globeMotion";
import { MAP_ZOOM_MIN, MAP_ZOOM_MAX } from "../constants";
import { colors, spacing, radius as radii, type, map } from "../theme";

const HAS_GEOMETRY = new Set(GLOBE_COUNTRY_CODES);

// Where the globe opens for one country. Resolved outside the component so a
// re-render never recomputes it, and so `null` (a country the 110m dataset has
// no polygon for) is a plain falsy check at the call site.
export function framingFor(code) {
  if (!code || !HAS_GEOMETRY.has(code)) return null;
  const spin = groupSpin([code], COUNTRY_CENTERS);
  if (!spin) return null;
  const angular = countryAngularRadius(COUNTRY_RINGS[code], COUNTRY_CENTERS[code]);
  return { spin, zoom: zoomForRadius(angular, { min: MAP_ZOOM_MIN, max: MAP_ZOOM_MAX }) };
}

export default function CountryGlobe({ code, name, framing }) {
  // Drag to spin, but NOT wheel to zoom. This globe sits in a scrolling page,
  // and the wheel handler has to preventDefault to zoom — which would trap the
  // page's scroll every time the pointer crossed the hero. Spinning is the part
  // that teaches something here; zooming is what "View on map" is for.
  const globe = useGlobeGestures({
    initialSpin: framing.spin,
    initialZoom: framing.zoom,
    wheelZoomEnabled: false,
    onManualChange: () => setMoved(true),
  });
  const [moved, setMoved] = React.useState(false);

  return (
    <View style={styles.stage} {...globe.surfaceProps}>
      {/* onSelect is deliberately absent: this is the country's own page, so
          tapping another country to navigate away from it would be a surprise.
          GlobeMap treats a missing handler as scenery. */}
      <GlobeMap spin={globe.spin} zoom={globe.zoom} highlightCode={code} />
      {moved ? (
        <Pressable
          onPress={() => globe.animateTo(framing.zoom, framing.spin)}
          hitSlop={8}
          style={styles.pill}
        >
          <Text style={styles.pillText}>Back to {name}</Text>
        </Pressable>
      ) : (
        <Text style={styles.hint} pointerEvents="none">
          Drag to spin
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // No padding: the globe is the card, edge to edge, the way the Explore map's
  // stage is. The outline hero needed padding because a flat silhouette floating
  // on navy needs a margin; a sphere brings its own.
  stage: {
    width: "100%",
    height: 260,
    backgroundColor: colors.brandDeep,
    borderRadius: radii.sheet,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  hint: {
    ...type.data,
    alignSelf: "center",
    marginBottom: spacing(3),
    color: map.onMapMuted,
  },
  pill: {
    position: "absolute",
    right: spacing(3),
    bottom: spacing(3),
    backgroundColor: "rgba(22,41,63,0.82)",
    borderRadius: radii.pill,
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(3.5),
  },
  pillText: { ...type.label, fontSize: 12, color: map.onMap },
});
