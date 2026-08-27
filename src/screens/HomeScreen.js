import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { colors, spacing, radius, type, depth, motion } from "../theme";
import Container from "../components/Container";
import FadeInUp, { staggerDelay } from "../components/FadeInUp";
import { MODES } from "../game/questions";
import { DIFFICULTIES, DEFAULT_DIFFICULTY } from "../constants";
import { streakStatus, dayKey } from "../game/progress";

// Daily leads as a full-width hero; the rest tile two-up underneath.
const FEATURED = "daily";
const GAME_GRID = ["flag", "capital", "capitalReverse", "shape", "locator"];

// The tiles cascade among themselves, but only after the header and hero above
// them have landed — otherwise the page assembles bottom-up, which reads as a
// glitch rather than as a sequence.
const TILE_BASE_DELAY = motion.stagger * 2;

export default function HomeScreen({
  progress,
  onPlay,
  onOpenCountryIndex,
  onOpenWorldMap,
  onOpenLearningPath,
}) {
  const [difficulty, setDifficulty] = useState(DEFAULT_DIFFICULTY);
  const [timed, setTimed] = useState(false);

  const streak = streakStatus(progress, dayKey(new Date()));
  const streakMsg = !progress.lastPlayedOn
    ? "Play a round to start your streak."
    : streak.playedToday
      ? `${streak.count}-day streak — see you tomorrow!`
      : streak.atRisk
        ? `${streak.count}-day streak — play today to keep it going.`
        : "Your streak lapsed — start a new one today.";

  const featured = MODES[FEATURED];

  return (
    <ScrollView
      style={styles.wrap}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Container>
        {/* Status strip — the numbers worth glancing at, above everything else.
            Freezes only earn a pill when you actually have one. */}
        <FadeInUp>
          <View style={styles.statusRow}>
            <View style={styles.statusPill}>
              <Text style={styles.statusGlyph}>{streak.alive ? "🔥" : "🌙"}</Text>
              <Text style={styles.statusValue}>{streak.count}</Text>
            </View>
            <View style={styles.statusPill}>
              <Text style={styles.statusGlyph}>✦</Text>
              <Text style={styles.statusValue}>{progress.xp}</Text>
              <Text style={styles.statusUnit}>XP</Text>
            </View>
            {streak.freezes > 0 && (
              <View style={styles.statusPill}>
                <Text style={styles.statusGlyph}>❄️</Text>
                <Text style={styles.statusValue}>{streak.freezes}</Text>
              </View>
            )}
          </View>
        </FadeInUp>

        {/* Wordmark + streak nudge — one group: they're the page's identity and
            its call-back, and splitting them would stagger two lines of text. */}
        <FadeInUp index={1}>
          <View style={styles.brandRow}>
            <Text style={styles.wordmark}>Worldwise</Text>
            <Text style={styles.brandTag}>geography</Text>
          </View>
          <Text style={styles.tagline}>Learn the world through curiosity.</Text>

          <View style={styles.streakBanner}>
            <Text style={styles.streakMsg}>{streakMsg}</Text>
            <Text style={styles.streakBest}>
              Best round {progress.bestScore ? `${progress.bestScore}/8` : "—"}
            </Text>
          </View>
        </FadeInUp>

        {/* Today */}
        <FadeInUp index={2}>
          <Text style={styles.section}>Today</Text>
          <Pressable
            onPress={() => onPlay(FEATURED, difficulty, timed)}
            style={[styles.heroCard, { backgroundColor: featured.accent }]}
          >
            <Text style={styles.heroKicker}>Daily challenge</Text>
            <Text style={styles.heroTitle}>
              {featured.icon} A mixed round,{"\n"}every day
            </Text>
            <View style={styles.heroCta}>
              <Text style={styles.heroCtaText}>PLAY</Text>
            </View>
          </Pressable>
        </FadeInUp>

        {/* Games */}
        <Text style={styles.section}>All games</Text>
        <View style={styles.grid}>
          {GAME_GRID.map((key, i) => {
            const m = MODES[key];
            return (
              <FadeInUp key={key} style={styles.tileCell} delay={TILE_BASE_DELAY + staggerDelay(i)}>
                <Pressable onPress={() => onPlay(key, difficulty, timed)} style={styles.tile}>
                  <View style={[styles.tileIcon, { backgroundColor: m.accent }]}>
                    <Text style={styles.tileGlyph}>{m.icon}</Text>
                  </View>
                  <Text style={styles.tileTitle}>{m.title}</Text>
                  <Text style={styles.tileBlurb}>{m.blurb}</Text>
                </Pressable>
              </FadeInUp>
            );
          })}

          {/* M2.2 step 5b — the browsable country index, a real entry point
              replacing the earlier "Explore Brazil" preview. It shares the grid
              with the games because browsing is a peer of playing, not a footnote. */}
          {onOpenCountryIndex && (
            <FadeInUp
              style={styles.tileCell}
              delay={TILE_BASE_DELAY + staggerDelay(GAME_GRID.length)}
            >
              <Pressable onPress={onOpenCountryIndex} style={styles.tile}>
                <View style={[styles.tileIcon, { backgroundColor: colors.surfaceAlt }]}>
                  <Text style={styles.tileGlyph}>🌍</Text>
                </View>
                <Text style={styles.tileTitle}>Explore</Text>
                <Text style={styles.tileBlurb}>All 196 places, and why they matter</Text>
              </Pressable>
            </FadeInUp>
          )}

          {/* M2.3 step 1 — the first cut of the interactive World Map: tap any
              country to open its page. No pan/zoom yet. Shares the neutral tile
              treatment with the country index; both are exploring, not playing. */}
          {onOpenWorldMap && (
            <FadeInUp
              style={styles.tileCell}
              delay={TILE_BASE_DELAY + staggerDelay(GAME_GRID.length + 1)}
            >
              <Pressable onPress={onOpenWorldMap} style={styles.tile}>
                <View style={[styles.tileIcon, { backgroundColor: colors.surfaceAlt }]}>
                  <Text style={styles.tileGlyph}>🗺️</Text>
                </View>
                <Text style={styles.tileTitle}>World Map</Text>
                <Text style={styles.tileBlurb}>Tap anywhere on the map to explore it</Text>
              </Pressable>
            </FadeInUp>
          )}

          {/* TEMPORARY — M2.4 preview entry point so the Africa learning path
              is reachable while the real hero screen and entry points are
              being built (steps 4-5). Replaced once step 5 wires the actual
              entry points (Home + the World Map's region pills). */}
          {onOpenLearningPath && (
            <FadeInUp
              style={styles.tileCell}
              delay={TILE_BASE_DELAY + staggerDelay(GAME_GRID.length + 2)}
            >
              <Pressable onPress={() => onOpenLearningPath("africa")} style={styles.tile}>
                <View style={[styles.tileIcon, { backgroundColor: colors.surfaceAlt }]}>
                  <Text style={styles.tileGlyph}>🎓</Text>
                </View>
                <Text style={styles.tileTitle}>Learning Paths</Text>
                <Text style={styles.tileBlurb}>Preview: the Africa path, easiest to hardest</Text>
              </Pressable>
            </FadeInUp>
          )}
        </View>

        {/* Difficulty — a segmented control, so the whole choice reads at a glance. */}
        <Text style={styles.section}>Difficulty</Text>
        <View style={styles.segment}>
          {DIFFICULTIES.map((d) => {
            const active = d.key === difficulty;
            return (
              <Pressable
                key={d.key}
                onPress={() => setDifficulty(d.key)}
                style={[styles.segmentItem, active && styles.segmentItemActive]}
              >
                <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                  {d.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.hint}>
          Applies to every game except Daily, which always mixes every tier.
        </Text>

        {/* Timed mode */}
        <Text style={styles.section}>Options</Text>
        <Pressable
          onPress={() => setTimed((t) => !t)}
          style={[styles.toggle, timed && styles.toggleActive]}
        >
          <Text style={[styles.toggleText, timed && styles.toggleTextActive]}>⏱ Timed mode</Text>
          <View style={[styles.toggleState, timed && styles.toggleStateActive]}>
            <Text style={[styles.toggleStateText, timed && styles.toggleStateTextActive]}>
              {timed ? "ON" : "OFF"}
            </Text>
          </View>
        </Pressable>
        <Text style={styles.hint}>10s per question — not applied to Daily.</Text>

        <Text style={styles.footer}>Slickrock Studio · Phase 1 prototype</Text>
      </Container>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing(2.5), paddingTop: spacing(3), paddingBottom: spacing(6) },

  statusRow: { flexDirection: "row", gap: spacing(1), marginBottom: spacing(3) },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(0.75),
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingVertical: spacing(0.75),
    paddingHorizontal: spacing(1.5),
    ...depth(3),
  },
  statusGlyph: { fontSize: 15, color: colors.sand },
  statusValue: { fontSize: 16, fontWeight: "900", color: colors.headline },
  statusUnit: { ...type.pill, fontSize: 10, color: colors.muted, letterSpacing: 1 },

  brandRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  wordmark: { ...type.hero, fontSize: 38 },
  brandTag: { ...type.pill, fontSize: 15, color: colors.teal, letterSpacing: -0.2 },
  tagline: { ...type.muted, fontSize: 15, marginTop: spacing(0.5), marginBottom: spacing(2.5) },

  streakBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing(1.5),
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing(1.75),
    paddingHorizontal: spacing(2),
    marginBottom: spacing(3.5),
    ...depth(),
  },
  streakMsg: { ...type.body, fontWeight: "700", flexShrink: 1, color: colors.ink },
  streakBest: {
    ...type.pill,
    fontSize: 11,
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },

  section: { ...type.section, marginBottom: spacing(1.5) },
  hint: { ...type.muted, fontSize: 12, marginTop: spacing(1.25), marginBottom: spacing(3) },

  heroCard: {
    borderRadius: radius.lg,
    padding: spacing(2.5),
    marginBottom: spacing(3.5),
    ...depth(6, colors.navyDeep),
  },
  heroKicker: {
    ...type.pill,
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    color: colors.navyDeep,
    opacity: 0.7,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: colors.navyDeep,
    lineHeight: 32,
    marginTop: spacing(0.75),
    marginBottom: spacing(2),
  },
  heroCta: {
    alignSelf: "flex-start",
    backgroundColor: colors.navyDeep,
    borderRadius: radius.pill,
    paddingVertical: spacing(1.25),
    paddingHorizontal: spacing(3),
  },
  heroCtaText: { ...type.pill, fontSize: 14, color: colors.headline, letterSpacing: 1.4 },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: spacing(2),
  },
  // The FadeInUp wrapper is the flex item now, so the cell owns the grid
  // geometry and the Pressable just fills it. Keeping width on the Pressable
  // would size it against the wrapper instead of the grid and break the row.
  tileCell: { width: "48.5%", marginBottom: spacing(1.5) },
  tile: {
    width: "100%",
    height: "100%",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing(1.75),
    minHeight: 152,
    ...depth(),
  },
  tileIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing(1.5),
    ...depth(3, colors.navyDeep),
  },
  tileGlyph: { fontSize: 20, fontWeight: "900", color: colors.navyDeep },
  tileTitle: { fontSize: 16, fontWeight: "800", color: colors.headline },
  tileBlurb: { ...type.muted, fontSize: 12, marginTop: 2, lineHeight: 16 },

  segment: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    padding: spacing(0.5),
    ...depth(3),
  },
  segmentItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing(1.25),
    borderRadius: radius.pill,
  },
  segmentItemActive: { backgroundColor: colors.teal },
  segmentText: { ...type.pill, color: colors.muted },
  segmentTextActive: { color: colors.navyDeep },

  toggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing(1.75),
    paddingHorizontal: spacing(2),
    ...depth(),
  },
  toggleActive: { backgroundColor: colors.teal },
  toggleText: { ...type.body, fontWeight: "800", color: colors.ink },
  toggleTextActive: { color: colors.navyDeep },
  toggleState: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    paddingVertical: spacing(0.5),
    paddingHorizontal: spacing(1.25),
  },
  toggleStateActive: { backgroundColor: colors.navyDeep },
  toggleStateText: { ...type.pill, fontSize: 11, color: colors.muted, letterSpacing: 1 },
  toggleStateTextActive: { color: colors.headline },

  footer: {
    ...type.pill,
    fontSize: 11,
    color: colors.muted,
    textAlign: "center",
    marginTop: spacing(1),
    letterSpacing: 1,
    textTransform: "uppercase",
  },
});
