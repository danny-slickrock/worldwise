// The deliberate zoom affordance on a globe: a frosted + / − pair.
//
// Every globe zooms by pinch on touch. On the web an EMBEDDED globe (inside a
// scrolling page) can't take the plain wheel without trapping the page's
// scroll, so it zooms on ⌘/ctrl+wheel and trackpad pinch — and these buttons
// are the discoverable, accessible way that never fights the page at all.
// Glass on the map's dark stage (tone="map"), like the basemap toggle.
import React from "react";
import { Pressable, Text, StyleSheet } from "react-native";
import Glass from "./Glass";
import { map, spacing, radius, type, hitTarget, themed } from "../theme";

export default function GlobeZoomControls({ globe, style }) {
  if (!globe?.zoomBy) return null;
  return (
    <Glass tone="map" highlight={false} style={[styles.wrap, style]}>
      <Pressable
        onPress={() => globe.zoomBy(1)}
        disabled={!globe.canZoomIn}
        style={[styles.btn, !globe.canZoomIn && styles.off]}
        accessibilityRole="button"
        accessibilityLabel="Zoom in"
      >
        <Text style={styles.glyph}>+</Text>
      </Pressable>
      <Pressable
        onPress={() => globe.zoomBy(-1)}
        disabled={!globe.canZoomOut}
        style={[styles.btn, !globe.canZoomOut && styles.off]}
        accessibilityRole="button"
        accessibilityLabel="Zoom out"
      >
        <Text style={styles.glyph}>−</Text>
      </Pressable>
    </Glass>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    wrap: {
      position: "absolute",
      right: spacing(3),
      bottom: spacing(3),
      borderRadius: radius.sheet,
      overflow: "hidden",
    },
    // react-native-web ignores hitSlop on Pressable: the box IS the target.
    btn: {
      width: hitTarget.touch,
      height: hitTarget.touch,
      alignItems: "center",
      justifyContent: "center",
    },
    off: { opacity: 0.4 },
    // Parchment on the map's own nightwood plate — the map's permitted ink.
    glyph: { ...type.h3, fontSize: 22, lineHeight: 24, color: map.onMap },
  })
);
