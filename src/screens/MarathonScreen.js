/* global setInterval, clearInterval */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, useWindowDimensions } from "react-native";
import { colors, spacing, radius, type, elevation, hairline, buttonHeight, onFill } from "../theme";
import PressableTint from "../components/PressableTint";
import ProgressTrack from "../components/ProgressTrack";
import GlobeMap from "../components/GlobeMap";
import FadeInUp from "../components/FadeInUp";
import useGlobeGestures from "../hooks/useGlobeGestures";
import { MODES } from "../game/questions";
import { tierFor } from "../data/difficulties";
import { COUNTRIES, countryName } from "../data/countries";
import { COUNTRY_CENTERS } from "../data/worldGeo";
import { LOCATOR_COUNTRIES } from "../data/countries";
import { locatorView } from "../game/locatorRound";
import {
  startRun,
  submitAnswer,
  skipTarget,
  endRun,
  currentTarget,
  isOver,
  remainingMs,
  marathonScore,
} from "../game/marathon";
import { MARATHON_DURATION_MS, OPTIONS_PER_QUESTION } from "../constants";

// "Name Every Country" — the first pro marathon (M2.12 step 7).
//
// This screen owns exactly two things the pure engine deliberately does not:
// the real clock, and the rendering. Every decision about what a run IS —
// whether it is over, what the current target is, what an answer did, what it
// scored — comes from game/marathon.js, which never reads Date.now(). That
// split is what makes a five-minute timed game testable in a millisecond.
//
// Part 1 ships the Easy tier: a country lights up on the globe and you pick
// its name from four. It exercises the whole prompted run shape, which is also
// what step 8's flag marathon reuses wholesale.

const sample = (arr, n) => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return n == null ? copy : copy.slice(0, n);
};

const formatClock = (ms) => {
  const total = Math.ceil(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
};

export default function MarathonScreen({ mode, tier = "easy", onExit, onFinish }) {
  const meta = MODES[mode];
  const tierMeta = tierFor(mode, tier);

  // Only countries with a drawn outline can be the subject: the prompt is "this
  // country is highlighted", and a country with no shape cannot be highlighted.
  const targets = useMemo(() => sample(LOCATOR_COUNTRIES.map((c) => c.code)), []);

  const [run, setRun] = useState(() => startRun({ tier, targets, now: Date.now() }));
  const [now, setNow] = useState(() => Date.now());
  const [picked, setPicked] = useState(null);
  const advanceTimer = useRef(null);

  const over = isOver(run, now);
  const target = currentTarget(run, now);

  // The single real interval in the whole feature. Everything it feeds is a
  // pure function of `now`.
  useEffect(() => {
    if (over) return undefined;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [over]);

  // Close the run exactly once when it ends, whichever way it ended. endRun is
  // idempotent, so a clock expiry and an unmount cannot stamp two times.
  useEffect(() => {
    if (!over || run.endedAt !== null) return;
    setRun((r) => endRun(r, Date.now()));
  }, [over, run.endedAt]);

  useEffect(() => () => clearTimeout(advanceTimer.current), []);

  // Four names, one of them right. Rebuilt per target rather than per render,
  // or the options would reshuffle under the player's thumb.
  const options = useMemo(() => {
    if (!target) return [];
    const wrong = sample(
      COUNTRIES.filter((c) => c.code !== target),
      OPTIONS_PER_QUESTION - 1
    ).map((c) => c.name);
    return sample([countryName(target), ...wrong]);
  }, [target]);

  const framing = useMemo(
    () => (target ? locatorView([target], COUNTRY_CENTERS) : { spin: { lng: 0, lat: 0 }, zoom: 1 }),
    [target]
  );

  const globe = useGlobeGestures({
    initialSpin: framing.spin,
    initialZoom: framing.zoom,
    axisLock: true,
  });
  const { snapTo } = globe;
  useEffect(() => {
    snapTo(framing.zoom, framing.spin);
  }, [framing, snapTo]);

  const answer = useCallback(
    (name) => {
      if (picked || over) return;
      setPicked(name);
      const result = submitAnswer(run, name, {
        now: Date.now(),
        isMatch: (value, code) => value === countryName(code),
      });
      // A beat on the reveal, then the next country. Short, because the whole
      // premise is "how many can you get" and a long celebration is time taken
      // off the player's own clock.
      advanceTimer.current = setTimeout(() => {
        setRun(result.run);
        setPicked(null);
      }, 550);
    },
    [picked, over, run]
  );

  const score = marathonScore(run, now);
  const left = remainingMs(run, now);
  const { height } = useWindowDimensions();
  const stageHeight = Math.min(460, height * 0.42);

  if (over) {
    return (
      <ScrollView contentContainerStyle={styles.resultWrap}>
        <FadeInUp>
          <Text style={styles.eyebrow}>{tierMeta?.label ?? "Run"} complete</Text>
          <Text style={styles.resultCount}>{score.found}</Text>
          <Text style={styles.resultLabel}>
            {score.found === 1 ? "country named" : "countries named"}
          </Text>
          <View style={styles.resultRow}>
            <View style={styles.resultStat}>
              <Text style={styles.resultStatValue}>{formatClock(score.elapsedMs)}</Text>
              <Text style={styles.resultStatLabel}>TIME</Text>
            </View>
            <View style={styles.resultStat}>
              <Text style={styles.resultStatValue}>{score.missed}</Text>
              <Text style={styles.resultStatLabel}>MISSED</Text>
            </View>
            <View style={styles.resultStat}>
              <Text style={styles.resultStatValue}>{score.score}</Text>
              <Text style={styles.resultStatLabel}>SCORE</Text>
            </View>
          </View>
          <PressableTint
            onPress={() => onFinish?.(score)}
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

  return (
    <View style={styles.wrap}>
      <View style={styles.topBar}>
        <Pressable onPress={onExit} style={styles.close} accessibilityLabel="End run">
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
        <Text style={styles.clock}>{formatClock(left)}</Text>
        <View style={styles.counter}>
          <Text style={styles.counterText}>{score.found}</Text>
        </View>
      </View>

      <ProgressTrack
        progress={1 - left / MARATHON_DURATION_MS}
        style={styles.track}
        accessibilityLabel="Time remaining"
      />

      <Text style={styles.prompt}>{meta?.title ?? "Name every country"}</Text>
      <Text style={styles.sub}>Which country is highlighted?</Text>

      <View style={[styles.stage, { height: stageHeight }]} {...globe.surfaceProps}>
        <GlobeMap spin={globe.spin} zoom={globe.zoom} basemap="simple" highlightCode={target} />
      </View>

      <View style={styles.options}>
        {options.map((name) => {
          const isPicked = picked === name;
          const right = picked && name === countryName(target);
          return (
            <Pressable
              key={name}
              onPress={() => answer(name)}
              style={[
                styles.option,
                right && styles.optionCorrect,
                isPicked && !right && styles.optionWrong,
              ]}
              accessibilityRole="button"
            >
              <Text
                style={[
                  styles.optionText,
                  (right || (isPicked && !right)) && styles.optionResolved,
                ]}
              >
                {name}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        onPress={() => {
          setRun((r) => skipTarget(r, Date.now()));
          setPicked(null);
        }}
        style={styles.skip}
        accessibilityRole="button"
      >
        <Text style={styles.skipText}>Skip ›</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: spacing(5), paddingTop: spacing(4) },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  close: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  closeText: { ...type.h3, color: colors.textMuted },
  clock: { ...type.display, fontSize: 24 },
  counter: {
    minWidth: 44,
    height: 32,
    paddingHorizontal: spacing(3),
    borderRadius: radius.pill,
    backgroundColor: colors.successSurface,
    alignItems: "center",
    justifyContent: "center",
  },
  counterText: { ...type.label, color: colors.successInk },
  track: { marginTop: spacing(2) },

  prompt: { ...type.eyebrow, marginTop: spacing(4) },
  sub: { ...type.h3, marginTop: spacing(1) },

  stage: {
    marginTop: spacing(3),
    borderRadius: radius.sheet,
    overflow: "hidden",
    backgroundColor: colors.map?.ocean ?? colors.brandDeep,
  },

  options: { marginTop: spacing(4), gap: spacing(2) },
  option: {
    minHeight: buttonHeight,
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
  optionResolved: { color: colors.onFill },

  skip: { alignSelf: "center", paddingVertical: spacing(3), marginTop: spacing(2) },
  skipText: { ...type.label, color: colors.link },

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
    height: buttonHeight,
    minWidth: 200,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brand,
    borderRadius: radius.pill,
  },
  primaryText: { ...type.label, fontSize: 15, color: onFill(colors.brand) },
});
