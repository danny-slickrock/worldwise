// M2.3.6 step 1 — the one prompt: "Select your interests." A single
// multi-select card, meant to show after sign-up. Skip carries equal visual
// weight to Continue on purpose: a skipped answer is a valid answer, not a
// lesser path dressed up as a disabled button.
//
// Step 2 moved the interest list into a pure, tested catalog
// (`src/data/interests.js`) and selection now normalizes through
// `src/game/interestPolicy.js` before it leaves this screen. Step 4 wired
// persistence (App.js caches locally, then syncs when signed in) — this
// screen just seeds its chips from whatever was already picked, via
// `initialSelected`.
//
// The secondary button's label and meaning come from
// `resolveSecondaryAction()` in game/interestPrompt.js, because they differ by
// context: "Skip" (commit an empty answer) when this is the sign-up prompt,
// "Cancel" (leave existing picks alone) when it's the Profile edit surface.
// The screen renders that decision; it doesn't make it.
import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { colors, spacing, radius, type, elevation } from "../theme";
import { INTERESTS } from "../data/interests";
import { normalizeInterests } from "../game/interestPolicy";

export default function InterestsScreen({
  initialSelected = [],
  secondaryLabel = "Skip",
  onSecondary,
  onContinue,
}) {
  const [selected, setSelected] = useState(initialSelected);

  function toggle(slug) {
    setSelected((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));
  }

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.kicker}>Your interests</Text>
      <Text style={styles.title}>What are you curious about?</Text>
      <Text style={styles.tagline}>
        Pick as many as you like — we'll use it to shape what you see. Nothing here is required.
      </Text>

      <View style={styles.grid}>
        {INTERESTS.map((interest) => {
          const active = selected.includes(interest.slug);
          return (
            <Pressable
              key={interest.slug}
              onPress={() => toggle(interest.slug)}
              hitSlop={8}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{interest.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.actions}>
        <Pressable onPress={onSecondary} style={styles.secondaryBtn}>
          <Text style={styles.secondaryText}>{secondaryLabel}</Text>
        </Pressable>
        <Pressable onPress={() => onContinue(normalizeInterests(selected))} style={styles.continueBtn}>
          <Text style={styles.continueText}>Continue</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.surface },
  content: { padding: spacing(5), paddingTop: spacing(10), paddingBottom: spacing(12) },
  kicker: { ...type.eyebrow, fontSize: 12 },
  title: { ...type.h1, fontSize: 30, marginTop: spacing(1), lineHeight: 36 },
  tagline: { ...type.caption, fontSize: 15, marginTop: spacing(2), marginBottom: spacing(6) },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing(2.5), marginBottom: spacing(8) },
  chip: {
    paddingVertical: spacing(3),
    paddingHorizontal: spacing(4),
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceRaised,
    ...elevation(1),
  },
  chipActive: { backgroundColor: colors.accent, ...elevation(2) },
  chipText: { ...type.body, color: colors.text },
  chipTextActive: { color: colors.onFill },

  // The secondary button and Continue are the same size and weight on purpose
  // — see the file header note on why Skip must never read as the lesser
  // option. Cancel inherits the same treatment.
  actions: { flexDirection: "row", gap: spacing(3) },
  secondaryBtn: {
    flex: 1,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.pill,
    paddingVertical: spacing(3.5),
    alignItems: "center",
    ...elevation(1),
  },
  secondaryText: { ...type.body, color: colors.brand },
  continueBtn: {
    flex: 1,
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingVertical: spacing(3.5),
    alignItems: "center",
    ...elevation(2),
  },
  continueText: { ...type.body, color: colors.onFill },
});
