import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { colors, spacing, radius, type, elevation, hairline, buttonHeight, onFill } from "../theme";
import Container from "../components/Container";
import FadeInUp, { staggerDelay } from "../components/FadeInUp";
import PressableTint from "../components/PressableTint";
import ProgressTrack from "../components/ProgressTrack";
import Skeleton from "../components/Skeleton";
import { useAuth } from "../auth/AuthProvider";
import { fetchRoundResults } from "../storage/cloudProgress";
import { needsStudy, studyByRegion, practiceSet, reviewSummary } from "../game/reviewPolicy";
import { REVIEW_STALE_DAYS } from "../constants";

// The Review surface (M2.12 step 9) — study analytics, not another scoreboard.
//
// Achievements says how you are doing. This says what to go and learn, which
// is a different question and needs a different surface: a list of countries
// with a REASON attached, and one button that turns the list into a round.
//
// All the deciding happens in game/reviewPolicy.js. This file fetches, renders
// and hands the weak set to the round builder.

// The wording for each reason. The policy returns a semantic name and this
// owns the sentence — the same split locatorFillState and ragPrompt use.
const REASON_LABEL = {
  "recent-miss": "Missed recently",
  "low-accuracy": "Keeps slipping",
  stale: `Not seen in ${REVIEW_STALE_DAYS}+ days`,
};
const REASON_TONE = {
  "recent-miss": { backgroundColor: colors.dangerSurface, color: colors.danger },
  "low-accuracy": { backgroundColor: colors.emberSurface, color: colors.emberInk },
  stale: { backgroundColor: colors.surfaceSunken, color: colors.textMuted },
};

export default function ReviewScreen({ onExit, onPractice, onOpenCountry }) {
  const { user } = useAuth();
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);
  // Mirrors AchievementsScreen's own flag (M2.5 step 6.4.3). Without it,
  // `results` reads as [] while the fetch is in flight — identical to "you
  // have never played" — so a signed-in player would see "nothing to review"
  // for a beat before their real history landed. Signed-out players need no
  // fetch, so they never enter the loading state at all.
  const [loading, setLoading] = useState(Boolean(user));

  useEffect(() => {
    let alive = true;
    if (!user) {
      setResults([]);
      setLoading(false);
      return () => {
        alive = false;
      };
    }
    setLoading(true);
    fetchRoundResults(user).then(({ rows, error: err }) => {
      if (!alive) return;
      setResults(rows);
      setError(err);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [user]);

  const summary = useMemo(() => reviewSummary(results), [results]);
  const weak = useMemo(() => needsStudy(results), [results]);
  const regions = useMemo(() => studyByRegion(results), [results]);
  const practice = useMemo(() => practiceSet(results), [results]);

  return (
    <Container>
      <ScrollView contentContainerStyle={styles.wrap}>
        <Pressable onPress={onExit} style={styles.back}>
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>

        <FadeInUp>
          <Text style={styles.eyebrow}>Study</Text>
          <Text style={styles.title}>Review</Text>
          <Text style={styles.lede}>
            {loading
              ? "Looking at what you've played…"
              : summary.state === "empty"
                ? "Play a few rounds and this fills up with the places worth another look."
                : summary.state === "clear"
                  ? `All ${summary.seen} places you've met are solid. Come back after a few more rounds.`
                  : `${summary.weak} of the ${summary.seen} places you've met could use another look.`}
          </Text>
        </FadeInUp>

        {error && (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>
              Couldn&apos;t load your history just now — this may be incomplete.
            </Text>
          </View>
        )}

        {!user && !loading && (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>
              Sign in to track which places you&apos;re forgetting — review needs your round
              history.
            </Text>
          </View>
        )}

        {loading ? (
          <View style={styles.loadingWrap}>
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} height={64} radius={radius.sheet} style={styles.loadingRow} />
            ))}
          </View>
        ) : (
          <>
            {practice.length > 0 && (
              <FadeInUp delay={staggerDelay(1)}>
                <PressableTint
                  onPress={() => onPractice(practice)}
                  radius={radius.pill}
                  style={styles.practice}
                  accessibilityRole="button"
                  accessibilityLabel={`Practice your weak spots, ${practice.length} places`}
                >
                  <Text style={styles.practiceText}>Practice your weak spots</Text>
                </PressableTint>
              </FadeInUp>
            )}

            {regions.length > 0 && (
              <FadeInUp delay={staggerDelay(2)}>
                <Text style={styles.section}>By region</Text>
                {regions.map((r) => (
                  <View key={r.region} style={styles.regionRow}>
                    <View style={styles.regionHead}>
                      <Text style={styles.regionName}>{r.region}</Text>
                      <Text style={styles.regionCount}>
                        {r.weak === 0 ? "Solid" : `${r.weak} to review`}
                      </Text>
                    </View>
                    {/* Strength is measured against what you have MET, not the
                        region's size: "3 of 5 seen" is useful, "3 of 12" when
                        you have played 5 is misleading. */}
                    <ProgressTrack value={r.strength} />
                    <Text style={styles.regionSub}>
                      {r.seen} of {r.total} seen
                    </Text>
                  </View>
                ))}
              </FadeInUp>
            )}

            {weak.length > 0 && (
              <FadeInUp delay={staggerDelay(3)}>
                <Text style={styles.section}>Worth another look</Text>
                {weak.slice(0, 40).map((c, i) => {
                  const tone = REASON_TONE[c.reason];
                  return (
                    <Pressable
                      key={c.code}
                      onPress={() => onOpenCountry?.(c.code)}
                      style={styles.row}
                      accessibilityRole="button"
                      accessibilityLabel={`${c.name} — ${REASON_LABEL[c.reason]}`}
                    >
                      <View style={styles.rowText}>
                        <Text style={styles.rowName}>{c.name}</Text>
                        <Text style={styles.rowMeta}>
                          {c.right}/{c.seen} correct
                          {c.daysSinceSeen !== null ? ` · ${describeAge(c.daysSinceSeen)}` : ""}
                        </Text>
                      </View>
                      <View style={[styles.tag, { backgroundColor: tone.backgroundColor }]}>
                        <Text style={[styles.tagText, { color: tone.color }]}>
                          {REASON_LABEL[c.reason]}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </FadeInUp>
            )}
          </>
        )}
      </ScrollView>
    </Container>
  );
}

const describeAge = (days) => (days <= 0 ? "today" : days === 1 ? "yesterday" : `${days} days ago`);

const styles = StyleSheet.create({
  wrap: { paddingVertical: spacing(6), paddingBottom: spacing(12) },
  back: { alignSelf: "flex-start", paddingVertical: spacing(2), paddingRight: spacing(4) },
  backText: { ...type.label, fontSize: 14, color: colors.link },

  eyebrow: { ...type.eyebrow, marginTop: spacing(2) },
  title: { ...type.h1, marginTop: spacing(1) },
  lede: { ...type.body, color: colors.textSecondary, marginTop: spacing(2), lineHeight: 24 },

  notice: {
    marginTop: spacing(4),
    backgroundColor: colors.surfaceSunken,
    borderRadius: radius.sheet,
    padding: spacing(4),
  },
  noticeText: { ...type.caption },

  loadingWrap: { marginTop: spacing(6), gap: spacing(3) },
  loadingRow: { marginBottom: spacing(1) },

  practice: {
    marginTop: spacing(6),
    height: buttonHeight,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brand,
    borderRadius: radius.pill,
  },
  practiceText: { ...type.label, fontSize: 15, color: onFill(colors.brand) },

  section: { ...type.eyebrow, marginTop: spacing(8), marginBottom: spacing(3) },

  regionRow: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.sheet,
    padding: spacing(4),
    marginBottom: spacing(3),
    ...hairline,
    ...elevation(1),
  },
  regionHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: spacing(2),
  },
  regionName: { ...type.h3, fontSize: 17 },
  regionCount: { ...type.caption },
  regionSub: { ...type.caption, marginTop: spacing(2) },

  // 68px+ from padding alone; hitSlop is a no-op on Pressable in
  // react-native-web (M2.5 step 6.4.2), so the target has to BE the box.
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.sheet,
    paddingVertical: spacing(4),
    paddingHorizontal: spacing(4),
    marginBottom: spacing(2),
    ...hairline,
  },
  rowText: { flex: 1, paddingRight: spacing(3) },
  rowName: { ...type.body, fontSize: 16 },
  rowMeta: { ...type.caption, marginTop: 2 },
  tag: { borderRadius: radius.pill, paddingHorizontal: spacing(3), paddingVertical: 4 },
  tagText: { ...type.eyebrow, fontSize: 10, letterSpacing: 0.8 },
});
