// Achievements screen (M2.5 step 2) — proves the navigation seam: reachable at
// /achievements, owned by the Profile tab, same Back behavior as every other
// pushed route.
//
// Deliberately minimal, mirroring how M2.4 step 3 kept LearningPathScreen a
// plain node list before its step 4 hero pass: this renders the badge catalog
// (src/data/achievements.js) as-is, with no locked/unlocked state yet. Wiring
// in computeAchievements() (src/game/achievementPolicy.js, already built in
// step 1) plus progress bars toward each threshold is step 3's hero-screen
// work, not this one's.
import React from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { colors, spacing, radius, type, elevation, constrain } from "../theme";
import FadeInUp, { staggerDelay } from "../components/FadeInUp";
import { ACHIEVEMENTS } from "../data/achievements";

export default function AchievementsScreen({ onExit }) {
  return (
    <View style={styles.wrap}>
      {onExit && (
        <Pressable onPress={onExit} hitSlop={12} style={styles.back}>
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>
      )}

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <FadeInUp>
          <View style={styles.header}>
            <Text style={styles.title}>Achievements</Text>
            <Text style={styles.subtitle}>{ACHIEVEMENTS.length} badges to earn</Text>
          </View>
        </FadeInUp>

        {ACHIEVEMENTS.map((badge, index) => (
          <FadeInUp key={badge.slug} delay={staggerDelay(index)}>
            <View style={styles.row}>
              <Text style={styles.glyph}>{badge.glyph}</Text>
              <View style={styles.rowBody}>
                <Text style={styles.rowLabel}>{badge.label}</Text>
                <Text style={styles.rowDescription}>{badge.description}</Text>
              </View>
            </View>
          </FadeInUp>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.surface },
  back: {
    ...constrain.content,
    paddingHorizontal: spacing(5),
    paddingTop: spacing(4),
    paddingBottom: spacing(2),
  },
  backText: { ...type.label, fontSize: 14, color: colors.accent },

  content: { paddingHorizontal: spacing(5), paddingBottom: spacing(12) },
  header: { ...constrain.content, marginBottom: spacing(4) },
  title: { ...type.h1, fontSize: 34 },
  subtitle: { ...type.eyebrow, fontSize: 11, marginTop: spacing(1.5) },

  row: {
    ...constrain.content,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.sheet,
    paddingVertical: spacing(3.5),
    paddingHorizontal: spacing(4),
    marginBottom: spacing(2.5),
    ...elevation(1),
  },
  glyph: { fontSize: 26, color: colors.brand, marginRight: spacing(3.5), width: 32, textAlign: "center" },
  rowBody: { flex: 1 },
  rowLabel: { ...type.body, color: colors.brand },
  rowDescription: { ...type.caption, fontSize: 13, marginTop: 2 },
});
