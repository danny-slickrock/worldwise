// Achievements screen (M2.5 step 3 hero pass) — reachable at /achievements,
// owned by the Profile tab, same Back behavior as every other pushed route.
//
// Step 2 rendered the badge catalog as-is with no unlocked state. This wires
// in computeAchievements() (src/game/achievementPolicy.js, built in step 1)
// against the player's real progress + round history, so each badge shows
// locked/unlocked and — for a locked badge — a progress bar toward its
// threshold. `fetchRoundResults(user)` is the same M2.4 built for the
// learning-path mastery screen; reused here rather than adding a second
// per-round fetch. Mirrors LearningPathScreen's own hydrate-then-render shape,
// including the "couldn't load progress" notice for a signed-in player whose
// fetch failed — local storage keeps no per-round history, so an empty result
// looks identical to "no rounds yet" and would otherwise mislabel every badge
// that depends on round data as un-earned.
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { colors, spacing, radius, type, elevation, constrain } from "../theme";
import FadeInUp, { staggerDelay } from "../components/FadeInUp";
import { computeAchievements } from "../game/achievementPolicy";
import { useAuth } from "../auth/AuthProvider";
import { fetchRoundResults } from "../storage/cloudProgress";

export default function AchievementsScreen({ onExit, progress }) {
  const { user } = useAuth();
  const [results, setResults] = useState([]);
  const [resultsError, setResultsError] = useState(false);

  useEffect(() => {
    let active = true;
    setResultsError(false);
    fetchRoundResults(user).then(({ rows, error }) => {
      if (!active) return;
      setResults(rows);
      setResultsError(Boolean(error));
    });
    return () => {
      active = false;
    };
  }, [user]);

  const badges = computeAchievements(progress, results);
  const unlockedCount = badges.filter((b) => b.unlocked).length;

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
            <Text style={styles.subtitle}>
              {unlockedCount} of {badges.length} unlocked
            </Text>
            {resultsError && user && (
              <Text style={styles.noticeText}>
                ⚠ Couldn't load your progress — showing offline defaults.
              </Text>
            )}
          </View>
        </FadeInUp>

        {badges.map((badge, index) => (
          <FadeInUp key={badge.slug} delay={staggerDelay(index)}>
            <View style={[styles.row, !badge.unlocked && styles.rowLocked]}>
              <Text style={[styles.glyph, !badge.unlocked && styles.glyphLocked]}>
                {badge.glyph}
              </Text>
              <View style={styles.rowBody}>
                <Text style={[styles.rowLabel, !badge.unlocked && styles.rowLabelLocked]}>
                  {badge.label}
                </Text>
                <Text style={styles.rowDescription}>{badge.description}</Text>
                {badge.unlocked ? (
                  <Text style={styles.unlockedText}>Unlocked ✓</Text>
                ) : (
                  <View style={styles.progressRow}>
                    <View style={styles.progressTrack}>
                      <View
                        style={[styles.progressFill, { width: `${badge.progress * 100}%` }]}
                      />
                    </View>
                    <Text style={styles.progressText}>
                      {Math.min(badge.value, badge.threshold)}/{badge.threshold}
                    </Text>
                  </View>
                )}
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
  noticeText: { ...type.caption, fontSize: 13, color: colors.danger, marginTop: spacing(2) },

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
  rowLocked: { opacity: 0.75 },
  glyph: { fontSize: 26, color: colors.brand, marginRight: spacing(3.5), width: 32, textAlign: "center" },
  glyphLocked: { color: colors.textMuted },
  rowBody: { flex: 1 },
  rowLabel: { ...type.body, color: colors.brand },
  rowLabelLocked: { color: colors.text },
  rowDescription: { ...type.caption, fontSize: 13, marginTop: 2 },
  unlockedText: {
    ...type.label,
    fontSize: 11,
    color: colors.success,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: spacing(1.5),
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing(2),
  },
  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSunken,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
  },
  progressText: {
    ...type.label,
    fontSize: 11,
    color: colors.textMuted,
    marginLeft: spacing(2),
  },
});
