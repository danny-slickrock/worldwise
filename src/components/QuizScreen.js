import React, { useEffect, useMemo, useState } from "react";
import {
  View, Text, StyleSheet, Pressable, Image, ScrollView,
} from "react-native";
import { SvgUri } from "react-native-svg";
import { colors, spacing, radius, type, shadow } from "../theme";
import { MODES, buildRound, buildDaily } from "../game/questions";
import { computeXp } from "../game/scoring";
import { flagUrl, outlineUrl } from "../data/countries";

// A single reusable quiz surface that powers all game modes.
export default function QuizScreen({ mode, onExit, onFinish }) {
  const meta = MODES[mode];
  const questions = useMemo(
    () => (mode === "daily" ? buildDaily() : buildRound(mode)),
    [mode]
  );

  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [picked, setPicked] = useState(null); // selected option
  const [done, setDone] = useState(false);

  const q = questions[idx];
  const answered = picked !== null;

  // Prefetch the next question's flag image so it appears instantly.
  useEffect(() => {
    const nxt = questions[idx + 1];
    if (nxt && nxt.type === "flag") {
      Image.prefetch(flagUrl(nxt.country.code));
    }
  }, [idx, questions]);

  function choose(opt) {
    if (answered) return;
    setPicked(opt);
    if (opt === q.correct) {
      setScore((s) => s + 1);
      setStreak((s) => s + 1);
    } else {
      setStreak(0);
    }
  }

  function next() {
    if (idx + 1 >= questions.length) {
      const xp = computeXp(score);
      setDone(true);
      onFinish && onFinish({ mode, score, total: questions.length, xp });
    } else {
      setIdx((i) => i + 1);
      setPicked(null);
    }
  }

  if (done) {
    const xp = computeXp(score);
    const pct = Math.round((score / questions.length) * 100);
    return (
      <View style={styles.resultWrap}>
        <Text style={styles.resultKicker}>{meta.title}</Text>
        <Text style={styles.resultScore}>{score}/{questions.length}</Text>
        <Text style={styles.resultPct}>{pct}% correct</Text>
        <View style={styles.xpPill}><Text style={styles.xpPillText}>+{xp} XP</Text></View>
        <Pressable style={[styles.primaryBtn, { backgroundColor: meta.accent }]} onPress={onExit}>
          <Text style={styles.primaryBtnText}>Back to games</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable onPress={onExit} hitSlop={12}><Text style={styles.exit}>✕</Text></Pressable>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${(idx / questions.length) * 100}%`, backgroundColor: meta.accent }]} />
        </View>
        <View style={styles.streakPill}>
          <Text style={styles.streakText}>🔥 {streak}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={styles.counter}>Question {idx + 1} of {questions.length}</Text>
        <Text style={styles.prompt}>{q.prompt}</Text>

        {/* Prompt media */}
        <View style={styles.media}>
          {q.type === "flag" && (
            <Image source={{ uri: flagUrl(q.country.code) }} style={styles.flag} resizeMode="contain" />
          )}
          {q.type === "shape" && (
            <View style={styles.shapeBox}>
              <SvgUri uri={outlineUrl(q.country.code)} width="100%" height="100%" fill={colors.navy} />
            </View>
          )}
          {q.type === "capital" && (
            <View style={[styles.capitalBadge, { borderColor: meta.accent }]}>
              <Text style={[styles.capitalGlyph, { color: meta.accent }]}>{q.country.region}</Text>
              <Text style={styles.capitalName}>{q.country.name}</Text>
            </View>
          )}
        </View>

        {/* Options */}
        <View style={styles.options}>
          {q.options.map((opt) => {
            const isCorrect = answered && opt === q.correct;
            const isWrong = answered && opt === picked && opt !== q.correct;
            return (
              <Pressable
                key={opt}
                onPress={() => choose(opt)}
                style={[
                  styles.option,
                  isCorrect && styles.optionCorrect,
                  isWrong && styles.optionWrong,
                ]}
              >
                <Text style={[
                  styles.optionText,
                  (isCorrect || isWrong) && { color: colors.white, fontWeight: "700" },
                ]}>{opt}</Text>
                {isCorrect && <Text style={styles.optionMark}>✓</Text>}
                {isWrong && <Text style={styles.optionMark}>✕</Text>}
              </Pressable>
            );
          })}
        </View>

        {answered && (
          <View style={styles.feedback}>
            <Text style={styles.feedbackText}>
              {picked === q.correct ? "Nice." : `Answer: ${q.correct}`}
            </Text>
            <Pressable style={[styles.nextBtn, { backgroundColor: meta.accent }]} onPress={next}>
              <Text style={styles.nextBtnText}>
                {idx + 1 >= questions.length ? "Finish" : "Next"}
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  topBar: {
    flexDirection: "row", alignItems: "center", gap: spacing(1.5),
    paddingHorizontal: spacing(2), paddingTop: spacing(1), paddingBottom: spacing(1.5),
  },
  exit: { fontSize: 22, color: colors.muted, width: 28 },
  progressTrack: {
    flex: 1, height: 10, borderRadius: radius.pill, backgroundColor: colors.surfaceAlt, overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: radius.pill },
  streakPill: {
    backgroundColor: colors.surface, borderRadius: radius.pill,
    paddingHorizontal: spacing(1.5), paddingVertical: spacing(0.75), ...shadow,
  },
  streakText: { fontWeight: "700", color: colors.ink, fontSize: 13 },

  body: { padding: spacing(2.5), paddingBottom: spacing(6) },
  counter: { ...type.muted, marginBottom: spacing(0.5) },
  prompt: { ...type.title, fontSize: 22, marginBottom: spacing(2) },

  media: { alignItems: "center", justifyContent: "center", marginBottom: spacing(3) },
  flag: {
    width: 240, height: 150, borderRadius: radius.md, backgroundColor: colors.surface, ...shadow,
  },
  shapeBox: {
    width: 240, height: 200, backgroundColor: colors.surface, borderRadius: radius.md,
    padding: spacing(2), ...shadow,
  },
  capitalBadge: {
    borderWidth: 2, borderRadius: radius.lg, paddingVertical: spacing(3),
    paddingHorizontal: spacing(4), backgroundColor: colors.surface, alignItems: "center", ...shadow,
  },
  capitalGlyph: { fontSize: 12, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 },
  capitalName: { fontSize: 28, fontWeight: "800", color: colors.navy },

  options: { gap: spacing(1.25) },
  option: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: colors.surface, borderRadius: radius.md, paddingVertical: spacing(2),
    paddingHorizontal: spacing(2), borderWidth: 1, borderColor: colors.line,
  },
  optionCorrect: { backgroundColor: colors.success, borderColor: colors.success },
  optionWrong: { backgroundColor: colors.error, borderColor: colors.error },
  optionText: { ...type.body, fontSize: 17, flexShrink: 1 },
  optionMark: { color: colors.white, fontSize: 18, fontWeight: "800", marginLeft: spacing(1) },

  feedback: { marginTop: spacing(2.5), gap: spacing(1.5) },
  feedbackText: { ...type.h2, color: colors.muted },
  nextBtn: { borderRadius: radius.md, paddingVertical: spacing(2), alignItems: "center" },
  nextBtnText: { color: colors.white, fontWeight: "800", fontSize: 17 },

  resultWrap: { flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center", padding: spacing(3) },
  resultKicker: { ...type.muted, textTransform: "uppercase", letterSpacing: 1, fontWeight: "700" },
  resultScore: { fontSize: 64, fontWeight: "900", color: colors.navy, marginTop: spacing(1) },
  resultPct: { ...type.h2, color: colors.muted, marginBottom: spacing(2) },
  xpPill: {
    backgroundColor: colors.successBg, borderRadius: radius.pill,
    paddingHorizontal: spacing(2.5), paddingVertical: spacing(1), marginBottom: spacing(4),
  },
  xpPillText: { color: colors.success, fontWeight: "800", fontSize: 16 },
  primaryBtn: { borderRadius: radius.md, paddingVertical: spacing(2), paddingHorizontal: spacing(5) },
  primaryBtnText: { color: colors.white, fontWeight: "800", fontSize: 17 },
});
