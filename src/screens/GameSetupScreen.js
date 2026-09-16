import React from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { colors, spacing, radius, type, elevation, hairline, onFill } from "../theme";
import Container from "../components/Container";
import FadeInUp, { staggerDelay } from "../components/FadeInUp";
import PressableTint from "../components/PressableTint";
import { MODES } from "../game/questions";
import { tiersFor, isTierBuilt } from "../data/difficulties";
import { isProMode } from "../game/entitlements";

// The pre-game difficulty menu (M2.12 step 2).
//
// One screen between the hub and the round, and it exists because the tier
// changes what the game IS — "Hard" on Flag Guesser is a typing game, not a
// harder quiz — so it cannot be a toggle tucked under the grid the way the
// old pool-difficulty segmented control was. The description under each label
// is the actual product here: "Hard" alone never tells anyone that close
// spelling still counts, which is the one fact that decides whether someone
// is willing to try it.
//
// Rows rather than a segmented control, for the same reason: a segment can
// carry a word, not a sentence.
export default function GameSetupScreen({ mode, onExit, onStart }) {
  const m = MODES[mode];
  const tiers = tiersFor(mode);

  // A mode with no menu should never have routed here, but a hand-typed URL
  // can always land on one. Bounce rather than render an empty page.
  if (!m || !tiers.length) {
    return (
      <Container>
        <View style={styles.wrap}>
          <Pressable onPress={onExit} style={styles.back}>
            <Text style={styles.backText}>‹ Back</Text>
          </Pressable>
          <Text style={styles.title}>That game has no difficulty menu.</Text>
        </View>
      </Container>
    );
  }

  return (
    <Container>
      <ScrollView contentContainerStyle={styles.wrap}>
        <Pressable onPress={onExit} style={styles.back} hitSlop={8}>
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>

        <FadeInUp>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={[styles.icon, { backgroundColor: m.accent }]}>
                <Text style={[styles.glyph, { color: onFill(m.accent) }]}>{m.icon}</Text>
              </View>
              {isProMode(mode) && (
                <View style={styles.proBadge}>
                  <Text style={styles.proBadgeText}>PRO</Text>
                </View>
              )}
            </View>
            <Text style={styles.eyebrow}>Choose your difficulty</Text>
            <Text style={styles.title}>{m.title}</Text>
            <Text style={styles.blurb}>{m.blurb}</Text>
          </View>
        </FadeInUp>

        <View style={styles.list}>
          {tiers.map((t, i) => {
            // Steps 3-6 build these interactions one family at a time. Until a
            // tier's surface exists the round falls back to multiple choice,
            // and saying so is better than letting someone pick "Hard" and
            // quietly receive an Easy round — the fallback is honest, not a bug
            // to hide.
            const built = isTierBuilt(mode, t.key);
            return (
              <FadeInUp key={t.key} delay={staggerDelay(i)}>
                <PressableTint
                  onPress={() => onStart(mode, t.key)}
                  radius={radius.sheet}
                  style={styles.row}
                  accessibilityRole="button"
                  accessibilityLabel={`${t.label} — ${t.description}`}
                >
                  <View style={styles.rowText}>
                    <Text style={styles.rowLabel}>{t.label}</Text>
                    <Text style={styles.rowDesc}>{t.description}</Text>
                    {!built && <Text style={styles.rowSoon}>Multiple choice for now</Text>}
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </PressableTint>
              </FadeInUp>
            );
          })}
        </View>
      </ScrollView>
    </Container>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingVertical: spacing(6), paddingBottom: spacing(12) },
  back: { alignSelf: "flex-start", paddingVertical: spacing(2), paddingRight: spacing(4) },
  backText: { ...type.label, fontSize: 14, color: colors.link },

  header: { marginTop: spacing(2), marginBottom: spacing(6) },
  titleRow: { flexDirection: "row", alignItems: "center", gap: spacing(2) },
  icon: {
    width: 44,
    height: 44,
    borderRadius: radius.card,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing(3),
  },
  glyph: { fontSize: 20 },
  proBadge: {
    backgroundColor: colors.emberSurface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing(2),
    paddingVertical: 3,
    marginBottom: spacing(3),
  },
  proBadgeText: { ...type.eyebrow, fontSize: 10, letterSpacing: 0.9, lineHeight: 13 },
  eyebrow: { ...type.eyebrow },
  title: { ...type.h1, marginTop: spacing(1) },
  blurb: { ...type.body, color: colors.textSecondary, marginTop: spacing(1) },

  list: { gap: spacing(3) },
  // 76px+ from padding alone. hitSlop is a no-op on Pressable in
  // react-native-web (M2.5 step 6.4.2), so the target has to BE the box.
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.sheet,
    paddingVertical: spacing(4),
    paddingHorizontal: spacing(5),
    ...hairline,
    ...elevation(1),
  },
  rowText: { flex: 1, paddingRight: spacing(3) },
  rowLabel: { ...type.h3, fontSize: 18 },
  rowDesc: { ...type.body, color: colors.textSecondary, marginTop: 2, lineHeight: 20 },
  rowSoon: { ...type.caption, color: colors.textFaint, marginTop: spacing(1) },
  chevron: { ...type.h2, color: colors.textFaint },
});
