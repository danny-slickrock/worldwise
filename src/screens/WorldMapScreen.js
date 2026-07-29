// World Map explore screen (M2.3 step 1) — the first cut of the interactive
// map: every country with map data is tappable, opening its country page via
// the same overlay seam the country index uses. Static for now (no pan/zoom —
// that's M2.3 step 2). Reachable from Home.
import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { colors, spacing, radius, type } from "../theme";
import ExploreMap from "../components/ExploreMap";

export default function WorldMapScreen({ onExit, onOpenCountry }) {
  return (
    <View style={styles.wrap}>
      <Pressable onPress={onExit} hitSlop={12} style={styles.back}>
        <Text style={styles.backText}>‹ Back</Text>
      </Pressable>

      <View style={styles.header}>
        <Text style={styles.title}>World Map</Text>
        <Text style={styles.subtitle}>Tap a country to explore it</Text>
      </View>

      <View style={styles.mapWrap}>
        <ExploreMap onSelect={onOpenCountry} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  back: { paddingHorizontal: spacing(3), paddingTop: spacing(2), paddingBottom: spacing(1) },
  backText: { ...type.body, color: colors.teal, fontWeight: "700" },

  header: { paddingHorizontal: spacing(3), marginBottom: spacing(2) },
  title: { ...type.hero, fontSize: 32 },
  subtitle: { ...type.muted, marginTop: spacing(0.5) },

  mapWrap: {
    flex: 1,
    marginHorizontal: spacing(2),
    marginBottom: spacing(3),
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: colors.surfaceAlt,
  },
});
