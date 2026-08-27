// Learning path screen (M2.4) — a guided, mastery-based sequence through one
// region's countries, broad to specific.
//
// Step 3 (this version) is deliberately minimal: it proves the navigation seam
// (open by path id, render getLearningPath data, get back) works end to end.
// Step 4 turns it into the polished hero — locked/unlocked/mastered node
// states (masteryPolicy.js already computes these) and tapping an unlocked
// node to start the right game mode or open its country page.
import React from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { colors, spacing, radius, type, depth, constrain } from "../theme";
import Container from "../components/Container";
import { getLearningPath } from "../data/learningPaths";

export default function LearningPathScreen({ pathId, onExit }) {
  const path = getLearningPath(pathId);

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

            {path.nodes.map((node) => (
              <View key={node.code} style={styles.row}>
                <Text style={styles.rowName}>{node.name}</Text>
                <Text style={styles.rowDifficulty}>{node.difficulty}</Text>
              </View>
            ))}
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
  rowName: { ...type.body, fontWeight: "800", color: colors.headline },
  rowDifficulty: {
    ...type.pill,
    fontSize: 11,
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing(3) },
  emptyText: { ...type.muted },
});
