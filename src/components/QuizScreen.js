/* global setTimeout, clearTimeout */
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  ScrollView,
  Animated,
  Easing,
  useWindowDimensions,
} from "react-native";
import { colors, spacing, radius, type, elevation, constrain, motion, map } from "../theme";
import Container from "./Container";
import FadeInUp, { staggerDelay } from "./FadeInUp";
import { MODES, buildRound, buildDaily, buildCountryRound } from "../game/questions";
import { computeXp } from "../game/scoring";
import { streakBonusXp, metricReadout } from "../game/higherLower";
import { countriesFromHistory } from "../game/cloudSync";
import { flagUrl } from "../data/countries";
import { whyItMatters } from "../data/whyItMatters";
import { DIFFICULTIES, DEFAULT_DIFFICULTY, TIMED_SECONDS_PER_QUESTION } from "../constants";
import { correctHaptic, wrongHaptic } from "../haptics";
import { playCorrectTone, playWrongTone } from "../audio/sound";
import CountryOutline from "./CountryOutline";
import GlobeMap from "./GlobeMap";
import BasemapToggle from "./BasemapToggle";
import { locatorView } from "../game/locatorRound";
import useGlobeGestures from "../hooks/useGlobeGestures";
import { COUNTRY_CENTERS } from "../data/worldGeo";

const TIMEOUT = "__timeout__"; // sentinel "picked" value for an unanswered, expired question

// A single reusable quiz surface that powers all game modes.
export default function QuizScreen({
  mode,
  difficulty = DEFAULT_DIFFICULTY,
  timed = false,
  soundEnabled = true,
  onToggleSound,
  onExit,
  onPlayAgain,
  onFinish,
  onOpenCountry,
  countryCode = null,
  basemap,
  onChangeBasemap,
}) {
  const meta = MODES[mode];
  const questions = useMemo(() => {
    if (mode === "daily") return buildDaily();
    // A country round is the one mode whose questions depend on something other
    // than the mode itself, so it takes the subject rather than the difficulty
    // tier — "hard mode Brazil" isn't a thing; Brazil is the whole pool.
    if (mode === "country") return countryCode ? buildCountryRound(countryCode) : [];
    return buildRound(mode, difficulty);
  }, [mode, difficulty, countryCode]);
  const difficultyLabel = DIFFICULTIES.find((d) => d.key === difficulty)?.label;
  const timedActive = timed && mode !== "daily"; // Daily always stays untimed

  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  // The best run reached this round, not the current one. Higher or Lower
  // scores the chain, and the current streak is zero by the time the round ends
  // if the last answer was wrong — which would silently pay nothing for a run
  // of seven.
  const [bestStreak, setBestStreak] = useState(0);

  // One expression for the round's XP, used by both the value reported to
  // onFinish and the one the results screen prints. They were separate
  // computeXp() calls; adding a mode-specific bonus to one and not the other
  // would have shown the player a different number than the one saved.
  const roundXp = (finalScore, best) =>
    computeXp(finalScore) + (mode === "higherLower" ? streakBonusXp(best) : 0);
  const [picked, setPicked] = useState(null); // selected option
  const [done, setDone] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIMED_SECONDS_PER_QUESTION);
  const [history, setHistory] = useState([]); // per-question record, for the results review

  const q = questions[idx];
  const answered = picked !== null;

  // Where the globe STARTS for a locator question. Recomputed per question, not
  // per render: the framing is a property of the round, and recomputing it on
  // every tap would snap the globe back and undo any spinning the player did
  // while thinking.
  const locatorFraming = useMemo(
    () =>
      q?.type === "locator"
        ? locatorView(
            q.choices.map((c) => c.code),
            COUNTRY_CENTERS
          )
        : { spin: { lng: 0, lat: 0 }, zoom: 1 },
    [q]
  );

  // The locator's globe is a real globe: drag to spin, pinch/scroll to zoom,
  // flick to coast — the same gesture layer the Explore map uses, which is the
  // whole reason it was extracted into a hook. Until then this screen passed
  // two constants and the "globe" was a still photograph you could tap.
  //
  // The hook is created unconditionally because hooks cannot be conditional;
  // on a non-locator question it simply holds a view nothing renders.
  const globe = useGlobeGestures({
    initialSpin: locatorFraming.spin,
    initialZoom: locatorFraming.zoom,
    // Horizontal spins, vertical scrolls to the rest of the question. The
    // answer surface fills the screen on a phone, so claiming every vertical
    // swipe would trap the page.
    axisLock: true,
    onManualChange: () => setGlobeMoved(true),
  });

  // Leave room for the prompt above and the review card below rather than
  // letting a square stage push them off a short screen.
  const { height: windowHeight } = useWindowDimensions();
  const locatorStageHeight = Math.min(560, windowHeight * 0.56);
  const [globeMoved, setGlobeMoved] = useState(false);

  // A new question means new candidates, so the globe snaps to their framing.
  // snapTo, not animateTo: the question has already changed on screen, and a
  // globe still gliding toward the new framing while the prompt reads the new
  // country invites answering against the old view.
  const { snapTo: snapGlobe } = globe;
  useEffect(() => {
    if (q?.type !== "locator") return;
    snapGlobe(locatorFraming.zoom, locatorFraming.spin);
    setGlobeMoved(false);
  }, [q, locatorFraming, snapGlobe]);

  // Animated progress-bar fill, a gentle fade/rise-in per question, and a
  // small pulse on the option the player just tapped.
  const progressAnim = useRef(new Animated.Value(0)).current;
  const bodyAnim = useRef(new Animated.Value(0)).current;
  const pickAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: questions.length ? idx / questions.length : 0,
      duration: motion.duration.sheet,
      easing: Easing.bezier(...motion.easing),
      useNativeDriver: false, // animating layout `width`, not a transform
    }).start();
  }, [idx, questions.length, progressAnim]);

  useEffect(() => {
    bodyAnim.setValue(0);
    Animated.timing(bodyAnim, {
      toValue: 1,
      duration: motion.duration.ui,
      easing: Easing.bezier(...motion.easing),
      useNativeDriver: true,
    }).start();
  }, [idx, bodyAnim]);

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
    const isRight = opt === q.correct;
    if (isRight) {
      setScore((s) => s + 1);
      setStreak((s) => {
        const next = s + 1;
        setBestStreak((b) => Math.max(b, next));
        return next;
      });
    } else {
      setStreak(0);
    }

    if (isRight) {
      correctHaptic();
      if (soundEnabled) playCorrectTone();
    } else {
      wrongHaptic();
      if (soundEnabled) playWrongTone();
    }

    pickAnim.setValue(1);
    Animated.sequence([
      Animated.timing(pickAnim, { toValue: 1.06, duration: 90, useNativeDriver: true }),
      Animated.spring(pickAnim, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();
  }

  // Resolve what to show for a picked value — for locator, `picked` is a
  // country code, so it needs mapping back to the name the player saw.
  function answerLabel(question, value) {
    if (value === TIMEOUT) return "No answer";
    if (question.type === "locator") {
      return question.choices.find((c) => c.code === value)?.name ?? value;
    }
    return value;
  }

  function next() {
    const entry = { question: q, picked, isRight: picked === q.correct };
    const nextHistory = [...history, entry];
    if (idx + 1 >= questions.length) {
      // Higher or Lower alone pays for the chain. Folding this into computeXp()
      // would change XP for every other mode, which none of them earned.
      const xp = roundXp(score, bestStreak);
      setHistory(nextHistory);
      setDone(true);
      // Report what the round actually was, not what was requested: the Daily
      // ignores both difficulty and the timer, and game_results should record
      // the round that happened.
      onFinish &&
        onFinish({
          mode,
          difficulty: mode === "daily" ? DEFAULT_DIFFICULTY : difficulty,
          timed: timedActive,
          score,
          total: questions.length,
          xp,
          countries: countriesFromHistory(nextHistory),
        });
    } else {
      setHistory(nextHistory);
      setIdx((i) => i + 1);
      setPicked(null);
    }
  }

  if (done) {
    const xp = roundXp(score, bestStreak);
    const pct = Math.round((score / questions.length) * 100);
    return (
      <ScrollView
        style={styles.resultWrap}
        contentContainerStyle={styles.resultContent}
        showsVerticalScrollIndicator={false}
      >
        <Container>
          <FadeInUp>
            <View style={[styles.resultCard, { backgroundColor: meta.accent }]}>
              <Text style={styles.resultKicker}>{meta.title}</Text>
              <Text style={styles.resultScore}>
                {score}/{questions.length}
              </Text>
              <Text style={styles.resultPct}>{pct}% correct</Text>
              <View style={styles.xpPill}>
                <Text style={styles.xpPillText}>+{xp} XP</Text>
              </View>
            </View>
          </FadeInUp>

          <FadeInUp index={1}>
            <Text style={styles.reviewHeading}>Round review</Text>
          </FadeInUp>
          <View style={styles.reviewList}>
            {history.map((entry, i) => (
              <FadeInUp key={i} delay={motion.stagger * 2 + staggerDelay(i)}>
                <View style={styles.reviewCard}>
                  <View style={styles.reviewRow}>
                    <Text
                      style={[
                        styles.reviewMark,
                        entry.isRight ? styles.reviewMarkRight : styles.reviewMarkWrong,
                      ]}
                    >
                      {entry.isRight ? "✓" : "✕"}
                    </Text>
                    <Text style={styles.reviewPrompt}>{entry.question.prompt}</Text>
                  </View>
                  {!entry.isRight && (
                    <Text style={styles.reviewAnswer}>
                      You said {answerLabel(entry.question, entry.picked)} — the answer was{" "}
                      {entry.question.correct}
                    </Text>
                  )}
                  <Text style={styles.reviewFact}>{whyItMatters(entry.question.country)}</Text>
                </View>
              </FadeInUp>
            ))}
          </View>

          {/* A finished round used to end on one button back to Home — a dead
              end at the exact moment momentum is highest. Play again is the
              primary action now, and Done returns to wherever the round was
              started from (a learning path, a country page, Home), which the
              nav stack knows and this screen no longer has to guess. */}
          <FadeInUp delay={motion.stagger * 3}>
            {onPlayAgain && (
              <Pressable
                style={[styles.primaryBtn, { backgroundColor: meta.accent }]}
                onPress={onPlayAgain}
              >
                <Text style={styles.primaryBtnText}>Play again</Text>
              </Pressable>
            )}
            <Pressable style={styles.secondaryBtn} onPress={onExit}>
              <Text style={styles.secondaryBtnText}>Done</Text>
            </Pressable>
          </FadeInUp>
        </Container>
      </ScrollView>
    );
  }

  return (
    <View style={styles.wrap}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable onPress={onExit} hitSlop={12}>
          <Text style={styles.exit}>✕</Text>
        </Pressable>
        <View style={styles.progressTrack}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0%", "100%"],
                }),
                backgroundColor: meta.accent,
              },
            ]}
          />
        </View>
        {timedActive && (
          <View style={[styles.timerPill, timeLeft <= 3 && styles.timerPillLow]}>
            <Text style={[styles.timerText, timeLeft <= 3 && styles.timerTextLow]}>
              ⏱ {timeLeft}s
            </Text>
          </View>
        )}
        <Pressable onPress={onToggleSound} hitSlop={12} style={styles.soundPill}>
          <Text style={styles.soundText}>{soundEnabled ? "🔊" : "🔇"}</Text>
        </Pressable>
        <View style={styles.streakPill}>
          <Text style={styles.streakText}>🔥 {streak}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Container>
          <Animated.View
            style={{
              opacity: bodyAnim,
              transform: [
                { translateY: bodyAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) },
              ],
            }}
          >
            <Text style={styles.counter}>
              Question {idx + 1} of {questions.length}
              {mode !== "daily" && difficulty !== DEFAULT_DIFFICULTY ? ` · ${difficultyLabel}` : ""}
            </Text>
            <Text style={styles.prompt}>{q.prompt}</Text>
            {/* Keyed off the QUESTION's type, never the round's mode. A
                country round ("Play with Brazil") mixes a locator question in
                among fact questions, and a locator question rendered as plain
                text options is not merely plainer — its `correct` is an ISO
                code while its options are names, so every answer would be
                marked wrong. */}
            {q.type === "locator" && (
              <Text style={styles.mapHint}>Drag to spin · pinch or scroll to zoom</Text>
            )}

            {/* Country Locator: the globe is both prompt media and answer
                surface (M2.3.7 step 2). It opens framed on this question's
                candidates so every choice is on the near face — which does not
                give the answer away, since all of them are visible — and the
                player can still spin freely from there. */}
            {q.type === "locator" ? (
              <View
                style={[styles.mapBox, { maxHeight: locatorStageHeight }]}
                {...globe.surfaceProps}
              >
                <GlobeMap
                  spin={globe.spin}
                  zoom={globe.zoom}
                  onSelect={choose}
                  basemap={basemap}
                  locator={{
                    choices: q.choices,
                    correctCode: q.correct,
                    pickedCode: picked,
                    answered,
                  }}
                />
                <BasemapToggle
                  value={basemap}
                  onChange={onChangeBasemap}
                  style={styles.basemapToggle}
                />
                {/* Spinning far enough can carry every candidate onto the back
                    face, which would leave the question unanswerable with no
                    way back. Only shown once the player has actually moved the
                    globe, so it isn't a control sitting there doing nothing. */}
                {globeMoved && (
                  <Pressable
                    onPress={() => globe.animateTo(locatorFraming.zoom, locatorFraming.spin)}
                    hitSlop={8}
                    style={styles.recenterPill}
                  >
                    <Text style={styles.recenterText}>Recenter</Text>
                  </Pressable>
                )}
              </View>
            ) : (
              <>
                {/* Prompt media */}
                <View style={styles.media}>
                  {q.type === "flag" && (
                    <Image
                      source={{ uri: flagUrl(q.country.code) }}
                      style={styles.flag}
                      resizeMode="contain"
                    />
                  )}
                  {q.type === "shape" && (
                    <View style={styles.shapeBox}>
                      <CountryOutline code={q.country.code} />
                    </View>
                  )}
                  {q.type === "capital" && (
                    <View
                      style={[
                        styles.capitalBadge,
                        { borderColor: meta.accent, borderBottomColor: colors.brandDeep },
                      ]}
                    >
                      <Text style={[styles.capitalGlyph, { color: meta.accent }]}>
                        {q.country.region}
                      </Text>
                      <Text style={styles.capitalName}>{q.country.name}</Text>
                    </View>
                  )}
                  {q.type === "capitalReverse" && (
                    <View
                      style={[
                        styles.capitalBadge,
                        { borderColor: meta.accent, borderBottomColor: colors.brandDeep },
                      ]}
                    >
                      <Text style={[styles.capitalGlyph, { color: meta.accent }]}>Capital</Text>
                      <Text style={styles.capitalName}>{q.country.capital}</Text>
                    </View>
                  )}
                </View>

                {/* Options */}
                <View style={styles.options}>
                  {q.options.map((opt, i) => {
                    const isCorrect = answered && opt === q.correct;
                    const isWrong = answered && opt === picked && opt !== q.correct;
                    const isPicked = answered && opt === picked;
                    return (
                      // rise={0}: the body wrapper above already provides the upward
                      // travel for this whole group. Nesting a second one would stack
                      // the transforms and overshoot the 8-16px band, so the options
                      // contribute only the staggered fade.
                      // Keyed by question index so the cascade replays per question
                      // rather than only on the first.
                      <FadeInUp key={`${idx}-${opt}`} rise={0} delay={staggerDelay(i)}>
                        <Animated.View
                          style={isPicked ? { transform: [{ scale: pickAnim }] } : null}
                        >
                          <Pressable
                            onPress={() => choose(opt)}
                            style={[
                              styles.option,
                              isCorrect && styles.optionCorrect,
                              isWrong && styles.optionWrong,
                            ]}
                          >
                            <Text
                              style={[
                                styles.optionText,
                                // Resolved options fill with a bright success/error — dark
                                // ink on top, not white, or the label washes out.
                                (isCorrect || isWrong) && {
                                  color: colors.onFill,
                                },
                              ]}
                            >
                              {opt}
                            </Text>
                            {isCorrect && <Text style={styles.optionMark}>✓</Text>}
                            {isWrong && <Text style={styles.optionMark}>✕</Text>}
                          </Pressable>
                        </Animated.View>
                      </FadeInUp>
                    );
                  })}
                </View>
              </>
            )}
          </Animated.View>

          {answered && (
            <View style={styles.feedback}>
              <Text style={styles.feedbackText}>
                {picked === TIMEOUT
                  ? "Time's up!"
                  : q.type === "higherLower"
                    ? // Both values, right or wrong. Without them the mode is a
                      // coin flip with no payoff; with them, a miss still
                      // teaches the comparison.
                      `${picked === q.correct ? "Nice — " : `It's ${q.correct}. `}${metricReadout(q)}`
                    : picked === q.correct
                      ? "Nice."
                      : q.type === "locator"
                        ? `That's ${q.choices.find((c) => c.code === picked)?.name ?? "elsewhere"} — ${q.country.name} is in green.`
                        : `Answer: ${q.correct}`}
              </Text>

              {/* The point of the whole thing: the answer is the hook, this is the
                  payoff. Right or wrong, you leave every question knowing
                  something about the place — not just whether you guessed it. */}
              <View style={styles.contextCard}>
                <Text style={styles.contextKicker}>WHY IT MATTERS</Text>
                <Text style={styles.contextCountry}>{q.country.name}</Text>
                <Text style={styles.contextFact}>{whyItMatters(q.country)}</Text>
                {onOpenCountry && (
                  <Pressable onPress={() => onOpenCountry(q.country.code)} hitSlop={8}>
                    <Text style={styles.contextLink}>Learn more about {q.country.name} →</Text>
                  </Pressable>
                )}
              </View>

              <Pressable style={[styles.nextBtn, { backgroundColor: meta.accent }]} onPress={next}>
                <Text style={styles.nextBtnText}>
                  {idx + 1 >= questions.length ? "Finish" : "Next"}
                </Text>
              </Pressable>
            </View>
          )}
        </Container>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.surface },
  // Constrained like the question body, so the progress bar tracks the column
  // instead of stretching the full width of a desktop window above it.
  topBar: {
    ...constrain.content,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(2.5),
    paddingHorizontal: spacing(4),
    paddingTop: spacing(2),
    paddingBottom: spacing(3),
  },
  exit: { fontSize: 22, color: colors.textMuted, width: 28 },
  progressTrack: {
    flex: 1,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSunken,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: radius.pill },
  streakPill: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.pill,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(1.5),
    ...elevation(1),
  },
  streakText: { color: colors.brand, fontSize: 13 },
  soundPill: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.pill,
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    ...elevation(1),
  },
  soundText: { fontSize: 14 },
  timerPill: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.pill,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(1.5),
    ...elevation(1),
  },
  timerPillLow: { backgroundColor: colors.dangerSurface },
  timerText: { color: colors.brand, fontSize: 13 },
  timerTextLow: { color: colors.danger },

  body: { padding: spacing(5), paddingBottom: spacing(12) },
  counter: { ...type.eyebrow, fontSize: 11, marginBottom: spacing(1.5) },
  prompt: { ...type.h2, fontSize: 24, lineHeight: 30, marginBottom: spacing(5) },

  media: { alignItems: "center", justifyContent: "center", marginBottom: spacing(6) },
  flag: {
    width: 260,
    height: 164,
    borderRadius: radius.sheet,
    backgroundColor: colors.surfaceRaised,
    ...elevation(2),
  },
  // The map stage is deep navy on every media type, so outlines and the world
  // map read as the lit subject rather than as chrome.
  shapeBox: {
    width: 260,
    height: 210,
    backgroundColor: colors.brand,
    borderRadius: radius.sheet,
    padding: spacing(4),
    ...elevation(2),
  },
  // Square: the globe's SVG fits its square viewBox to the shorter side, so a
  // 300px-tall box on a 680px column was throwing away most of the width. The
  // globe IS the question here — it is the answer surface, not an illustration.
  mapBox: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: colors.brand,
    borderRadius: radius.sheet,
    overflow: "hidden",
    marginBottom: spacing(4),
    ...elevation(2),
  },
  mapHint: { ...type.caption, fontSize: 12, marginBottom: spacing(3) },
  // Sits on the dark globe stage, so it takes the map's own on-dark tokens
  // rather than the page's ink.
  basemapToggle: { position: "absolute", left: spacing(3), top: spacing(3) },
  recenterPill: {
    position: "absolute",
    right: spacing(3),
    bottom: spacing(3),
    backgroundColor: "rgba(22,41,63,0.82)",
    borderRadius: radius.pill,
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(3.5),
  },
  recenterText: { ...type.label, fontSize: 12, color: map.onMap },
  // The accent border is applied per-mode at the call site, which restates
  // borderBottomColor alongside it: the `borderColor` shorthand would otherwise
  // flatten this depth edge back to the accent.
  capitalBadge: {
    borderWidth: 2,
    borderRadius: radius.sheet,
    paddingVertical: spacing(6),
    paddingHorizontal: spacing(8),
    backgroundColor: colors.surfaceRaised,
    alignItems: "center",
    ...elevation(2),
  },
  capitalGlyph: {
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  capitalName: { fontSize: 30, color: colors.brand },

  options: { gap: spacing(3) },
  // Capped and centered: a full-column answer row on desktop puts the label far
  // from where the eye lands and makes four options read as a wall.
  option: {
    ...constrain.action,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.sheet,
    paddingVertical: spacing(4),
    paddingHorizontal: spacing(4),
    ...elevation(1),
  },
  optionCorrect: { backgroundColor: colors.success, borderBottomColor: colors.brandDeep },
  optionWrong: { backgroundColor: colors.danger, borderBottomColor: colors.brandDeep },
  optionText: { ...type.body, fontSize: 17, flexShrink: 1 },
  optionMark: { color: colors.onFill, fontSize: 18, marginLeft: spacing(2) },

  feedback: { marginTop: spacing(5), gap: spacing(3) },
  feedbackText: { ...type.h3, color: colors.textMuted },
  // The context card leads with the earth accent rather than the mode's colour:
  // the fact is about the place, and reads the same in every game.
  contextCard: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.sheet,
    borderLeftWidth: 4,
    borderLeftColor: colors.ember,
    padding: spacing(4),
    ...elevation(1),
  },
  contextKicker: { ...type.eyebrow },
  contextCountry: { ...type.h3, marginTop: spacing(1), marginBottom: spacing(1.5) },
  contextFact: { ...type.body, fontSize: 14, color: colors.textMuted, lineHeight: 21 },
  contextLink: { ...type.label, fontSize: 13, color: colors.link, marginTop: spacing(2.5) },
  nextBtn: {
    ...constrain.action,
    borderRadius: radius.sheet,
    paddingVertical: spacing(4),
    alignItems: "center",
    ...elevation(2),
  },
  nextBtnText: { color: colors.onFill, fontSize: 17, letterSpacing: 0.4 },

  resultWrap: { flex: 1, backgroundColor: colors.surface },
  resultContent: { alignItems: "center", padding: spacing(5), paddingBottom: spacing(12) },
  // The score sits on the mode's accent as one solid slab — the payoff moment
  // gets the loudest surface in the app.
  resultCard: {
    width: "100%",
    alignItems: "center",
    borderRadius: radius.sheet,
    paddingVertical: spacing(7),
    marginBottom: spacing(7),
    ...elevation(2),
  },
  resultKicker: {
    ...type.label,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.6,
    color: colors.onFill,
    opacity: 0.7,
  },
  resultScore: { fontSize: 68, color: colors.onFill, marginTop: spacing(1) },
  resultPct: { ...type.h3, color: colors.onFill, opacity: 0.75, marginBottom: spacing(4) },
  xpPill: {
    backgroundColor: colors.brandDeep,
    borderRadius: radius.pill,
    paddingHorizontal: spacing(5),
    paddingVertical: spacing(2),
  },
  xpPillText: { color: colors.brand, fontSize: 16 },

  reviewHeading: { ...type.eyebrow, alignSelf: "flex-start", marginBottom: spacing(3) },
  reviewList: { width: "100%", gap: spacing(3), marginBottom: spacing(6) },
  reviewCard: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.sheet,
    padding: spacing(4),
    gap: spacing(2),
    ...elevation(1),
  },
  reviewRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing(2) },
  reviewMark: { fontSize: 16, width: 20 },
  reviewMarkRight: { color: colors.successInk },
  reviewMarkWrong: { color: colors.danger },
  reviewPrompt: { ...type.body, flex: 1, color: colors.brand },
  reviewAnswer: { ...type.caption, fontSize: 13 },
  reviewFact: {
    ...type.body,
    fontSize: 14,
    color: colors.textMuted,
    fontStyle: "italic",
    lineHeight: 20,
  },

  primaryBtn: {
    ...constrain.action,
    alignItems: "center",
    borderRadius: radius.pill,
    paddingVertical: spacing(4),
    paddingHorizontal: spacing(10),
    ...elevation(2),
  },
  primaryBtnText: { color: colors.onFill, fontSize: 17, letterSpacing: 0.4 },
  // Outline rather than a second fill: two slabs of equal weight would make
  // the player choose between them instead of reading one as the obvious next
  // move and the other as the way out.
  secondaryBtn: {
    ...constrain.action,
    alignItems: "center",
    borderRadius: radius.pill,
    paddingVertical: spacing(3.5),
    paddingHorizontal: spacing(10),
    marginTop: spacing(3),
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryBtnText: { color: colors.textMuted, fontSize: 16, letterSpacing: 0.4 },
});
