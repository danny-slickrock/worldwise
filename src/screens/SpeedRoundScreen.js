/* global setInterval, clearInterval, setTimeout, clearTimeout */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Image, StyleSheet, Pressable, ScrollView } from "react-native";
import { colors, spacing, radius, type, elevation, hairline, buttonHeight, onFill, themed } from "../theme";
import PressableTint from "../components/PressableTint";
import FadeInUp, { staggerDelay } from "../components/FadeInUp";
import CountryOutline from "../components/CountryOutline";
import { buildSpeedStream } from "../game/questions";
import { flagUrl } from "../data/countries";
import { SPEED_ROUND_STREAM_LENGTH } from "../constants";
import { correctHaptic, wrongHaptic } from "../haptics";
import { playCorrectTone, playWrongTone } from "../audio/sound";
import {
  startSpeedRun,
  submitSpeedAnswer,
  endSpeedRun,
  isSpeedRunOver,
  remainingSpeedMs,
  comboMultiplier,
  speedRunSummary,
  speedRoundResult,
} from "../game/speedRound";

// Phase 1 backlog, Speed Round step 3 (wiring): a 60-second mixed sprint.
//
// This screen owns exactly what MarathonScreen owns for the two pro
// sittings — the real clock and the rendering — and nothing else: every
// decision about the run itself (the clock, the combo, the score) comes from
// the pure game/speedRound.js, which never reads Date.now(). The question
// stream is buildSpeedStream() from game/questions.js, the same pool-cycling
// helper step 2 built.
//
// Unlike Marathon, every Speed Round question is an ordinary four-option
// multiple-choice question (flag/capital/capitalReverse/shape/currency/
// language, built with no interaction tier — see buildOne's typedAnswer()),
// so there is no locator globe, no typed answer and no per-tier presentation
// table to branch on here. The media block below is the same per-type
// treatment QuizScreen already renders for these six types.

const FLASH_MS = 350; // long enough to register right/wrong, short for a sprint

const formatClock = (ms) => `0:${String(Math.ceil(ms / 1000)).padStart(2, "0")}`;

export default function SpeedRoundScreen({ onExit, onFinish, onComplete, soundEnabled = true }) {
  const questions = useMemo(() => buildSpeedStream(SPEED_ROUND_STREAM_LENGTH), []);
  const [run, setRun] = useState(() => startSpeedRun(Date.now()));
  const [now, setNow] = useState(() => Date.now());
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState(null);
  const [history, setHistory] = useState([]);
  const advanceTimer = useRef(null);

  const over = isSpeedRunOver(run, now);
  const q = questions[idx];

  // The single real interval, same shape as Marathon's — everything it feeds
  // is a pure function of `now`.
  useEffect(() => {
    if (over) return undefined;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [over]);

  // Close the run exactly once, whichever way it ended (the clock, or running
  // past the end of the stream — SPEED_ROUND_STREAM_LENGTH is generous, but
  // not infinite). endSpeedRun is idempotent.
  useEffect(() => {
    if (!over || run.endedAt !== null) return;
    setRun((r) => endSpeedRun(r, Date.now()));
  }, [over, run.endedAt]);

  useEffect(() => () => clearTimeout(advanceTimer.current), []);

  // Report the finished sprint exactly once.
  const reported = useRef(false);
  useEffect(() => {
    if (run.endedAt === null || reported.current) return;
    reported.current = true;
    onComplete?.(speedRoundResult(run, history, { now: run.endedAt }));
    // onComplete is an inline prop; the run's end is the only trigger, and
    // `history` is read at that same moment rather than tracked as a dep.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run.endedAt]);

  function choose(opt) {
    if (over || picked !== null || !q) return;
    const isRight = opt === q.correct;
    setPicked(opt);
    setHistory((h) => [...h, { question: q, picked: opt, isRight }]);
    if (isRight) {
      correctHaptic();
      if (soundEnabled) playCorrectTone();
    } else {
      wrongHaptic();
      if (soundEnabled) playWrongTone();
    }
    advanceTimer.current = setTimeout(() => {
      setRun((r) => submitSpeedAnswer(r, isRight, Date.now()));
      setPicked(null);
      setIdx((i) => i + 1);
    }, FLASH_MS);
  }

  const left = remainingSpeedMs(run, now);
  const combo = comboMultiplier(run.combo);

  if (over) {
    const summary = speedRunSummary(run, run.endedAt ?? now);
    return (
      <ScrollView contentContainerStyle={styles.resultWrap}>
        <FadeInUp>
          <Text style={styles.eyebrow}>Speed Round complete</Text>
          <Text style={styles.resultCount}>{summary.score}</Text>
          <Text style={styles.resultLabel}>points</Text>
          <View style={styles.resultRow}>
            <View style={styles.resultStat}>
              <Text style={styles.resultStatValue}>{summary.correct}</Text>
              <Text style={styles.resultStatLabel}>CORRECT</Text>
            </View>
            <View style={styles.resultStat}>
              <Text style={styles.resultStatValue}>{summary.wrong}</Text>
              <Text style={styles.resultStatLabel}>WRONG</Text>
            </View>
            <View style={styles.resultStat}>
              <Text style={styles.resultStatValue}>{summary.bestCombo}x</Text>
              <Text style={styles.resultStatLabel}>BEST COMBO</Text>
            </View>
          </View>
          <PressableTint
            onPress={onFinish}
            radius={radius.pill}
            style={styles.primary}
            accessibilityRole="button"
          >
            <Text style={styles.primaryText}>Done</Text>
          </PressableTint>
        </FadeInUp>
      </ScrollView>
    );
  }

  const answered = picked !== null;
  const showsFlag =
    q &&
    (q.type === "flag" || q.type === "currency" || q.type === "language");
  const showsBadge = q && (q.type === "capital" || q.type === "capitalReverse");

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <View style={styles.topBar}>
        <Pressable onPress={onExit} style={styles.close} accessibilityLabel="End sprint">
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
        <Text style={styles.clock} accessibilityLabel="Time remaining">
          {formatClock(left)}
        </Text>
        <View style={styles.pillRow}>
          {run.combo >= 1 && (
            <View style={styles.comboPill}>
              <Text style={styles.comboText}>🔥 {combo}x</Text>
            </View>
          )}
          <View style={styles.scorePill}>
            <Text style={styles.scoreText}>{run.score}</Text>
          </View>
        </View>
      </View>

      {q && (
        <>
          <Text style={styles.prompt}>{q.prompt}</Text>

          <View style={styles.media}>
            {showsFlag && (
              <Image source={{ uri: flagUrl(q.country.code) }} style={styles.flag} resizeMode="contain" />
            )}
            {q.type === "shape" && (
              <View style={styles.shapeBox}>
                <CountryOutline code={q.country.code} />
              </View>
            )}
            {showsBadge && (
              <View style={styles.badge}>
                <Text style={styles.badgeGlyph}>
                  {q.type === "capital" ? q.country.region : "Capital"}
                </Text>
                <Text style={styles.badgeName}>
                  {q.type === "capital" ? q.country.name : q.country.capital}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.options}>
            {q.options.map((opt, i) => {
              const isCorrect = answered && opt === q.correct;
              const isWrong = answered && opt === picked && opt !== q.correct;
              return (
                <FadeInUp key={`${idx}-${opt}`} rise={0} delay={staggerDelay(i)}>
                  <Pressable
                    onPress={() => choose(opt)}
                    style={[styles.option, isCorrect && styles.optionCorrect, isWrong && styles.optionWrong]}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        (isCorrect || isWrong) && {
                          color: onFill(isCorrect ? colors.success : colors.danger),
                        },
                      ]}
                    >
                      {opt}
                    </Text>
                  </Pressable>
                </FadeInUp>
              );
            })}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    wrap: { paddingHorizontal: spacing(5), paddingTop: spacing(4), paddingBottom: spacing(12) },
    topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    close: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
    closeText: { ...type.h3, color: colors.textMuted },
    clock: { ...type.display, fontSize: 24 },
    pillRow: { flexDirection: "row", alignItems: "center", gap: spacing(2) },
    comboPill: {
      minWidth: 44,
      height: 32,
      paddingHorizontal: spacing(3),
      borderRadius: radius.pill,
      backgroundColor: colors.emberSurface,
      alignItems: "center",
      justifyContent: "center",
    },
    comboText: { ...type.label, color: colors.emberInk },
    scorePill: {
      minWidth: 44,
      height: 32,
      paddingHorizontal: spacing(3),
      borderRadius: radius.pill,
      backgroundColor: colors.successSurface,
      alignItems: "center",
      justifyContent: "center",
    },
    scoreText: { ...type.label, color: colors.successInk },

    prompt: { ...type.h3, marginTop: spacing(5) },

    media: { alignItems: "center", marginTop: spacing(4) },
    flag: { width: 220, height: 140, borderRadius: radius.card },
    shapeBox: { width: 220, height: 160, alignItems: "center", justifyContent: "center" },
    badge: {
      minWidth: 220,
      alignItems: "center",
      paddingVertical: spacing(5),
      paddingHorizontal: spacing(6),
      borderRadius: radius.sheet,
      borderWidth: 2,
      borderColor: colors.brand,
      borderBottomColor: colors.brandDeep,
      backgroundColor: colors.surfaceRaised,
    },
    badgeGlyph: { ...type.eyebrow },
    badgeName: { ...type.h2, marginTop: spacing(1) },

    options: { marginTop: spacing(5), gap: spacing(2) },
    option: {
      minHeight: buttonHeight.md,
      justifyContent: "center",
      paddingHorizontal: spacing(4),
      borderRadius: radius.sheet,
      backgroundColor: colors.surfaceRaised,
      ...hairline,
      ...elevation(1),
    },
    optionCorrect: { backgroundColor: colors.success },
    optionWrong: { backgroundColor: colors.danger },
    optionText: { ...type.body, fontSize: 16 },

    resultWrap: { padding: spacing(6), paddingTop: spacing(12), alignItems: "center" },
    eyebrow: { ...type.eyebrow, textAlign: "center" },
    resultCount: { ...type.display, fontSize: 72, textAlign: "center", marginTop: spacing(2) },
    resultLabel: { ...type.body, color: colors.textSecondary, textAlign: "center" },
    resultRow: { flexDirection: "row", gap: spacing(6), marginTop: spacing(6) },
    resultStat: { alignItems: "center" },
    resultStatValue: { ...type.h2 },
    resultStatLabel: { ...type.eyebrow, fontSize: 10, marginTop: 2 },
    primary: {
      marginTop: spacing(8),
      height: buttonHeight.md,
      minWidth: 200,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.brand,
      borderRadius: radius.pill,
    },
    primaryText: { ...type.label, fontSize: 15, color: onFill(colors.brand) },
  })
);
