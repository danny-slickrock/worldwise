import React from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { colors, spacing, radius, type, shadow } from "../theme";
import { MODES } from "../game/questions";

const GAME_ORDER = ["daily", "flag", "capital", "shape"];

export default function HomeScreen({ progress, onPlay }) {
  return (
    <ScrollView style={styles.wrap} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <Text style={styles.kicker}>SLICKROCK STUDIO</Text>
      <Text style={styles.title}>Worldwise</Text>
      <Text style={styles.tagline}>Learn the world through curiosity.</Text>

      {/* Stats */}
      <View style={styles.stats}>
        <Stat label="XP" value={progress.xp} />
        <Stat label="Day streak" value={progress.streak} />
        <Stat label="Best round" value={progress.bestScore ? `${progress.bestScore}/8` : "—"} />
      </View>

      {/* Games */}
      <Text style={styles.section}>Games</Text>
      {GAME_ORDER.map((key) => {
        const m = MODES[key];
        const featured = key === "daily";
        return (
          <Pressable
            key={key}
            onPress={() => onPlay(key)}
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

  stats: { flexDirection: "row", gap: spacing(1.5), marginBottom: spacing(3.5) },
  stat: {
    flex: 1, backgroundColor: colors.surface, borderRadius: radius.md,
    paddingVertical: spacing(2), alignItems: "center", ...shadow,
  },
  statValue: { fontSize: 24, fontWeight: "900", color: colors.navy },
  statLabel: { ...type.muted, fontSize: 12, marginTop: 2 },

  section: { ...type.h2, marginBottom: spacing(1.5) },
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
});
