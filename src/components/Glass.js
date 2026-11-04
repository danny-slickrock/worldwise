// A frosted glass pane — the CHROME surface (tab bar, rail, sheets, map
// overlays). Never a card that carries reading text: those stay opaque cream,
// by decision, so body contrast stays knowable.
//
// Three layers, back to front, the way a real pane reads:
//   1. the blur of whatever is behind it (backdrop-filter on web, expo-blur's
//      BlurView on iOS/Android)
//   2. a warm tint — cream or bark, never stock neutral white/grey — opaque
//      enough that the chrome's inks clear contrast over anything (pinned in
//      test/engine.test.js against pure black and pure white)
//   3. a lit top edge, which is most of what makes a pane read as glass rather
//      than as a translucent rectangle
import React from "react";
import { View, StyleSheet, Platform } from "react-native";
import { BlurView } from "expo-blur";
import { colors, glass, activeScheme, themed, map } from "../theme";

// `tone="map"` is glass on the DARK STAGE (overlays on a globe): the same
// frosting over the map's own 72% nightwood plate, in either colour scheme —
// the map does not change with the scheme, so neither do its overlays.
export default function Glass({ style, children, highlight = true, tone = "chrome", ...rest }) {
  const scheme = tone === "map" ? "dark" : activeScheme();
  const tintStyle = tone === "map" ? styles.mapTint : styles.tint;
  if (Platform.OS === "web") {
    return (
      <View style={[styles.web, tintStyle, style]} {...rest}>
        {highlight && <View pointerEvents="none" style={styles.highlight} />}
        {children}
      </View>
    );
  }
  return (
    <BlurView
      intensity={glass.nativeIntensity}
      tint={scheme === "dark" ? "dark" : "light"}
      style={[styles.native, style]}
      {...rest}
    >
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, tintStyle]} />
      {highlight && <View pointerEvents="none" style={styles.highlight} />}
      {children}
    </BlurView>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    web: {
      // react-native-web passes these straight through to CSS.
      backdropFilter: `blur(${glass.blur}px) saturate(${glass.saturate})`,
      WebkitBackdropFilter: `blur(${glass.blur}px) saturate(${glass.saturate})`,
      overflow: "hidden",
    },
    native: { overflow: "hidden" },
    tint: { backgroundColor: colors.glassTint },
    mapTint: { backgroundColor: map.labelPlate },
    highlight: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: StyleSheet.hairlineWidth || 1,
      backgroundColor: colors.glassHighlight,
    },
  })
);
