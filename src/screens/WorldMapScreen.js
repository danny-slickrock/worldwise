// World Map explore screen (M2.3 step 1) — the first cut of the interactive
// map: every country with map data is tappable, opening its country page via
// the same overlay seam the country index uses. Static for now (no pan/zoom —
// that's M2.3 step 2). Reachable from Home.
import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { colors, spacing, radius, type, depth } from "../theme";
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
  back: { paddingHorizontal: spacing(2.5), paddingTop: spacing(2), paddingBottom: spacing(1) },
  backText: { ...type.pill, fontSize: 14, color: colors.teal },

  header: { paddingHorizontal: spacing(2.5), marginBottom: spacing(2) },
  title: { ...type.hero, fontSize: 34 },
  subtitle: { ...type.section, fontSize: 11, marginTop: spacing(0.75) },

  // The map stage is deep navy everywhere it appears (see QuizScreen's mapBox),
  // so the world reads as the lit subject rather than as chrome.
  mapWrap: {
    flex: 1,
    marginHorizontal: spacing(2.5),
    marginBottom: spacing(3),
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: colors.navy,
    ...depth(5),
  },
});
