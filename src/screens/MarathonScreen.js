/* global setInterval, clearInterval, setTimeout, clearTimeout */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  Pressable,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import {
  colors,
  spacing,
  radius,
  type,
  elevation,
  hairline,
  buttonHeight,
  onFill,
  map,
  themed,
} from "../theme";
import PressableTint from "../components/PressableTint";
import ProgressTrack from "../components/ProgressTrack";
import GlobeMap from "../components/GlobeMap";
import FadeInUp from "../components/FadeInUp";
import TypeAnswer from "../components/TypeAnswer";
import useGlobeGestures from "../hooks/useGlobeGestures";
import { MODES } from "../game/questions";
import { tierFor } from "../data/difficulties";
import { COUNTRIES, LOCATOR_COUNTRIES, countryName, flagUrl } from "../data/countries";
import { COUNTRY_CENTERS } from "../data/worldGeo";
import { locatorView } from "../game/locatorRound";
import { matchAnswer, isCorrectAnswer } from "../game/answerMatch";
import {
  startRun,
  submitAnswer,
  skipTarget,
  endRun,
  currentTarget,
  isOver,
  remainingMs,
  remaining,
  marathonScore,
  elapsedMs,
  isStopwatch,
  marathonResultCountries,
  marathonRoundResult,
} from "../game/marathon";
import {
  marathonPresentation,
  marathonUsesGlobe,
  marathonHighlights,
  marathonIsRecall,
  marathonHint,
  marathonClock,
} from "../game/marathonTiers";
import { MARATHON_DURATION_MS, OPTIONS_PER_QUESTION } from "../constants";
import { bestKey, recordResult, formatElapsed } from "../game/bestTimePolicy";
import GlobeZoomControls from "../components/GlobeZoomControls";

// The two pro marathons (M2.12 steps 7-8) — one screen, because the tiers
// differ only in how a target is prompted and how it is answered, and
// game/marathonTiers.js states that as a table.
//
// This file owns exactly two things the pure engine deliberately does not: the
// real clock, and the rendering. Every decision about what a run IS — whether
// it is over, what the current target is, what an answer did, what it scored —
// comes from game/marathon.js, which never reads Date.now(). That split is
// what makes a five-minute timed game testable in a millisecond.

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

// Every country name, for the typed tiers' matcher and suggestions.
const ALL_NAMES = COUNTRIES.map((c) => c.name);

// `onComplete(round)` fires ONCE when a sitting ends, with the round object
// game/marathon.js's marathonRoundResult builds — App persists it the same way
// a quiz round is persisted. `onOpenReview` is the end screen's "study what you
// missed" link.
export default function MarathonScreen({
  mode,
  tier = "easy",
  onExit,
  onFinish,
  onComplete,
  onOpenReview,
  personalBests = null,
}) {
  const meta = MODES[mode];
  const tierMeta = tierFor(mode, tier);
  const look = marathonPresentation(mode, tier);
  const usesGlobe = marathonUsesGlobe(mode, tier);
  const highlightsTarget = marathonHighlights(mode, tier);
  const isRecall = marathonIsRecall(mode, tier);

  // Which countries can be asked about at all.
  //
  // A tier that HIGHLIGHTS or TAPS the globe can only use countries with a
  // drawn outline — you cannot light up, or tap, a country that has no shape.
  // A flag tier has no such limit, and nor does free recall: its globe is a
  // blank backdrop and its answers are typed, so it asks for all 196.
  const needsOutline = usesGlobe && !isRecall;
  const targets = useMemo(
    () => sample((needsOutline ? LOCATOR_COUNTRIES : COUNTRIES).map((c) => c.code)),
    [needsOutline]
  );
  const stopwatch = marathonClock(mode) === "stopwatch";

  const [run, setRun] = useState(() =>
    startRun({
      tier,
      targets,
      now: Date.now(),
      // null = no limit: the clock counts UP and the time taken is the result.
      durationMs: stopwatch ? null : MARATHON_DURATION_MS,
    })
  );
  const [now, setNow] = useState(() => Date.now());
  const [picked, setPicked] = useState(null);
  const [lastOutcome, setLastOutcome] = useState(null); // recall's running feedback
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

  // Close the run exactly once, whichever way it ended. endRun is idempotent,
  // so a clock expiry and an unmount cannot stamp two different times.
  useEffect(() => {
    if (!over || run.endedAt !== null) return;
    setRun((r) => endRun(r, Date.now()));
  }, [over, run.endedAt]);

  useEffect(() => () => clearTimeout(advanceTimer.current), []);

  // Report the finished sitting exactly once — the run is stamped once
  // (endRun is idempotent), and a ref guards against a re-render re-firing.
  const reported = useRef(false);
  // Judged against the bests AS THEY WERE when the sitting ended — once App
  // records this run, the live map already contains it and every run would
  // read as merely "equal to your best".
  const [bestOutcome, setBestOutcome] = useState(null);
  useEffect(() => {
    if (run.endedAt === null || reported.current) return;
    reported.current = true;
    const result = marathonRoundResult(run, { mode, now: run.endedAt });
    setBestOutcome(
      recordResult(personalBests, bestKey({ mode, tier: result.tier, total: result.total }), {
        score: result.score,
        total: result.total,
        elapsedMs: result.elapsedMs,
      })
    );
    onComplete?.(result);
    // onComplete is an inline prop; the run's end is the only trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run.endedAt]);

  // Stop a stopwatch run by hand — the "I'm done" a run with no time limit
  // needs, especially free recall, which otherwise only ends at all 196.
  const finishNow = useCallback(() => {
    clearTimeout(advanceTimer.current);
    setPicked(null);
    setRun((r) => endRun(r, Date.now()));
  }, []);

  // Four names, one right. Rebuilt per target rather than per render, or they
  // would reshuffle under the player's thumb.
  const options = useMemo(() => {
    if (!target || look.answer !== "choices") return [];
    const wrong = sample(
      COUNTRIES.filter((c) => c.code !== target),
      OPTIONS_PER_QUESTION - 1
    ).map((c) => c.name);
    return sample([countryName(target), ...wrong]);
  }, [target, look.answer]);

  // Where the globe points.
  //
  // On a recall tier it never moves on its own: there is no target to frame,
  // and the player spins the blank Earth themselves. On a tier where the globe
  // is the ANSWER surface (Medium), it must NOT frame the target either — that
  // would point straight at the answer. Only the highlight tiers frame.
  const framing = useMemo(() => {
    if (!highlightsTarget || !target) return null;
    return locatorView([target], COUNTRY_CENTERS);
  }, [highlightsTarget, target]);

  const globe = useGlobeGestures({
    initialSpin: { lng: -20, lat: 15 },
    initialZoom: 1,
    axisLock: true,
    wheelZoomEnabled: "modifier",
  });
  const { snapTo } = globe;
  useEffect(() => {
    if (framing) snapTo(framing.zoom, framing.spin);
  }, [framing, snapTo]);

  // One comparison for every tier, so a tier change can never silently change
  // what counts as right. Typed tiers go through the fuzzy matcher (a close
  // spelling earns it); everything else compares the country's own name.
  const isMatch = useCallback(
    (value, code) =>
      look.answer === "type"
        ? isCorrectAnswer(matchAnswer(value, countryName(code), ALL_NAMES))
        : value === countryName(code),
    [look.answer]
  );

  const commit = useCallback(
    (value, { immediate = false } = {}) => {
      if (over) return;
      const result = submitAnswer(run, value, { now: Date.now(), isMatch });
      setLastOutcome({ outcome: result.outcome, value, target: result.target });
      if (immediate) {
        setRun(result.run);
        setPicked(null);
        return;
      }
      setPicked(value);
      // A short beat on the reveal — the premise is "how many can you get",
      // and a long celebration is time off the player's own clock.
      advanceTimer.current = setTimeout(() => {
        setRun(result.run);
        setPicked(null);
      }, 550);
    },
    [over, run, isMatch]
  );

  // A recall answer never waits: there is no target to reveal, and pausing
  // half a second per entry would cost a fast player a dozen countries.
  const answerRecall = useCallback((value) => commit(value, { immediate: true }), [commit]);

  // The globe as an answer surface (Medium): tapping a country IS the answer.
  const answerGlobe = useCallback((code) => commit(countryName(code)), [commit]);

  const score = marathonScore(run, now);
  const left = remainingMs(run, now);
  const spent = elapsedMs(run, now);
  const { height } = useWindowDimensions();
  const stageHeight = Math.min(460, height * (isRecall ? 0.34 : 0.42));

  if (over) {
    // Missed = what the run actually got wrong or never named (see
    // marathonResultCountries) — the same list that was just persisted.
    const missedCodes = marathonResultCountries(run)
      .filter((c) => !c.correct)
      .map((c) => c.code);
    const unfound = isStopwatch(run) ? missedCodes : remaining(run);
    return (
      <ScrollView contentContainerStyle={styles.resultWrap}>
        <FadeInUp>
          <Text style={styles.eyebrow}>{tierMeta?.label ?? "Run"} complete</Text>
          <Text style={styles.resultCount}>{score.found}</Text>
          <Text style={styles.resultLabel}>
            {score.total
              ? `of ${score.total} ${score.total === 1 ? "country" : "countries"} named`
              : score.found === 1
                ? "country named"
                : "countries named"}
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
          {score.completedAll && score.speedBonus > 0 && (
            <Text style={styles.resultBonus}>
              Every one — {score.speedBonus} bonus for finishing under par.
            </Text>
          )}
          {/* Racing yourself: the celebration, or the best still to beat. */}
          {bestOutcome?.newBest ? (
            <View style={styles.newBestPill}>
              <Text style={styles.newBestText}>
                ★ New personal best
                {bestOutcome.previous
                  ? ` — was ${bestOutcome.previous.score} in ${formatElapsed(bestOutcome.previous.elapsedMs)}`
                  : ""}
              </Text>
            </View>
          ) : bestOutcome?.best ? (
            <Text style={styles.bestLine}>
              Your best: {bestOutcome.best.score} in {formatElapsed(bestOutcome.best.elapsedMs)}
            </Text>
          ) : null}
          {/* The teaching half. A count alone says how you did; this says what
              to go and learn, which is the only part that improves the next run.
              A stopwatch run lists EVERY miss (it was persisted for Review, so
              hiding most of it here would be the odd one out). */}
          {unfound.length > 0 && (isStopwatch(run) || unfound.length <= 60) && (
            <View style={styles.missedCard}>
              <Text style={styles.missedKicker}>
                {isStopwatch(run) ? `MISSED · ${unfound.length}` : "STILL TO LEARN"}
              </Text>
              <Text style={styles.missedList}>
                {unfound.map((code) => countryName(code)).join(" · ")}
              </Text>
              {isStopwatch(run) && onOpenReview && (
                <Pressable
                  onPress={onOpenReview}
                  style={styles.reviewLink}
                  accessibilityRole="link"
                >
                  <Text style={styles.reviewLinkText}>Study these in Review ›</Text>
                </Pressable>
              )}
            </View>
          )}
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
    <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
      <View style={styles.topBar}>
        <Pressable onPress={onExit} style={styles.close} accessibilityLabel="End run">
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
        {/* A stopwatch counts up from 0:00; a countdown shows what is left. */}
        <Text
          style={styles.clock}
          accessibilityLabel={stopwatch ? "Time elapsed" : "Time remaining"}
        >
          {formatClock(stopwatch ? spent : left)}
        </Text>
        <View style={styles.counter}>
          <Text style={styles.counterText}>{score.found}</Text>
        </View>
      </View>

      {/* The bar tracks the thing that ends the run: the countdown's clock, or
          a stopwatch run's progress through every country. */}
      <ProgressTrack
        value={
          stopwatch
            ? score.total
              ? score.found / score.total
              : 0
            : 1 - left / MARATHON_DURATION_MS
        }
        style={styles.track}
        accessibilityLabel={stopwatch ? "Countries named" : "Time remaining"}
      />
      {stopwatch && (
        <Text style={styles.namedReadout}>
          {score.found} of {score.total} named
        </Text>
      )}

      <Text style={styles.prompt}>{meta?.title ?? "Marathon"}</Text>
      <Text style={styles.sub}>{marathonHint(mode, tier)}</Text>

      {/* The prompt. "name" is the only one that is text — on every other tier
          the prompt is the media below. */}
      {look.prompt === "name" && target && (
        <Text style={styles.targetName}>{countryName(target)}</Text>
      )}

      {look.prompt === "flag" && target && (
        <View style={styles.flagBox}>
          <Image source={{ uri: flagUrl(target) }} style={styles.flag} resizeMode="contain" />
        </View>
      )}

      {usesGlobe && (
        <View style={[styles.stage, { height: stageHeight }]} {...globe.surfaceProps}>
          <GlobeMap
            spin={globe.spin}
            zoom={globe.zoom}
            basemap="simple"
            highlightCode={highlightsTarget ? target : null}
            onSelect={look.answer === "globe" ? answerGlobe : undefined}
          />
          <GlobeZoomControls globe={globe} />
        </View>
      )}

      {look.answer === "choices" && (
        <View style={styles.options}>
          {options.map((name) => {
            const isPicked = picked === name;
            const right = picked && name === countryName(target);
            return (
              <Pressable
                key={name}
                onPress={() => !picked && commit(name)}
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
      )}

      {look.answer === "type" && !isRecall && (
        <TypeAnswer
          key={`type-${run.index}`}
          suggest={look.suggest}
          pool={ALL_NAMES}
          answered={Boolean(picked)}
          result={picked ? (lastOutcome?.outcome === "correct" ? "match" : "miss") : null}
          correct={target ? countryName(target) : null}
          submitted={picked ?? ""}
          onSubmit={commit}
        />
      )}

      {/* Recall: the field never resolves and never blocks. Keyed on how many
          have been found so it clears after each entry, which is what lets
          someone type continuously. */}
      {isRecall && (
        <View>
          <TypeAnswer
            key={`recall-${run.found.length}-${run.missed.length}`}
            suggest={false}
            pool={ALL_NAMES}
            answered={false}
            onSubmit={answerRecall}
          />
          {lastOutcome && (
            <Text
              style={[
                styles.recallNote,
                lastOutcome.outcome === "correct" && styles.recallOk,
                lastOutcome.outcome === "duplicate" && styles.recallDupe,
              ]}
            >
              {lastOutcome.outcome === "correct"
                ? `✓ ${countryName(lastOutcome.target)}`
                : lastOutcome.outcome === "duplicate"
                  ? `Already had ${countryName(lastOutcome.target)}`
                  : `${lastOutcome.value} isn't one`}
            </Text>
          )}
          <View style={styles.foundWrap}>
            {run.found
              .slice()
              .reverse()
              .slice(0, 24)
              .map((code) => (
                <View key={code} style={styles.chip}>
                  <Text style={styles.chipText}>{countryName(code)}</Text>
                </View>
              ))}
          </View>
        </View>
      )}

      {!isRecall && (
        <Pressable
          onPress={() => {
            if (picked) return;
            setRun((r) => skipTarget(r, Date.now()));
            setLastOutcome(null);
          }}
          style={styles.skip}
          accessibilityRole="button"
        >
          <Text style={styles.skipText}>Skip ›</Text>
        </Pressable>
      )}

      {stopwatch && (
        <PressableTint
          onPress={finishNow}
          radius={radius.pill}
          style={styles.finish}
          accessibilityRole="button"
          accessibilityLabel="Finish — stop the clock and see your result"
        >
          <Text style={styles.finishText}>Finish</Text>
        </PressableTint>
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
    namedReadout: { ...type.label, color: colors.textSecondary, marginTop: spacing(2) },
    finish: {
      alignSelf: "center",
      marginTop: spacing(2),
      minHeight: buttonHeight.md,
      paddingHorizontal: spacing(8),
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radius.pill,
      ...hairline,
    },
    finishText: { ...type.label, fontSize: 15, color: colors.text },
    reviewLink: { marginTop: spacing(4), minHeight: 44, justifyContent: "center" },
    reviewLinkText: { ...type.label, fontSize: 14, color: colors.link },

    prompt: { ...type.eyebrow, marginTop: spacing(4) },
    sub: { ...type.h3, marginTop: spacing(1) },
    targetName: { ...type.display, fontSize: 34, marginTop: spacing(3) },

    flagBox: { alignItems: "center", marginTop: spacing(4) },
    flag: { width: 220, height: 140, borderRadius: radius.card },

    stage: {
      marginTop: spacing(3),
      borderRadius: radius.sheet,
      overflow: "hidden",
      backgroundColor: map.ocean,
    },

    options: { marginTop: spacing(4), gap: spacing(2) },
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
    // success and danger take the same ink in either scheme (parchment in
    // light, nightwood on the lifted dark fills), so one style covers both.
    optionResolved: { color: onFill(colors.success) },

    recallNote: { ...type.caption, marginTop: spacing(2) },
    recallOk: { color: colors.successInk },
    recallDupe: { color: colors.emberInk },
    foundWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing(2), marginTop: spacing(3) },
    chip: {
      backgroundColor: colors.successSurface,
      borderRadius: radius.pill,
      paddingHorizontal: spacing(3),
      paddingVertical: spacing(1),
    },
    chipText: { ...type.caption, color: colors.successInk },

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
    newBestPill: {
      marginTop: spacing(4),
      alignSelf: "center",
      backgroundColor: colors.brass,
      borderRadius: radius.pill,
      paddingHorizontal: spacing(4),
      paddingVertical: spacing(2),
    },
    newBestText: { ...type.label, fontSize: 14, color: onFill(colors.brass) },
    bestLine: {
      ...type.label,
      color: colors.textSecondary,
      marginTop: spacing(4),
      textAlign: "center",
    },
    resultBonus: {
      ...type.caption,
      color: colors.successInk,
      marginTop: spacing(4),
      textAlign: "center",
    },
    missedCard: {
      marginTop: spacing(6),
      backgroundColor: colors.surfaceRaised,
      borderRadius: radius.sheet,
      padding: spacing(5),
      ...hairline,
    },
    missedKicker: { ...type.eyebrow },
    missedList: {
      ...type.body,
      color: colors.textSecondary,
      marginTop: spacing(2),
      lineHeight: 24,
    },
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
