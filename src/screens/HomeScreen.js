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
  themed,
  materialBase,
} from "../theme";
import Container from "../components/Container";
import FadeInUp, { staggerDelay } from "../components/FadeInUp";
import Wordmark from "../components/Wordmark";
import CompassMark from "../components/CompassMark";
import Material from "../components/Material";
import PressableTint from "../components/PressableTint";
import AnimatedNumber from "../components/AnimatedNumber";
import ProgressTrack from "../components/ProgressTrack";
import { MODES } from "../game/questions";
import { FREE_MODES, PRO_MODES } from "../game/entitlements";
import { gridColumns, CARD_GRID } from "../game/layout";
import { DEFAULT_DIFFICULTY } from "../constants";
import { streakStatus, streakGoalProgress, dayKey } from "../game/progress";

// The Play hub, per the wireframe: the FREE games as a vertical stack of
// full-width cards, then "Unlock Pro" with the PRO games in a grid. Both lists
// come straight from the entitlements catalog, so moving a game between free
// and Pro is a one-line change in entitlements.js and Home follows.
//
// Daily and a country round are catalogued free but are not "games you pick
// from a list" — Daily has its own card further down, and a country round is
// meaningless without a subject — so they are left out of the stack.
const NOT_LISTED = new Set(["daily", "country"]);
const FREE_GAMES = FREE_MODES.filter((m) => !NOT_LISTED.has(m));
const PRO_GAMES = PRO_MODES.filter((m) => !NOT_LISTED.has(m));
const FEATURED = "daily";

// The tiles cascade among themselves, but only after the header and hero above
// them have landed — otherwise the page assembles bottom-up, which reads as a
// glitch rather than as a sequence.
const TILE_BASE_DELAY = motion.stagger * 2;

// Home is now purely about playing. Explore, the World Map and Learning Paths
// used to sit in the grid below as tiles — one doorway each, two taps deep and
// reachable only from here. They are top-level tabs as of the navigation
// rework (see src/game/navigation.js), so keeping tiles for them would be a
// second, competing route to the same place.
export default function HomeScreen({
  progress,
  onPlay,
  onOpenReview,
  onOpenLearningPaths,
  // M2.8 step 5: the goal set on PracticePrefsScreen, or null if the player
  // never set one — streakGoalProgress() itself treats null as "render
  // nothing", so a caller with no goal needn't branch before passing it.
  streakGoal,
}) {
  // The pool filter defaults to "all" under the tier menu and is no longer
  // player-facing here; it stays a named constant rather than an inline "all"
  // so the two axes remain legible at the call site.
  const difficulty = DEFAULT_DIFFICULTY;
  const [timed, setTimed] = useState(false);

  const streak = streakStatus(progress, dayKey(new Date()));
  const streakMsg = !progress.lastPlayedOn
    ? "Play a round to start your streak."
    : streak.playedToday
      ? `${streak.count}-day streak — see you tomorrow!`
      : streak.atRisk
        ? `${streak.count}-day streak — play today to keep it going.`
        : "Your streak lapsed — start a new one today.";
  const goalProgress = streakGoalProgress(streak.count, streakGoal);
  const goalMsg = goalProgress
    ? goalProgress.met
      ? `🎉 ${goalProgress.goal}-day goal reached!`
      : `${streak.count} of your ${goalProgress.goal}-day goal`
    : null;

  const featured = MODES[FEATURED];
  // The Pro grid's columns follow the measured content column (layout.js owns
  // the threshold), so a phone gets the wireframe's 2-up and a desktop gains
  // a column instead of stretching two cards into slabs.
  const [gridWidth, setGridWidth] = useState(0);
  const columns = gridColumns(gridWidth);
  const cellWidth =
    gridWidth > 0 ? (gridWidth - CARD_GRID.gap * (columns - 1)) / columns : undefined;
  const play = (key) => onPlay(key, difficulty, timed);

  return (
    // The page ground is AppChrome's — the kit's paper fibre under every screen.
    <ScrollView
      style={styles.wrap}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Container>
        {/* Header band — the wireframe's "Worldwise" block. Identity, the two
            numbers worth glancing at, and the streak call-back, in one card,
            so the games start as high on a phone screen as possible. */}
        <FadeInUp>
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <Wordmark size={30} />
              <View style={styles.statusRow}>
                <View style={styles.statusPill} accessibilityLabel={`${streak.count}-day streak`}>
                  <Text style={styles.statusGlyph}>{streak.alive ? "🔥" : "🌙"}</Text>
                  {/* Both numbers roll rather than snap; AnimatedNumber never
                      animates its FIRST value, so a cold open just shows them. */}
                  <AnimatedNumber value={streak.count} style={styles.statusValue} />
                </View>
                <View style={styles.statusPill} accessibilityLabel={`${progress.xp} XP`}>
                  <CompassMark size={16} tone={colors.brass} />
                  <AnimatedNumber value={progress.xp} style={styles.statusValue} />
                </View>
              </View>
            </View>
            <Text style={styles.streakMsg}>{streakMsg}</Text>
            {/* Only a player who set a goal (Settings → Practice) sees this —
                streakGoalProgress() returns null otherwise. */}
            {goalProgress && (
              <View style={styles.goalRow}>
                <Text style={styles.goalMsg}>{goalMsg}</Text>
                <ProgressTrack
                  value={goalProgress.ratio}
                  fill={goalProgress.met ? colors.success : colors.brand}
                  style={styles.goalTrack}
                  label={goalMsg}
                />
              </View>
            )}
          </View>
        </FadeInUp>

        {/* The free games: one full-width card each, stacked. Big targets, one
            decision per row — the Duolingo/Puzzlit shape. */}
        <View style={styles.freeStack}>
          {FREE_GAMES.map((key, i) => {
            const m = MODES[key];
            return (
              <FadeInUp key={key} delay={TILE_BASE_DELAY + staggerDelay(i)}>
                {/* PressableTint: a 120ms tint on touch, an e2 lift on
                    pointer, and no scale bounce — the kit forbids it. */}
                <PressableTint
                  onPress={() => play(key)}
                  radius={radius.sheet}
                  style={styles.freeCard}
                  accessibilityRole="button"
                  accessibilityLabel={`${m.title} — ${m.blurb}`}
                >
                  <View style={[styles.freeIcon, { backgroundColor: m.accent }]}>
                    <Text style={[styles.freeGlyph, { color: onFill(m.accent) }]}>{m.icon}</Text>
                  </View>
                  <View style={styles.freeBody}>
                    <Text style={styles.freeTitle}>{m.title}</Text>
                    <Text style={styles.freeBlurb}>{m.blurb}</Text>
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </PressableTint>
              </FadeInUp>
            );
          })}
        </View>

        {/* Unlock Pro. Layout only this pass — no purchase flow and no ads
            yet, and every account is still pro (entitlements.DEFAULT_TIER), so
            these cards stay playable; the badge marks what WILL cost. */}
        {PRO_GAMES.length > 0 && (
          <FadeInUp delay={TILE_BASE_DELAY + staggerDelay(FREE_GAMES.length)}>
            <View style={styles.proHeader}>
              <Text style={styles.proTitle}>Unlock Pro</Text>
              <Text style={styles.proSub}>More games, no ads.</Text>
            </View>
            <View style={styles.proGrid} onLayout={(e) => setGridWidth(e.nativeEvent.layout.width)}>
              {PRO_GAMES.map((key) => {
                const m = MODES[key];
                const soon = Boolean(m.comingSoon);
                return (
                  <PressableTint
                    key={key}
                    onPress={soon ? undefined : () => play(key)}
                    disabled={soon}
                    radius={radius.sheet}
                    style={[styles.proCard, { width: cellWidth ?? "48%" }, soon && styles.soon]}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: soon }}
                    accessibilityLabel={`${m.title}, Pro${soon ? " — coming soon" : ""}`}
                  >
                    <View style={styles.proTop}>
                      <View style={[styles.proIcon, { backgroundColor: m.accent }]}>
                        <Text style={[styles.proGlyph, { color: onFill(m.accent) }]}>{m.icon}</Text>
                      </View>
                      <View style={styles.proBadge}>
                        <Text style={styles.proBadgeText}>{soon ? "SOON" : "PRO"}</Text>
                      </View>
                    </View>
                    <Text style={styles.proCardTitle} numberOfLines={2}>
                      {m.title}
                    </Text>
                  </PressableTint>
                );
              })}
            </View>
          </FadeInUp>
        )}

        {/* More ways to play — the habit loop and the structured paths, below
            the game list the wireframe leads with. */}
        <Text style={styles.section}>Every day</Text>
        {/* The kit's dusk wash — "the only sanctioned gradient in the system" —
            on a paper page: the two-material composition the kit permits. */}
        <PressableTint
          tone="dark"
          radius={radius.sheet}
          onPress={() => play(FEATURED)}
          style={styles.heroCard}
          accessibilityRole="button"
          accessibilityLabel={`Daily challenge — ${featured.title}`}
        >
          <Material name="dusk" />
          <CompassMark size={150} tone="brass" style={styles.heroMark} />
          {/* Parchment, never brass: brass measures ~2.6:1 at this card's lit
              corner (pinned in test/engine.test.js). */}
          <Text style={styles.heroKicker}>Daily challenge</Text>
          <Text style={styles.heroTitle}>A mixed round, every day</Text>
          <View style={styles.heroCta}>
            <Text style={styles.heroCtaText}>PLAY</Text>
          </View>
        </PressableTint>

        {onOpenLearningPaths && (
          <PressableTint
            onPress={onOpenLearningPaths}
            radius={radius.sheet}
            style={styles.row}
            accessibilityRole="button"
            accessibilityLabel="Learning paths — five regions, easiest to hardest"
          >
            <View style={styles.rowBody}>
              <Text style={styles.rowLabel}>Learning paths</Text>
              <Text style={styles.rowValue}>Five regions, easiest to hardest</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </PressableTint>
        )}
        {/* Review is owned by Account, but "what should I study?" is asked on
            the way INTO a session; per-tab stacks make two doorways free. */}
        {onOpenReview && (
          <PressableTint
            onPress={onOpenReview}
            radius={radius.sheet}
            style={styles.row}
            accessibilityRole="button"
            accessibilityLabel="Review — the places worth another look"
          >
            <View style={styles.rowBody}>
              <Text style={styles.rowLabel}>Review</Text>
              <Text style={styles.rowValue}>The places worth another look</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </PressableTint>
        )}

        <Pressable
          onPress={() => setTimed((t) => !t)}
          style={[styles.toggle, timed && styles.toggleActive]}
          accessibilityRole="switch"
          accessibilityState={{ checked: timed }}
        >
          <Text style={[styles.toggleText, timed && styles.toggleTextActive]}>⏱ Timed mode</Text>
          <View style={[styles.toggleState, timed && styles.toggleStateActive]}>
            <Text style={[styles.toggleStateText, timed && styles.toggleStateTextActive]}>
              {timed ? "ON" : "OFF"}
            </Text>
          </View>
        </Pressable>
        <Text style={styles.hint}>10s per question — not applied to Daily.</Text>
      </Container>
    </ScrollView>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    wrap: { flex: 1, backgroundColor: "transparent" },
    content: { padding: spacing(5), paddingTop: spacing(6), paddingBottom: spacing(12) },

    header: {
      backgroundColor: colors.surfaceRaised,
      borderRadius: radius.sheet,
      padding: spacing(5),
      marginBottom: spacing(6),
      ...hairline,
      ...elevation(1),
    },
    headerTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      flexWrap: "wrap",
      gap: spacing(3),
      marginBottom: spacing(3),
    },
    statusRow: { flexDirection: "row", gap: spacing(2) },
    statusPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing(1.5),
      backgroundColor: colors.surface,
      borderRadius: radius.pill,
      paddingVertical: spacing(1.5),
      paddingHorizontal: spacing(3),
    },
    statusGlyph: { fontSize: 14 },
    statusValue: { ...type.label, fontSize: 15, color: colors.text },
    streakMsg: { ...type.body, color: colors.textSecondary },
    goalRow: { marginTop: spacing(3) },
    goalMsg: { ...type.caption, fontSize: 12, color: colors.textMuted, marginBottom: spacing(1.5) },
    goalTrack: { width: "100%" },

    freeStack: { gap: spacing(3), marginBottom: spacing(10) },
    freeCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing(4),
      minHeight: 80,
      backgroundColor: colors.surfaceRaised,
      borderRadius: radius.sheet,
      paddingVertical: spacing(4),
      paddingHorizontal: spacing(5),
      overflow: "hidden",
      ...hairline,
      ...elevation(1),
    },
    freeIcon: {
      width: 48,
      height: 48,
      borderRadius: radius.card,
      alignItems: "center",
      justifyContent: "center",
    },
    freeGlyph: { fontSize: 22 },
    freeBody: { flex: 1 },
    freeTitle: { ...type.h3, fontSize: 19, lineHeight: 24 },
    freeBlurb: { ...type.caption, fontSize: 13, marginTop: 2 },
    chevron: { ...type.h2, color: colors.textFaint },

    proHeader: { marginBottom: spacing(4) },
    proTitle: { ...type.h2, fontSize: 24, lineHeight: 30 },
    proSub: { ...type.caption, fontSize: 14, marginTop: 2 },
    proGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: CARD_GRID.gap,
      marginBottom: spacing(10),
    },
    proCard: {
      backgroundColor: colors.surfaceRaised,
      borderRadius: radius.sheet,
      padding: spacing(4),
      minHeight: 112,
      overflow: "hidden",
      ...hairline,
      ...elevation(1),
    },
    proTop: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      marginBottom: spacing(3),
    },
    proIcon: {
      width: 36,
      height: 36,
      borderRadius: radius.card,
      alignItems: "center",
      justifyContent: "center",
    },
    proGlyph: { fontSize: 17 },
    proCardTitle: { ...type.label, fontSize: 15, lineHeight: 20, color: colors.text },
    // PRO badge: brass is decorative only (1.9:1 on parchment), so the word is
    // emberInk on its own warm wash — real AA body text (4.64:1).
    proBadge: {
      backgroundColor: colors.emberSurface,
      borderRadius: radius.pill,
      paddingHorizontal: spacing(2),
      paddingVertical: 3,
    },
    proBadgeText: { ...type.eyebrow, fontSize: 10, letterSpacing: 0.9, lineHeight: 13 },
    // Quieted, not greyed: the kit has no disabled grey.
    soon: { opacity: 0.68 },

    section: { ...type.eyebrow, marginBottom: spacing(3) },
    hint: { ...type.caption, fontSize: 12, marginTop: spacing(2.5), marginBottom: spacing(6) },

    heroCard: {
      borderRadius: radius.sheet,
      padding: spacing(5),
      marginBottom: spacing(3),
      overflow: "hidden",
      // The dusk wash's own base, not `brand`: brand lifts to sage in the dark
      // scheme, and this card is a lit panel in both.
      backgroundColor: materialBase("dusk"),
      ...elevation(1),
    },
    heroMark: { position: "absolute", top: -36, right: -40, opacity: 0.16 },
    heroKicker: { ...type.eyebrow, color: colors.onFill },
    heroTitle: {
      ...type.h2,
      fontSize: 22,
      color: colors.onFill,
      lineHeight: 28,
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

    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.surfaceRaised,
      borderRadius: radius.sheet,
      paddingVertical: spacing(4),
      paddingHorizontal: spacing(5),
      marginBottom: spacing(3),
      ...hairline,
      ...elevation(1),
    },
    rowBody: { flex: 1 },
    rowLabel: { ...type.h3, fontSize: 17 },
    rowValue: { ...type.caption, marginTop: 2 },

    toggle: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.surfaceRaised,
      borderRadius: radius.sheet,
      paddingVertical: spacing(3.5),
      paddingHorizontal: spacing(4),
      marginTop: spacing(4),
      ...elevation(1),
    },
    toggleActive: { backgroundColor: colors.brand },
    toggleText: { ...type.body, color: colors.text },
    toggleTextActive: { color: onFill(colors.brand) },
    toggleState: {
      backgroundColor: colors.surfaceSunken,
      borderRadius: radius.pill,
      paddingVertical: spacing(1),
      paddingHorizontal: spacing(2.5),
    },
    toggleStateActive: { backgroundColor: colors.brandDeep },
    toggleStateText: { ...type.label, fontSize: 11, color: colors.textMuted, letterSpacing: 1 },
    toggleStateTextActive: { color: colors.brand },
  })
);
