// The Settings tab: how the app behaves on this device and for you.
//
// Everything here works signed out — appearance, sound and map style are
// device settings, and interests/practice already sync offline-first (local
// always, cloud when signed in). Who you are and where you stand is Account.
import React from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { colors, spacing, radius, type, elevation, themed, onFill, hitTarget } from "../theme";
import Container from "../components/Container";
import FadeInUp from "../components/FadeInUp";
import SegmentedSetting from "../components/SegmentedSetting";
import AppearanceSetting from "../components/AppearanceSetting";
import { DIFFICULTIES, DEFAULT_DIFFICULTY, ROUND_LENGTH } from "../constants";
import { hasFeature } from "../game/entitlements";
import {
  stepQuestionCount,
  describeQuestionCount,
  normalizeQuestionCount,
  UNLIMITED,
} from "../game/questionCount";
import { ChromeSpacer } from "../components/AppChrome";

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
  onChangeQuestionCount,
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

          <QuestionCountSetting
            tier={settings.tier}
            value={settings.questionCount}
            onChange={onChangeQuestionCount}
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
      <ChromeSpacer />
    </ScrollView>
  );
}

// Questions per game. Pro steps it from 2 up to unlimited; free sees the
// fixed length and why. Layout only on the Pro side of that — no purchase
// flow yet, and every account is pro today (entitlements.DEFAULT_TIER).
function QuestionCountSetting({ tier, value, onChange }) {
  const unlocked = hasFeature("questionCount", tier);
  const v = normalizeQuestionCount(value);
  const atMin = v !== UNLIMITED && v <= 2;
  return (
    <View style={styles.block}>
      <View style={styles.labelRow}>
        <Text style={styles.sectionInline}>Questions per game</Text>
        <View style={styles.proBadge}>
          <Text style={styles.proBadgeText}>PRO</Text>
        </View>
      </View>
      {unlocked ? (
        <View style={styles.stepper}>
          <Pressable
            onPress={() => onChange?.(stepQuestionCount(v, -1))}
            disabled={atMin}
            style={[styles.stepBtn, atMin && styles.stepBtnOff]}
            accessibilityRole="button"
            accessibilityLabel="Fewer questions"
          >
            <Text style={styles.stepBtnText}>−</Text>
          </Pressable>
          <Text style={styles.stepValue} accessibilityLiveRegion="polite">
            {describeQuestionCount(v)}
          </Text>
          <Pressable
            onPress={() => onChange?.(stepQuestionCount(v, 1))}
            disabled={v === UNLIMITED}
            style={[styles.stepBtn, v === UNLIMITED && styles.stepBtnOff]}
            accessibilityRole="button"
            accessibilityLabel="More questions"
          >
            <Text style={styles.stepBtnText}>+</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.stepper}>
          <Text style={styles.stepValue}>{ROUND_LENGTH} questions</Text>
        </View>
      )}
      <Text style={styles.hint}>
        {unlocked
          ? v === UNLIMITED
            ? "Every country in the game, once each. Daily stays at its own length."
            : "Daily Challenge keeps its own length."
          : `Free rounds are ${ROUND_LENGTH} questions. Pro lets you pick 2 to unlimited.`}
      </Text>
    </View>
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
    labelRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing(2),
      marginBottom: spacing(3),
    },
    sectionInline: { ...type.eyebrow },
    proBadge: {
      backgroundColor: colors.emberSurface,
      borderRadius: radius.pill,
      paddingHorizontal: spacing(2),
      paddingVertical: 2,
    },
    proBadgeText: { ...type.eyebrow, fontSize: 10, letterSpacing: 0.9, lineHeight: 13 },
    stepper: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.surfaceRaised,
      borderRadius: radius.pill,
      padding: spacing(1),
      minHeight: hitTarget.touch + spacing(2),
      ...elevation(1),
    },
    stepBtn: {
      width: hitTarget.touch,
      height: hitTarget.touch,
      borderRadius: radius.pill,
      backgroundColor: colors.brand,
      alignItems: "center",
      justifyContent: "center",
    },
    stepBtnOff: { opacity: 0.35 },
    stepBtnText: { ...type.h3, fontSize: 22, lineHeight: 24, color: onFill(colors.brand) },
    stepValue: { ...type.label, fontSize: 15, color: colors.text, flex: 1, textAlign: "center" },
    hint: { ...type.caption, fontSize: 12, marginTop: spacing(2) },
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
