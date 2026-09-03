// Learning path screen (M2.4) — a guided, mastery-based sequence through one
// region's countries, broad to specific.
//
// Step 4 was the hero: node states come from masteryPolicy.js's
// computeNodeStates(), mined from the player's real round history, and
// tapping an unlocked or mastered node opens that country's page — which
// already has its own Play buttons per game mode, so this screen doesn't
// need to know how to start a round.
//
// Step 5 generalizes the entry point: rather than one Home tile per region
// (which would crowd Home's grid with five near-identical tiles), a single
// pill row here — same pattern as the World Map's region row — switches
// between all five paths without leaving the screen. `onSwitchPath` just
// re-runs App.js's own openLearningPath(pathId), so switching is a normal
// nav-seam call, not new screen state.
import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, Animated, Easing } from "react-native";
import { colors, spacing, radius, type, depth, constrain, motion } from "../theme";
import Container from "../components/Container";
import FadeInUp from "../components/FadeInUp";
import { getLearningPath, LEARNING_PATH_REGIONS } from "../data/learningPaths";
import { computeNodeStates } from "../game/masteryPolicy";
import { useAuth } from "../auth/AuthProvider";
import { fetchRoundResults } from "../storage/cloudProgress";

const STATE_LABEL = { locked: "Locked", unlocked: "Start", mastered: "Mastered" };

export default function LearningPathScreen({ pathId, onExit, onOpenCountry, onSwitchPath }) {
  const path = getLearningPath(pathId);
  const { user } = useAuth();
  // Local storage keeps no per-round history (only aggregated totals), so
  // results start empty — signed-out players see every tier but the first
  // locked until they sign in, same offline-first trade-off as Profile's stats.
  const [results, setResults] = useState([]);
  // A failed fetch (offline, backend down) also resolves to an empty results
  // array, which looks identical to "no history yet" and would otherwise
  // mislabel every locked tier as genuinely un-played. Track it separately so
  // a signed-in player sees an honest "couldn't load" notice instead.
  const [resultsError, setResultsError] = useState(false);

  useEffect(() => {
    let active = true;
    setResultsError(false);
    fetchRoundResults(user).then(({ rows, error }) => {
      if (!active) return;
      setResults(rows);
      setResultsError(Boolean(error));
    });
    return () => {
      active = false;
    };
  }, [user]);

  const nodes = path ? computeNodeStates(path, results) : [];

  // Fade/rise-in on open, fade/settle-out on close — same shape as
  // CountryPageScreen (M2.2 step 6.4). A node tap skips the defer: it opens a
  // country page, which already has its own entrance transition, so there's
  // nothing to avoid double-animating. Switching region pills stays instant
  // too — the screen never unmounts for that, it's just a content swap.
  const screenAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(screenAnim, {
      toValue: 1,
      duration: motion.duration.base,
      easing: Easing.bezier(...motion.easeOut),
      useNativeDriver: true,
    }).start();
  }, [screenAnim]);
  function handleExit() {
    Animated.timing(screenAnim, {
      toValue: 0,
      duration: motion.duration.fast,
      useNativeDriver: true,
    }).start(onExit);
  }
  const screenStyle = {
    opacity: screenAnim,
    transform: [
      { translateY: screenAnim.interpolate({ inputRange: [0, 1], outputRange: [motion.rise, 0] }) },
    ],
  };

  return (
    <Animated.View style={[styles.wrap, !onExit && styles.wrapNoBack, screenStyle]}>
      {/* Only when there's something underneath. As the Learn tab's root this
          screen is usually the bottom of its stack. */}
      {onExit && (
        <Pressable onPress={handleExit} hitSlop={12} style={styles.back}>
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>
      )}

      {onSwitchPath && (
        <View style={styles.regionRow}>
          {LEARNING_PATH_REGIONS.map((region) => {
            const id = region.toLowerCase();
            const active = id === pathId;
            return (
              <Pressable
                key={id}
                onPress={() => onSwitchPath(id)}
                hitSlop={8}
                style={[styles.regionChip, active && styles.regionChipActive]}
              >
                <Text style={[styles.regionChipText, active && styles.regionChipTextActive]}>
                  {region}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {!path ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>We don't have a learning path for that yet.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Container>
            {/* rise={0}: the screen as a whole already rises via screenAnim,
                so these two groups contribute the fade + stagger only —
                stacking transforms would overshoot the 8-16px band, same
                reasoning as CountryPageScreen's own blocks. */}
            <FadeInUp rise={0}>
              <Text style={styles.kicker}>Learning path</Text>
              <Text style={styles.title}>{path.region}</Text>
              <Text style={styles.subtitle}>{path.nodes.length} countries, easiest to hardest</Text>

              {resultsError && user && (
                <Text style={styles.noticeText}>
                  ⚠ Couldn't load your progress — showing offline defaults.
                </Text>
              )}
            </FadeInUp>

            <FadeInUp rise={0} index={1}>
              {nodes.map((node) => {
                const locked = node.state === "locked";
                return (
                  <Pressable
                    key={node.code}
                    disabled={locked}
                    onPress={() => onOpenCountry?.(node.code)}
                    style={[styles.row, locked && styles.rowLocked]}
                  >
                    <View style={styles.rowBody}>
                      <Text style={[styles.rowName, locked && styles.rowNameLocked]}>
                        {node.name}
                      </Text>
                      <Text style={styles.rowDifficulty}>{node.difficulty}</Text>
                    </View>
                    <Text style={[styles.rowState, styles[`rowState_${node.state}`]]}>
                      {STATE_LABEL[node.state]}
                    </Text>
                  </Pressable>
                );
              })}
            </FadeInUp>
          </Container>
        </ScrollView>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  back: { paddingHorizontal: spacing(2.5), paddingTop: spacing(2), paddingBottom: spacing(1) },
  // Back carries the top inset; at the Learn tab's root it isn't drawn, so the
  // inset moves to the wrapper instead of vanishing with it.
  wrapNoBack: { paddingTop: spacing(2) },
  backText: { ...type.pill, fontSize: 14, color: colors.teal },
  regionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing(1),
    paddingHorizontal: spacing(2.5),
    paddingBottom: spacing(1),
  },
  regionChip: {
    paddingVertical: spacing(1),
    paddingHorizontal: spacing(1.75),
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    ...depth(3),
  },
  regionChipActive: { backgroundColor: colors.teal, ...depth(3, colors.navyDeep) },
  regionChipText: { ...type.pill, color: colors.muted },
  regionChipTextActive: { color: colors.navyDeep },
  content: { padding: spacing(2.5), paddingTop: spacing(1), paddingBottom: spacing(6) },
  kicker: { ...type.kicker },
  title: { ...type.hero, fontSize: 34, marginTop: spacing(0.5) },
  subtitle: { ...type.muted, fontSize: 14, marginTop: spacing(0.5), marginBottom: spacing(2.5) },
  noticeText: {
    ...type.muted,
    fontSize: 13,
    color: colors.error,
    marginBottom: spacing(2),
  },
  row: {
    ...constrain.content,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing(1.5),
    paddingHorizontal: spacing(2),
    marginBottom: spacing(1.25),
    ...depth(),
  },
  rowLocked: { opacity: 0.5 },
  rowBody: { flex: 1 },
  rowName: { ...type.body, fontWeight: "800", color: colors.headline },
  rowNameLocked: { color: colors.muted },
  rowDifficulty: {
    ...type.pill,
    fontSize: 11,
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 2,
  },
  rowState: {
    ...type.pill,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginLeft: spacing(1.5),
  },
  rowState_locked: { color: colors.muted },
  rowState_unlocked: { color: colors.teal },
  rowState_mastered: { color: colors.success },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing(3) },
  emptyText: { ...type.muted },
});
