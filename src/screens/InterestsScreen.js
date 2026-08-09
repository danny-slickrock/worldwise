// M2.3.6 step 1 — the one prompt: "Select your interests." A single
// multi-select card, meant to show after sign-up. Skip carries equal visual
// weight to Continue on purpose: a skipped answer is a valid answer, not a
// lesser path dressed up as a disabled button.
//
// The interest list is inline here for this first step. Step 2 moves it into
// a pure, tested catalog (`src/data/interests.js` + `src/game/interestPolicy.js`)
// that this screen will read from instead of its own array — nothing here is
// persisted yet, that's steps 3-4.
import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { colors, spacing, radius, type, depth } from "../theme";

const INTERESTS = [
  "Economics",
  "History",
  "Agriculture",
  "Military",
  "Tourism",
  "Geopolitics",
  "Climate",
  "Culture",
  "Wildlife",
  "Food",
];

export default function InterestsScreen({ onSkip, onContinue }) {
  const [selected, setSelected] = useState([]);

  function toggle(interest) {
    setSelected((prev) => (prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]));
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
          const active = selected.includes(interest);
          return (
            <Pressable
              key={interest}
              onPress={() => toggle(interest)}
              hitSlop={8}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{interest}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.actions}>
        <Pressable onPress={onSkip} style={styles.skipBtn}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
        <Pressable onPress={() => onContinue(selected)} style={styles.continueBtn}>
          <Text style={styles.continueText}>Continue</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing(2.5), paddingTop: spacing(5), paddingBottom: spacing(6) },
  kicker: { ...type.kicker, fontSize: 12 },
  title: { ...type.hero, fontSize: 30, marginTop: spacing(0.5), lineHeight: 36 },
  tagline: { ...type.muted, fontSize: 15, marginTop: spacing(1), marginBottom: spacing(3) },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing(1.25), marginBottom: spacing(4) },
  chip: {
    paddingVertical: spacing(1.5),
    paddingHorizontal: spacing(2),
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    ...depth(),
  },
  chipActive: { backgroundColor: colors.teal, ...depth(4, colors.navyDeep) },
  chipText: { ...type.body, fontWeight: "800", color: colors.ink },
  chipTextActive: { color: colors.navyDeep },

  // Skip and Continue are the same size and weight on purpose — see the file
  // header note on why Skip must never read as the lesser option.
  actions: { flexDirection: "row", gap: spacing(1.5) },
  skipBtn: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingVertical: spacing(1.75),
    alignItems: "center",
    ...depth(),
  },
  skipText: { ...type.body, fontWeight: "900", color: colors.headline },
  continueBtn: {
    flex: 1,
    backgroundColor: colors.teal,
    borderRadius: radius.pill,
    paddingVertical: spacing(1.75),
    alignItems: "center",
    ...depth(5, colors.navyDeep),
  },
  continueText: { ...type.body, fontWeight: "900", color: colors.navyDeep },
});
