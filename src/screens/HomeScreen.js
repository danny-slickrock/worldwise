import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import {
  colors,
  spacing,
  radius,
  type,
  elevation,
  hairline,
  buttonHeight,
  motion,
  onFill,
} from "../theme";
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

// Home is now purely about playing. Explore, the World Map and Learning Paths
// used to sit in the grid below as tiles — one doorway each, two taps deep and
// reachable only from here. They are top-level tabs as of the navigation
// rework (see src/game/navigation.js), so keeping tiles for them would be a
// second, competing route to the same place.
export default function HomeScreen({ progress, onPlay }) {
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
                    <Text style={[styles.tileGlyph, { color: onFill(m.accent) }]}>{m.icon}</Text>
                  </View>
                  <Text style={styles.tileTitle}>{m.title}</Text>
                  <Text style={styles.tileBlurb}>{m.blurb}</Text>
                </Pressable>
              </FadeInUp>
            );
          })}
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
  wrap: { flex: 1, backgroundColor: colors.surface },
  content: { padding: spacing(5), paddingTop: spacing(6), paddingBottom: spacing(12) },

  statusRow: { flexDirection: "row", gap: spacing(2), marginBottom: spacing(6) },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(1.5),
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.pill,
    paddingVertical: spacing(1.5),
    paddingHorizontal: spacing(3),
    ...elevation(1),
  },
  statusGlyph: { fontSize: 15, color: colors.sand },
  statusValue: { ...type.h3, fontSize: 16 },
  statusUnit: { ...type.label, fontSize: 10, color: colors.textMuted, letterSpacing: 1 },

  brandRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  wordmark: { ...type.h1, fontSize: 38 },
  brandTag: { ...type.label, fontSize: 15, color: colors.accent, letterSpacing: -0.2 },
  tagline: { ...type.caption, fontSize: 15, marginTop: spacing(1), marginBottom: spacing(5) },

  streakBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing(3),
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.sheet,
    paddingVertical: spacing(3.5),
    paddingHorizontal: spacing(4),
    marginBottom: spacing(7),
    ...hairline,
    ...elevation(1),
  },
  streakMsg: { ...type.body, flexShrink: 1, color: colors.text },
  streakBest: {
    ...type.label,
    fontSize: 11,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },

  section: { ...type.eyebrow, marginBottom: spacing(3) },
  hint: { ...type.caption, fontSize: 12, marginTop: spacing(2.5), marginBottom: spacing(6) },

  heroCard: {
    borderRadius: radius.sheet,
    padding: spacing(5),
    marginBottom: spacing(7),
    ...elevation(2),
  },
  heroKicker: {
    ...type.label,
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    color: colors.onFill,
    opacity: 0.7,
  },
  heroTitle: {
    ...type.h2,
    fontSize: 26,
    color: colors.onFill,
    lineHeight: 32,
    marginTop: spacing(1.5),
    marginBottom: spacing(4),
  },
  heroCta: {
    alignSelf: "flex-start",
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.pill,
    height: buttonHeight.md,
    justifyContent: "center",
    paddingHorizontal: spacing(7),
  },
  heroCtaText: { ...type.label, fontSize: 14, color: colors.brand, letterSpacing: 1.2 },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: spacing(4),
  },
  // The FadeInUp wrapper is the flex item now, so the cell owns the grid
  // geometry and the Pressable just fills it. Keeping width on the Pressable
  // would size it against the wrapper instead of the grid and break the row.
  tileCell: { width: "48.5%", marginBottom: spacing(4) },
  tile: {
    width: "100%",
    height: "100%",
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.sheet,
    padding: spacing(5),
    minHeight: 132,
    ...hairline,
    ...elevation(1),
  },
  tileIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.card,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing(3),
  },
  tileGlyph: { fontSize: 20 },
  tileTitle: { ...type.h3, fontSize: 16 },
  tileBlurb: { ...type.caption, fontSize: 12, marginTop: 2, lineHeight: 16 },

  segment: {
    flexDirection: "row",
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.pill,
    padding: spacing(1),
    ...elevation(1),
  },
  segmentItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing(2.5),
    borderRadius: radius.pill,
  },
  segmentItemActive: { backgroundColor: colors.accent },
  segmentText: { ...type.label, color: colors.textMuted },
  segmentTextActive: { color: colors.onFill },

  toggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.sheet,
    paddingVertical: spacing(3.5),
    paddingHorizontal: spacing(4),
    ...elevation(1),
  },
  toggleActive: { backgroundColor: colors.accent },
  toggleText: { ...type.body, color: colors.text },
  toggleTextActive: { color: colors.onFill },
  toggleState: {
    backgroundColor: colors.surfaceSunken,
    borderRadius: radius.pill,
    paddingVertical: spacing(1),
    paddingHorizontal: spacing(2.5),
  },
  toggleStateActive: { backgroundColor: colors.brandDeep },
  toggleStateText: { ...type.label, fontSize: 11, color: colors.textMuted, letterSpacing: 1 },
  toggleStateTextActive: { color: colors.brand },

  footer: {
    ...type.label,
    fontSize: 11,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing(2),
    letterSpacing: 1,
    textTransform: "uppercase",
  },
});
