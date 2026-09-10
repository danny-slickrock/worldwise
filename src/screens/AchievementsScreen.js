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
import { computeCollections } from "../game/collectionPolicy";
import { computeLevel } from "../game/levelPolicy";
import { useAuth } from "../auth/AuthProvider";
import { fetchRoundResults } from "../storage/cloudProgress";
import ProgressTrack from "../components/ProgressTrack";
import AnimatedNumber from "../components/AnimatedNumber";
import CompassMark from "../components/CompassMark";
import Material from "../components/Material";

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
  const level = computeLevel(progress?.xp);
  const collections = computeCollections(results);

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

        {/* The level card is the one hero on this screen, so it takes the dusk
            wash — the same treatment Home gives the Daily card, and the same
            reason: a page of cream rows needs exactly one lit panel, not two.
            Every other card here stays flat. */}
        <FadeInUp delay={staggerDelay(1)}>
          <View style={styles.levelCard}>
            <Material name="dusk" />
            <CompassMark size={124} tone="brass" style={styles.levelMark} />
            <View style={styles.levelHeader}>
              <Text style={styles.levelLabel}>
                Level <AnimatedNumber value={level.level} style={styles.levelLabel} />
              </Text>
              <Text style={styles.levelXpText}>
                {level.xpIntoLevel}/{level.xpForNextLevel} XP
              </Text>
            </View>
            {/* Brass on nightwood — the kit's graticule colour, and the one
                place a progress fill is allowed to be decorative rather than
                semantic: this bar is not success or failure, it is distance. */}
            <ProgressTrack
              value={level.progress}
              height={6}
              fill={colors.brass}
              track="rgba(244,235,217,0.18)"
              label={`Level ${level.level}: ${level.xpIntoLevel} of ${level.xpForNextLevel} XP`}
            />
          </View>
        </FadeInUp>

        {badges.map((badge, index) => (
          <FadeInUp key={badge.slug} delay={staggerDelay(index + 2)}>
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
                    {/* Animated: these bars move when round history lands from
                        the cloud a beat after the screen paints, and a bar that
                        grows to its value is the only thing that shows the
                        fetch actually did something. */}
                    <ProgressTrack
                      value={badge.progress}
                      height={6}
                      fill={colors.brand}
                      track={colors.surfaceSunken}
                      style={styles.progressTrack}
                      label={`${badge.label}: ${Math.min(badge.value, badge.threshold)} of ${badge.threshold}`}
                    />
                    <Text style={styles.progressText}>
                      {Math.min(badge.value, badge.threshold)}/{badge.threshold}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </FadeInUp>
        ))}

        {/* M2.5 step 6.3 — collectible sets: one row per region, mined the
            same "answered correctly at least once" way computeCollections
            folds game_results.countries. No lock state here — unlike a
            badge, a region has no single threshold to clear, so every row
            always shows its bar rather than switching to an unlocked label. */}
        <FadeInUp delay={staggerDelay(badges.length + 2)}>
          <Text style={styles.sectionTitle}>Collections</Text>
        </FadeInUp>

        {collections.map((set, index) => (
          <FadeInUp key={set.region} delay={staggerDelay(badges.length + 3 + index)}>
            <View style={styles.row}>
              <View style={styles.rowBody}>
                <View style={styles.collectionHeader}>
                  <Text style={styles.rowLabel}>{set.region}</Text>
                  {set.progress >= 1 ? (
                    <Text style={[styles.unlockedText, styles.collectionStatus]}>Complete ✓</Text>
                  ) : (
                    <Text style={[styles.progressText, styles.collectionStatus]}>
                      {set.collected}/{set.total}
                    </Text>
                  )}
                </View>
                <ProgressTrack
                  value={set.progress}
                  height={6}
                  fill={colors.brand}
                  track={colors.surfaceSunken}
                  style={styles.progressTrack}
                  label={`${set.region}: ${set.collected} of ${set.total} countries collected`}
                />
              </View>
            </View>
          </FadeInUp>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  // Transparent: AppChrome owns the page ground (the kit's paper fibre).
  wrap: { flex: 1, backgroundColor: "transparent" },
  back: {
    ...constrain.content,
    paddingHorizontal: spacing(5),
    paddingTop: spacing(4),
    paddingBottom: spacing(2),
  },
  backText: { ...type.label, fontSize: 14, color: colors.link },

  content: { paddingHorizontal: spacing(5), paddingBottom: spacing(12) },
  header: { ...constrain.content, marginBottom: spacing(4) },
  title: { ...type.h1, fontSize: 34 },
  subtitle: { ...type.eyebrow, fontSize: 11, marginTop: spacing(1.5) },
  noticeText: { ...type.caption, fontSize: 13, color: colors.danger, marginTop: spacing(2) },

  levelCard: {
    ...constrain.content,
    backgroundColor: colors.brand,
    borderRadius: radius.sheet,
    paddingVertical: spacing(4),
    paddingHorizontal: spacing(4),
    marginBottom: spacing(4),
    // Clips the wash and the oversized mark to the card.
    overflow: "hidden",
    ...elevation(2),
  },
  levelMark: { position: "absolute", top: -30, right: -34, opacity: 0.16 },
  levelHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: spacing(2),
  },
  // Parchment and brass, the two inks a dark ground gets. `onFillQuiet` would
  // need 16px over a material; the XP readout is 11px mono, so it takes brass
  // instead — the kit's own eyebrow-on-dark pattern.
  levelLabel: { ...type.h3, fontSize: 18, color: colors.onFill },
  levelXpText: { ...type.eyebrow, fontSize: 11, color: colors.brass },

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
  sectionTitle: {
    ...constrain.content,
    ...type.eyebrow,
    marginTop: spacing(2),
    marginBottom: spacing(3),
  },
  collectionHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: spacing(2),
  },
  collectionStatus: { marginTop: 0, marginLeft: spacing(2) },
  glyph: {
    fontSize: 26,
    color: colors.brand,
    marginRight: spacing(3.5),
    width: 32,
    textAlign: "center",
  },
  glyphLocked: { color: colors.textMuted },
  rowBody: { flex: 1 },
  rowLabel: { ...type.body, color: colors.brand },
  rowLabelLocked: { color: colors.text },
  rowDescription: { ...type.caption, fontSize: 13, marginTop: 2 },
  unlockedText: {
    ...type.label,
    fontSize: 11,
    color: colors.successInk,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: spacing(1.5),
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing(2),
  },
  // ProgressTrack owns height, radius, fill and track colour; this only says
  // how much of the row it may take.
  progressTrack: { flex: 1 },
  progressText: {
    ...type.label,
    fontSize: 11,
    color: colors.textMuted,
    marginLeft: spacing(2),
  },
});
