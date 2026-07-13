/* global setTimeout, clearTimeout */
import React, { useEffect, useMemo, useState } from "react";
import {
  View, Text, StyleSheet, Pressable, Image, ScrollView,
} from "react-native";
import { colors, spacing, radius, type, shadow } from "../theme";
import { MODES, buildRound, buildDaily } from "../game/questions";
import { computeXp } from "../game/scoring";
import { flagUrl } from "../data/countries";
import { DIFFICULTIES, DEFAULT_DIFFICULTY, TIMED_SECONDS_PER_QUESTION } from "../constants";
import CountryOutline from "./CountryOutline";
import WorldMap from "./WorldMap";

const TIMEOUT = "__timeout__"; // sentinel "picked" value for an unanswered, expired question

// A single reusable quiz surface that powers all game modes.
export default function QuizScreen({ mode, difficulty = DEFAULT_DIFFICULTY, timed = false, onExit, onFinish }) {
  const meta = MODES[mode];
  const questions = useMemo(
    () => (mode === "daily" ? buildDaily() : buildRound(mode, difficulty)),
    [mode, difficulty]
  );
  const difficultyLabel = DIFFICULTIES.find((d) => d.key === difficulty)?.label;
  const timedActive = timed && mode !== "daily"; // Daily always stays untimed

  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [picked, setPicked] = useState(null); // selected option
  const [done, setDone] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIMED_SECONDS_PER_QUESTION);

  const q = questions[idx];
  const answered = picked !== null;

  // Reset the countdown at the start of each question.
  useEffect(() => {
    if (timedActive) setTimeLeft(TIMED_SECONDS_PER_QUESTION);
  }, [idx, timedActive]);

  // Tick the countdown; once it hits zero, auto-mark the question wrong.
  useEffect(() => {
    if (!timedActive || answered) return;
    if (timeLeft <= 0) {
      setPicked(TIMEOUT);
      setStreak(0);
      return;
    }
    const id = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [timedActive, answered, timeLeft]);

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
        {timedActive && (
          <View style={[styles.timerPill, timeLeft <= 3 && styles.timerPillLow]}>
            <Text style={[styles.timerText, timeLeft <= 3 && styles.timerTextLow]}>⏱ {timeLeft}s</Text>
          </View>
        )}
        <View style={styles.streakPill}>
          <Text style={styles.streakText}>🔥 {streak}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={styles.counter}>
          Question {idx + 1} of {questions.length}
          {mode !== "daily" && difficulty !== DEFAULT_DIFFICULTY ? ` · ${difficultyLabel}` : ""}
        </Text>
        <Text style={styles.prompt}>{q.prompt}</Text>

        {/* Country Locator: the map is both prompt media and answer surface. */}
        {mode === "locator" ? (
          <View style={styles.mapBox}>
            <WorldMap
              choices={q.choices}
              correctCode={q.correct}
              pickedCode={picked}
              answered={answered}
              onPick={choose}
            />
          </View>
        ) : (
          <>
        {/* Prompt media */}
        <View style={styles.media}>
          {q.type === "flag" && (
            <Image source={{ uri: flagUrl(q.country.code) }} style={styles.flag} resizeMode="contain" />
          )}
          {q.type === "shape" && (
            <View style={styles.shapeBox}>
              <CountryOutline code={q.country.code} />
            </View>
          )}
          {q.type === "capital" && (
            <View style={[styles.capitalBadge, { borderColor: meta.accent }]}>
              <Text style={[styles.capitalGlyph, { color: meta.accent }]}>{q.country.region}</Text>
              <Text style={styles.capitalName}>{q.country.name}</Text>
            </View>
          )}
          {q.type === "capitalReverse" && (
            <View style={[styles.capitalBadge, { borderColor: meta.accent }]}>
              <Text style={[styles.capitalGlyph, { color: meta.accent }]}>Capital</Text>
              <Text style={styles.capitalName}>{q.country.capital}</Text>
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
          </>
        )}

        {answered && (
          <View style={styles.feedback}>
            <Text style={styles.feedbackText}>
              {picked === TIMEOUT
                ? "Time's up!"
                : picked === q.correct
                  ? "Nice."
                  : mode === "locator"
                    ? `That's ${q.choices.find((c) => c.code === picked)?.name ?? "elsewhere"} — ${q.country.name} is in green.`
                    : `Answer: ${q.correct}`}
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
  timerPill: {
    backgroundColor: colors.surface, borderRadius: radius.pill,
    paddingHorizontal: spacing(1.5), paddingVertical: spacing(0.75), ...shadow,
  },
  timerPillLow: { backgroundColor: colors.errorBg },
  timerText: { fontWeight: "700", color: colors.ink, fontSize: 13 },
  timerTextLow: { color: colors.error },

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
  mapBox: {
    width: "100%", height: 300, backgroundColor: colors.surfaceAlt, borderRadius: radius.md,
    overflow: "hidden", marginBottom: spacing(2), borderWidth: 1, borderColor: colors.line,
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
