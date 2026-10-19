// M2.8 step 3 — the Profile UI that actually sets focus regions, difficulty,
// and a streak goal. Steps 1-2 built the pure model and the offline-first
// sync seam with nothing calling it; this is what finally wires a player's
// taps to that plumbing.
//
// Deliberately separate from InterestsScreen even though both are
// multi-select-chips-plus-a-catalog: that screen owns *what you're curious
// about* (topics, feeding M2.9's retrieval later), this owns *how you want to
// practice* (regions/difficulty/goal, feeding round-building). Keeping them
// visually similar but functionally distinct is the point of CLAUDE.md's
// "both live behind the same Profile surface so preferences read as one
// thing to the learner, not two systems" line.
//
// Edits are local state until Done commits them via onSave — mirroring
// InterestsScreen's own "pick, then Continue" shape — and Back discards
// without saving, the same "Cancel leaves existing picks alone" contract
// resolveSecondaryAction() gives the Interests edit surface.
import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { colors, spacing, radius, type, elevation } from "../theme";
import Container from "../components/Container";
import FadeInUp from "../components/FadeInUp";
import { LEARNING_PATH_REGIONS } from "../data/learningPaths";
import { DIFFICULTIES, STREAK_GOAL_MIN, STREAK_GOAL_MAX } from "../constants";
import { normalizePracticePrefs } from "../game/practicePrefsPolicy";

// Where a freshly-turned-on goal starts: the bottom of a week, not the
// bound's own floor of one day, which would read as a goal nobody could miss.
const STREAK_GOAL_DEFAULT = 7;

export default function PracticePrefsScreen({ prefs, onExit, onSave }) {
  const [focusRegions, setFocusRegions] = useState(prefs.focusRegions);
  const [difficulty, setDifficulty] = useState(prefs.difficulty);
  const [streakGoal, setStreakGoal] = useState(prefs.streakGoal);

  function toggleRegion(region) {
    setFocusRegions((prev) =>
      prev.includes(region) ? prev.filter((r) => r !== region) : [...prev, region]
    );
  }

  function adjustStreakGoal(delta) {
    setStreakGoal((prev) => {
      const base = prev ?? STREAK_GOAL_DEFAULT;
      return Math.min(STREAK_GOAL_MAX, Math.max(STREAK_GOAL_MIN, base + delta));
    });
  }

  function handleDone() {
    onSave(normalizePracticePrefs({ focusRegions, difficulty, streakGoal }));
  }

  return (
    <ScrollView
      style={styles.wrap}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Container>
        <Pressable onPress={onExit} hitSlop={8} style={styles.back}>
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>

        <FadeInUp>
          <Text style={styles.kicker}>Practice preferences</Text>
          <Text style={styles.title}>How do you want to practice?</Text>
          <Text style={styles.tagline}>
            These shape which countries show up and how hard your rounds are. Your
            interests — what you're curious about — are a separate setting.
          </Text>
        </FadeInUp>

        <FadeInUp index={1}>
          <Text style={styles.section}>Focus regions</Text>
          <Text style={styles.sectionHint}>
            Pick as many as you like. Leave empty to draw from everywhere.
          </Text>
          <View style={styles.grid}>
            {LEARNING_PATH_REGIONS.map((region) => {
              const active = focusRegions.includes(region);
              return (
                <Pressable
                  key={region}
                  onPress={() => toggleRegion(region)}
                  hitSlop={8}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{region}</Text>
                </Pressable>
              );
            })}
          </View>
        </FadeInUp>

        <FadeInUp index={2}>
          <Text style={styles.section}>Difficulty</Text>
          <Text style={styles.sectionHint}>Which countries show up in a round.</Text>
          <View style={styles.grid}>
            {DIFFICULTIES.map((d) => {
              const active = difficulty === d.key;
              return (
                <Pressable
                  key={d.key}
                  onPress={() => setDifficulty(d.key)}
                  hitSlop={8}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{d.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </FadeInUp>

        <FadeInUp index={3}>
          <Text style={styles.section}>Streak goal</Text>
          {streakGoal == null ? (
            <Pressable
              onPress={() => setStreakGoal(STREAK_GOAL_DEFAULT)}
              hitSlop={8}
              style={styles.noGoalRow}
            >
              <Text style={styles.sectionHint}>No goal set — tap to pick one</Text>
            </Pressable>
          ) : (
            <View style={styles.goalRow}>
              <Pressable
                onPress={() => adjustStreakGoal(-1)}
                hitSlop={8}
                disabled={streakGoal <= STREAK_GOAL_MIN}
                style={[styles.stepperBtn, streakGoal <= STREAK_GOAL_MIN && styles.stepperBtnDisabled]}
              >
                <Text style={styles.stepperText}>−</Text>
              </Pressable>
              <Text style={styles.goalValue}>{streakGoal}-day streak</Text>
              <Pressable
                onPress={() => adjustStreakGoal(1)}
                hitSlop={8}
                disabled={streakGoal >= STREAK_GOAL_MAX}
                style={[styles.stepperBtn, streakGoal >= STREAK_GOAL_MAX && styles.stepperBtnDisabled]}
              >
                <Text style={styles.stepperText}>+</Text>
              </Pressable>
              <Pressable onPress={() => setStreakGoal(null)} hitSlop={8} style={styles.clearGoalBtn}>
                <Text style={styles.clearGoalText}>Clear</Text>
              </Pressable>
            </View>
          )}
        </FadeInUp>

        <Pressable onPress={handleDone} style={styles.doneBtn}>
          <Text style={styles.doneText}>Done</Text>
        </Pressable>
      </Container>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Transparent: AppChrome owns the page ground (the kit's paper fibre).
  wrap: { flex: 1, backgroundColor: "transparent" },
  content: { padding: spacing(5), paddingTop: spacing(6), paddingBottom: spacing(12) },

  back: { alignSelf: "flex-start", paddingVertical: spacing(2), paddingRight: spacing(4) },
  backText: { ...type.label, fontSize: 14, color: colors.link },

  kicker: { ...type.eyebrow, fontSize: 12, marginTop: spacing(3) },
  title: { ...type.h1, fontSize: 30, marginTop: spacing(1), lineHeight: 36 },
  tagline: { ...type.caption, fontSize: 15, marginTop: spacing(2), marginBottom: spacing(6) },

  section: { ...type.eyebrow, marginBottom: spacing(1.5) },
  sectionHint: { ...type.caption, fontSize: 13, marginBottom: spacing(3) },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing(2.5), marginBottom: spacing(7) },
  chip: {
    paddingVertical: spacing(3),
    paddingHorizontal: spacing(4),
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceRaised,
    ...elevation(1),
  },
  chipActive: { backgroundColor: colors.brand, ...elevation(2) },
  chipText: { ...type.body, color: colors.text },
  chipTextActive: { color: colors.onFill },

  noGoalRow: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.sheet,
    padding: spacing(4),
    marginBottom: spacing(7),
    ...elevation(1),
  },
  goalRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.sheet,
    padding: spacing(3),
    marginBottom: spacing(7),
    ...elevation(1),
  },
  stepperBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperBtnDisabled: { opacity: 0.4 },
  stepperText: { ...type.h3, fontSize: 20, color: colors.onFill, lineHeight: 22 },
  goalValue: { ...type.body, color: colors.text, flex: 1, textAlign: "center" },
  clearGoalBtn: { paddingHorizontal: spacing(3), paddingVertical: spacing(2) },
  clearGoalText: { ...type.label, fontSize: 13, color: colors.danger },

  doneBtn: {
    backgroundColor: colors.brand,
    borderRadius: radius.pill,
    paddingVertical: spacing(3.5),
    alignItems: "center",
    ...elevation(2),
  },
  doneText: { ...type.body, color: colors.onFill },
});
