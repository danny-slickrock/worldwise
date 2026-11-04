// The Settings tab: how the app behaves on this device and for you.
//
// Everything here works signed out — appearance, sound and map style are
// device settings, and interests/practice already sync offline-first (local
// always, cloud when signed in). Who you are and where you stand is Account.
import React from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { colors, spacing, radius, type, elevation, themed } from "../theme";
import Container from "../components/Container";
import FadeInUp from "../components/FadeInUp";
import SegmentedSetting from "../components/SegmentedSetting";
import AppearanceSetting from "../components/AppearanceSetting";
import { DIFFICULTIES, DEFAULT_DIFFICULTY } from "../constants";

const SOUND_OPTIONS = [
  { value: true, label: "On" },
  { value: false, label: "Off" },
];
const BASEMAP_OPTIONS = [
  { value: "terrain", label: "Terrain" },
  { value: "simple", label: "Simple" },
];

export default function SettingsScreen({
  settings,
  onChangeColorScheme,
  onChangeSound,
  onChangeBasemap,
  interests = [],
  practicePrefs,
  onOpenInterests,
  onOpenPracticePrefs,
}) {
  return (
    <ScrollView
      style={styles.wrap}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Container>
        <FadeInUp>
          <Text style={styles.kicker}>Settings</Text>
          <Text style={styles.title}>Make it yours</Text>

          <AppearanceSetting
            value={settings.colorScheme}
            onChange={onChangeColorScheme}
            style={styles.block}
          />
          <SegmentedSetting
            label="Sound"
            options={SOUND_OPTIONS}
            value={settings.soundEnabled}
            onChange={onChangeSound}
            hint="Answer chimes in quizzes."
            style={styles.block}
          />
          <SegmentedSetting
            label="Map style"
            options={BASEMAP_OPTIONS}
            value={settings.basemap}
            onChange={onChangeBasemap}
            hint="Every globe in the app uses this. Simple reads borders more easily."
            style={styles.block}
          />

          <Text style={styles.section}>Learning</Text>
          <Row
            label="Interests"
            value={interests.length ? `${interests.length} selected` : "Not set — tap to choose"}
            onPress={onOpenInterests}
          />
          <Row
            label="Practice"
            value={summarizePracticePrefs(practicePrefs)}
            onPress={onOpenPracticePrefs}
          />
        </FadeInUp>
      </Container>
    </ScrollView>
  );
}

function Row({ label, value, onPress }) {
  if (!onPress) return null;
  return (
    <Pressable onPress={onPress} style={styles.row} accessibilityRole="button">
      <View style={styles.rowBody}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
      <Text style={styles.rowChevron}>›</Text>
    </Pressable>
  );
}

export function summarizePracticePrefs(prefs) {
  if (!prefs) return "Not set — tap to choose";
  const parts = [];
  if (prefs.focusRegions?.length) {
    parts.push(`${prefs.focusRegions.length} region${prefs.focusRegions.length === 1 ? "" : "s"}`);
  }
  if (prefs.difficulty && prefs.difficulty !== DEFAULT_DIFFICULTY) {
    const label = DIFFICULTIES.find((d) => d.key === prefs.difficulty)?.label;
    if (label) parts.push(label);
  }
  if (prefs.streakGoal) parts.push(`${prefs.streakGoal}-day goal`);
  return parts.length ? parts.join(" · ") : "Not set — tap to choose";
}

const styles = themed(() =>
  StyleSheet.create({
    wrap: { flex: 1, backgroundColor: "transparent" },
    content: { padding: spacing(5), paddingBottom: spacing(12) },
    kicker: { ...type.eyebrow, marginBottom: spacing(1.5) },
    title: { ...type.h1, fontSize: 34, marginBottom: spacing(7) },
    block: { marginBottom: spacing(7) },
    section: { ...type.eyebrow, marginBottom: spacing(3) },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.surfaceRaised,
      borderRadius: radius.sheet,
      padding: spacing(4),
      marginBottom: spacing(3),
      ...elevation(1),
    },
    rowBody: { flex: 1 },
    rowLabel: { ...type.body, color: colors.brand },
    rowValue: { ...type.caption, fontSize: 13, marginTop: 2 },
    rowChevron: { fontSize: 20, color: colors.link, marginLeft: spacing(2) },
  })
);
