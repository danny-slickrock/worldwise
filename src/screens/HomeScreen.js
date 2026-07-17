import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { colors, spacing, radius, type, shadow } from "../theme";
import { MODES } from "../game/questions";
import { DIFFICULTIES, DEFAULT_DIFFICULTY } from "../constants";
import { streakStatus, dayKey } from "../game/progress";

const GAME_ORDER = ["daily", "flag", "capital", "capitalReverse", "shape", "locator"];

export default function HomeScreen({ progress, onPlay, onOpenCountry }) {
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

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <Text style={styles.kicker}>SLICKROCK STUDIO</Text>
      <Text style={styles.title}>Worldwise</Text>
      <Text style={styles.tagline}>Learn the world through curiosity.</Text>

      {/* Stats */}
      <View style={styles.stats}>
        <Stat label="XP" value={progress.xp} />
        <Stat label="Day streak" value={streak.count} />
        <Stat label="Best round" value={progress.bestScore ? `${progress.bestScore}/8` : "—"} />
      </View>

      {/* Streak status — the "come back tomorrow" nudge */}
      <View style={styles.streakBanner}>
        <Text style={styles.streakFlame}>{streak.alive ? "🔥" : "🌙"}</Text>
        <Text style={styles.streakMsg}>{streakMsg}</Text>
        {streak.freezes > 0 && <Text style={styles.freezeBadge}>❄️ {streak.freezes}</Text>}
      </View>

      {/* Difficulty */}
      <Text style={styles.section}>Difficulty</Text>
      <View style={styles.difficultyRow}>
        {DIFFICULTIES.map((d) => {
          const active = d.key === difficulty;
          return (
            <Pressable
              key={d.key}
              onPress={() => setDifficulty(d.key)}
              style={[styles.difficultyChip, active && styles.difficultyChipActive]}
            >
              <Text style={[styles.difficultyChipText, active && styles.difficultyChipTextActive]}>{d.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.difficultyHint}>Applies to every game except Daily, which always mixes every tier.</Text>

      {/* Timed mode */}
      <Text style={styles.section}>Options</Text>
      <Pressable
        onPress={() => setTimed((t) => !t)}
        style={[styles.timedToggle, timed && styles.timedToggleActive]}
      >
        <Text style={[styles.timedToggleText, timed && styles.timedToggleTextActive]}>⏱ Timed Mode</Text>
        <Text style={[styles.timedToggleState, timed && styles.timedToggleTextActive]}>{timed ? "On" : "Off"}</Text>
      </Pressable>
      <Text style={styles.difficultyHint}>10s per question — not applied to Daily.</Text>

      {/* Games */}
      <Text style={styles.section}>Games</Text>
      {GAME_ORDER.map((key) => {
        const m = MODES[key];
        const featured = key === "daily";
        return (
          <Pressable
            key={key}
            onPress={() => onPlay(key, difficulty, timed)}
            style={[styles.card, featured && { backgroundColor: m.accent }]}
          >
            <View style={[styles.iconWrap, featured ? styles.iconWrapLight : { backgroundColor: colors.surfaceAlt }]}>
              <Text style={[styles.icon, { color: featured ? colors.white : m.accent }]}>{m.icon}</Text>
            </View>
            <View style={styles.cardBody}>
              <Text style={[styles.cardTitle, featured && { color: colors.white }]}>{m.title}</Text>
              <Text style={[styles.cardBlurb, featured && { color: "rgba(255,255,255,0.85)" }]}>{m.blurb}</Text>
            </View>
            <Text style={[styles.chev, featured && { color: colors.white }]}>›</Text>
          </Pressable>
        );
      })}

      {/* TEMPORARY — M2.2 preview entry point so the Brazil country page is
          reachable while it's being built. Replaced by real entry points
          (context card "Learn more", country index, map) in later M2.2 steps. */}
      {onOpenCountry && (
        <Pressable onPress={() => onOpenCountry("br")} style={styles.previewCard}>
          <Text style={styles.previewTag}>PREVIEW</Text>
          <Text style={styles.previewText}>Explore Brazil →</Text>
        </Pressable>
      )}

      <Text style={styles.footer}>Phase 1 prototype · more games coming</Text>
    </ScrollView>
  );
}

function Stat({ label, value }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing(3), paddingTop: spacing(7), paddingBottom: spacing(6) },
  kicker: { color: colors.earth, fontWeight: "800", letterSpacing: 2, fontSize: 12 },
  title: { ...type.hero, fontSize: 40, marginTop: spacing(0.5) },
  tagline: { ...type.muted, fontSize: 15, marginTop: spacing(0.5), marginBottom: spacing(3) },

  stats: { flexDirection: "row", gap: spacing(1.5), marginBottom: spacing(1.5) },
  stat: {
    flex: 1, backgroundColor: colors.surface, borderRadius: radius.md,
    paddingVertical: spacing(2), alignItems: "center", ...shadow,
  },
  statValue: { fontSize: 24, fontWeight: "900", color: colors.navy },
  statLabel: { ...type.muted, fontSize: 12, marginTop: 2 },
  streakBanner: {
    flexDirection: "row", alignItems: "center", gap: spacing(1),
    backgroundColor: colors.surface, borderRadius: radius.md,
    paddingVertical: spacing(1.5), paddingHorizontal: spacing(2),
    marginBottom: spacing(3.5), ...shadow,
  },
  streakFlame: { fontSize: 20 },
  streakMsg: { ...type.body, fontWeight: "700", flex: 1, color: colors.ink },
  freezeBadge: { ...type.pill, color: colors.teal },

  section: { ...type.h2, marginBottom: spacing(1.5) },
  difficultyRow: { flexDirection: "row", gap: spacing(1), marginBottom: spacing(1) },
  difficultyChip: {
    flex: 1, alignItems: "center", paddingVertical: spacing(1.25),
    borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line,
  },
  difficultyChipActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  difficultyChipText: { ...type.pill, color: colors.muted },
  difficultyChipTextActive: { color: colors.white },
  difficultyHint: { ...type.muted, fontSize: 12, marginBottom: spacing(3) },
  timedToggle: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: colors.surface, borderRadius: radius.md, paddingVertical: spacing(1.5),
    paddingHorizontal: spacing(2), borderWidth: 1, borderColor: colors.line, marginBottom: spacing(1),
  },
  timedToggleActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  timedToggleText: { ...type.body, fontWeight: "700" },
  timedToggleState: { ...type.muted, fontWeight: "700" },
  timedToggleTextActive: { color: colors.white },
  card: {
    flexDirection: "row", alignItems: "center", backgroundColor: colors.surface,
    borderRadius: radius.lg, padding: spacing(2), marginBottom: spacing(1.5), ...shadow,
  },
  iconWrap: {
    width: 52, height: 52, borderRadius: radius.md, alignItems: "center", justifyContent: "center",
  },
  iconWrapLight: { backgroundColor: "rgba(255,255,255,0.2)" },
  icon: { fontSize: 24, fontWeight: "800" },
  cardBody: { flex: 1, marginLeft: spacing(2) },
  cardTitle: { fontSize: 18, fontWeight: "800", color: colors.ink },
  cardBlurb: { ...type.muted, marginTop: 2 },
  chev: { fontSize: 28, color: colors.line, fontWeight: "700" },

  footer: { ...type.muted, textAlign: "center", marginTop: spacing(2), fontSize: 12 },

  previewCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(1.5),
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.sand,
    paddingVertical: spacing(1.75),
    paddingHorizontal: spacing(2),
    marginTop: spacing(2),
  },
  previewTag: {
    ...type.pill,
    fontSize: 10,
    letterSpacing: 1.5,
    color: colors.earth,
  },
  previewText: { ...type.body, fontWeight: "800", color: colors.navy },
});
