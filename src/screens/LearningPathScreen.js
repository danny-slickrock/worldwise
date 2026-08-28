// Learning path screen (M2.4) — a guided, mastery-based sequence through one
// region's countries, broad to specific.
//
// Step 4 (this version) is the hero: node states come from masteryPolicy.js's
// computeNodeStates(), mined from the player's real round history, and
// tapping an unlocked or mastered node opens that country's page — which
// already has its own Play buttons per game mode, so this screen doesn't
// need to know how to start a round.
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { colors, spacing, radius, type, depth, constrain } from "../theme";
import Container from "../components/Container";
import { getLearningPath } from "../data/learningPaths";
import { computeNodeStates } from "../game/masteryPolicy";
import { useAuth } from "../auth/AuthProvider";
import { fetchRoundResults } from "../storage/cloudProgress";

const STATE_LABEL = { locked: "Locked", unlocked: "Start", mastered: "Mastered" };

export default function LearningPathScreen({ pathId, onExit, onOpenCountry }) {
  const path = getLearningPath(pathId);
  const { user } = useAuth();
  // Local storage keeps no per-round history (only aggregated totals), so
  // results start empty — signed-out players see every tier but the first
  // locked until they sign in, same offline-first trade-off as Profile's stats.
  const [results, setResults] = useState([]);

  useEffect(() => {
    let active = true;
    fetchRoundResults(user).then((rows) => {
      if (active) setResults(rows);
    });
    return () => {
      active = false;
    };
  }, [user]);

  const nodes = path ? computeNodeStates(path, results) : [];

  return (
    <View style={styles.wrap}>
      <Pressable onPress={onExit} hitSlop={12} style={styles.back}>
        <Text style={styles.backText}>‹ Back</Text>
      </Pressable>

      {!path ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>We don't have a learning path for that yet.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Container>
            <Text style={styles.kicker}>Learning path</Text>
            <Text style={styles.title}>{path.region}</Text>
            <Text style={styles.subtitle}>{path.nodes.length} countries, easiest to hardest</Text>

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
                    <Text style={[styles.rowName, locked && styles.rowNameLocked]}>{node.name}</Text>
                    <Text style={styles.rowDifficulty}>{node.difficulty}</Text>
                  </View>
                  <Text style={[styles.rowState, styles[`rowState_${node.state}`]]}>
                    {STATE_LABEL[node.state]}
                  </Text>
                </Pressable>
              );
            })}
          </Container>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  back: { paddingHorizontal: spacing(2.5), paddingTop: spacing(2), paddingBottom: spacing(1) },
  backText: { ...type.pill, fontSize: 14, color: colors.teal },
  content: { padding: spacing(2.5), paddingTop: spacing(1), paddingBottom: spacing(6) },
  kicker: { ...type.kicker },
  title: { ...type.hero, fontSize: 34, marginTop: spacing(0.5) },
  subtitle: { ...type.muted, fontSize: 14, marginTop: spacing(0.5), marginBottom: spacing(2.5) },
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
