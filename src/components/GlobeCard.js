// The globe on the front page.
//
// Home was a list of games. That is a fine games menu and a poor front door for
// a product whose whole premise is "maps are the hero" — the first thing you
// saw was a grid of buttons, and the world was two taps away behind a tab.
// This puts it first: a real, spinnable globe you can turn and tap before you
// have decided to do anything.
//
// It is the same GlobeMap and the same gesture hook as the Explore tab, not a
// picture of one — so terrain, the basemap toggle, hover tooltips and
// tap-to-open all work here exactly as they do there.
import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, useWindowDimensions } from "react-native";
import GlobeMap from "./GlobeMap";
import BasemapToggle from "./BasemapToggle";
import useGlobeGestures from "../hooks/useGlobeGestures";
import { colors, spacing, radius, type, elevation, map } from "../theme";

// Past this the globe stops being a front door and becomes the whole page.
const STAGE_MAX = 560;

export default function GlobeCard({ onOpenCountry, onOpenExplore, basemap, onChangeBasemap }) {
  const [moved, setMoved] = useState(false);

  // Drag to spin, but NOT wheel to zoom: Home scrolls, and the wheel handler
  // has to preventDefault to zoom, which would trap the page's scroll every
  // time the pointer crossed the globe. Zooming is what the Explore tab is for,
  // and the link below goes there.
  const globe = useGlobeGestures({
    wheelZoomEnabled: false,
    // A finger on an embedded globe is ambiguous. Horizontal spins it,
    // vertical scrolls the page — without this the globe eats every scroll
    // that starts on it, which on a phone is most of them.
    axisLock: true,
    onManualChange: () => setMoved(true),
  });

  // Square, so the globe is as large as the column allows: the SVG fits its
  // square viewBox to the SHORTER side, so any non-square stage was throwing
  // the difference away as empty ground. Capped on tall desktop windows, where
  // a 680px globe would push everything else below the fold.
  const { height: windowHeight } = useWindowDimensions();
  const stageHeight = Math.min(STAGE_MAX, windowHeight * 0.55);

  return (
    <View style={styles.card}>
      <View style={[styles.stage, { maxHeight: stageHeight }]} {...globe.surfaceProps}>
        <GlobeMap spin={globe.spin} zoom={globe.zoom} onSelect={onOpenCountry} basemap={basemap} />
        <BasemapToggle value={basemap} onChange={onChangeBasemap} style={styles.toggle} />
        {/* The hint retires the moment it has been obeyed — a permanent
            instruction on a control you have already used is clutter. */}
        {!moved && (
          <Text style={styles.hint} pointerEvents="none">
            Drag to spin · tap a country
          </Text>
        )}
      </View>
      {onOpenExplore && (
        <Pressable onPress={onOpenExplore} hitSlop={8} style={styles.footer}>
          <Text style={styles.footerText}>Explore the map ›</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.sheet,
    overflow: "hidden",
    backgroundColor: colors.brandDeep,
    marginBottom: spacing(6),
    ...elevation(2),
  },
  stage: { width: "100%", aspectRatio: 1 },
  toggle: { position: "absolute", left: spacing(3), top: spacing(3) },
  hint: {
    ...type.data,
    position: "absolute",
    left: 0,
    right: 0,
    bottom: spacing(3),
    textAlign: "center",
    color: map.onMapQuiet,
  },
  // Sits on the same nightwood as the globe, so the card reads as one object
  // rather than a map with a light strip stapled underneath.
  footer: {
    paddingVertical: spacing(3),
    paddingHorizontal: spacing(4),
    borderTopWidth: 1,
    borderTopColor: "rgba(244,235,217,0.12)",
    alignItems: "flex-end",
  },
  footerText: { ...type.label, color: colors.accentLight },
});
