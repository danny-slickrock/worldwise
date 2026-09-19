// Leaderboard screen (M2.6 step 4) — reachable at /leaderboard, owned by the
// Profile tab, same Back behavior as every other pushed route.
//
// All the deciding is already done by the time this file runs: step 1's
// topWithYou() ranks whatever rows step 3's fetchGlobalLeaderboard() hands
// it into the top LEADERBOARD_TOP_N plus the player's own row pinned on when
// they're outside it. This file only fetches, loads, and renders.
//
// Loading/offline states mirror AchievementsScreen's own (M2.5 step 6.4.3):
// while a signed-in player's fetch is in flight, an empty rows array looks
// identical to "loaded, nobody's played yet," so the same loadingResults +
// Skeleton treatment covers the gap. Signed-out is its own notice rather
// than a skeleton — fetchGlobalLeaderboard never fetches for a signed-out
// player (the view grants `authenticated` only), so there is nothing
// pending to wait on; the message says why, the way ReviewScreen's own
// signed-out notice does.
import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, Animated, Easing } from "react-native";
import { colors, spacing, radius, type, elevation, constrain, motion } from "../theme";
import FadeInUp, { staggerDelay } from "../components/FadeInUp";
import Skeleton from "../components/Skeleton";
import { topWithYou } from "../game/leaderboardPolicy";
import { useAuth } from "../auth/AuthProvider";
import { fetchGlobalLeaderboard } from "../storage/cloudLeaderboard";

export default function LeaderboardScreen({ onExit }) {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [fetchError, setFetchError] = useState(false);
  const [loading, setLoading] = useState(Boolean(user));

  useEffect(() => {
    let active = true;
    setFetchError(false);
    setLoading(Boolean(user));
    fetchGlobalLeaderboard(user).then(({ rows, error }) => {
      if (!active) return;
      setEntries(rows);
      setFetchError(Boolean(error));
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [user]);

  const { rows, you, youInTop } = topWithYou(entries, user?.id ?? null);

  // Fade/rise-in on open, fade/settle-out on close — same shape
  // AchievementsScreen (M2.5 step 6.4.4) and CountryPageScreen/
  // LearningPathScreen already use.
  const screenAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(screenAnim, {
      toValue: 1,
      duration: motion.duration.ui,
      easing: Easing.bezier(...motion.easing),
      useNativeDriver: true,
    }).start();
  }, [screenAnim]);
  function handleExit() {
    Animated.timing(screenAnim, {
      toValue: 0,
      duration: motion.duration.micro,
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
    <Animated.View style={[styles.wrap, screenStyle]}>
      {onExit && (
        <Pressable onPress={handleExit} hitSlop={12} style={styles.back}>
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>
      )}

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <FadeInUp rise={0}>
          <View style={styles.header}>
            <Text style={styles.title}>Leaderboard</Text>
            <Text style={styles.subtitle}>Global XP</Text>
            {fetchError && user && (
              <Text style={styles.noticeText}>
                ⚠ Couldn't load the leaderboard — try again shortly.
              </Text>
            )}
          </View>
        </FadeInUp>

        {!user ? (
          <FadeInUp rise={0} delay={staggerDelay(1)}>
            <View style={styles.notice}>
              <Text style={styles.noticeBodyText}>
                Sign in to see how your XP stacks up against every other player.
              </Text>
            </View>
          </FadeInUp>
        ) : loading ? (
          [0, 1, 2, 3, 4].map((i) => (
            <View key={i} style={styles.row}>
              <Skeleton width={24} height={16} />
              <View style={styles.rowBody}>
                <Skeleton width="52%" height={15} />
              </View>
              <Skeleton width={48} height={15} />
            </View>
          ))
        ) : rows.length === 0 ? (
          <FadeInUp rise={0} delay={staggerDelay(1)}>
            <View style={styles.notice}>
              <Text style={styles.noticeBodyText}>
                Nobody's on the board yet — play a round to be the first.
              </Text>
            </View>
          </FadeInUp>
        ) : (
          <>
            {rows.map((entry, index) => (
              <FadeInUp key={entry.userId ?? index} rise={0} delay={staggerDelay(index + 1)}>
                <LeaderboardRow entry={entry} />
              </FadeInUp>
            ))}
            {you && !youInTop && (
              <FadeInUp rise={0} delay={staggerDelay(rows.length + 1)}>
                <View style={styles.separator} />
                <LeaderboardRow entry={you} />
              </FadeInUp>
            )}
          </>
        )}
      </ScrollView>
    </Animated.View>
  );
}

function LeaderboardRow({ entry }) {
  return (
    <View style={[styles.row, entry.isYou && styles.rowYou]}>
      <Text style={[styles.rank, entry.isYou && styles.rankYou]}>{entry.rank}</Text>
      <View style={styles.rowBody}>
        <Text style={[styles.rowLabel, entry.isYou && styles.rowLabelYou]} numberOfLines={1}>
          {entry.displayName || "A player"}
          {entry.isYou ? " (you)" : ""}
        </Text>
      </View>
      <Text style={styles.rowValue}>{entry.value} XP</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // Transparent: AppChrome owns the page ground (the kit's paper fibre).
  wrap: { flex: 1, backgroundColor: "transparent" },
  // paddingBottom is spacing(3), not spacing(2): react-native-web's Pressable
  // never implements `hitSlop` (M2.5 step 6.4.2), so the real tap target is
  // exactly this box.
  back: {
    ...constrain.content,
    paddingHorizontal: spacing(5),
    paddingTop: spacing(4),
    paddingBottom: spacing(3),
  },
  backText: { ...type.label, fontSize: 14, color: colors.link },

  content: { paddingHorizontal: spacing(5), paddingBottom: spacing(12) },
  header: { ...constrain.content, marginBottom: spacing(4) },
  title: { ...type.h1, fontSize: 34 },
  subtitle: { ...type.eyebrow, fontSize: 11, marginTop: spacing(1.5) },
  noticeText: { ...type.caption, fontSize: 13, color: colors.danger, marginTop: spacing(2) },

  notice: {
    ...constrain.content,
    backgroundColor: colors.surfaceSunken,
    borderRadius: radius.sheet,
    padding: spacing(4),
  },
  noticeBodyText: { ...type.caption },

  row: {
    ...constrain.content,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.sheet,
    paddingVertical: spacing(3.5),
    paddingHorizontal: spacing(4),
    marginBottom: spacing(2.5),
    ...elevation(1),
  },
  // A left rule rather than a filled background: a filled "you" row over
  // XP-value text would need its own onFill() contrast check, and a rule
  // says "this one is different" without touching any text colour but the
  // label itself.
  rowYou: { borderLeftWidth: 3, borderLeftColor: colors.brand, paddingLeft: spacing(3.5) - 3 },
  separator: { ...constrain.content, height: spacing(3) },
  rank: {
    ...type.eyebrow,
    fontSize: 14,
    width: 28,
    textAlign: "center",
    color: colors.textMuted,
  },
  rankYou: { color: colors.brand },
  rowBody: { flex: 1, marginHorizontal: spacing(3.5) },
  rowLabel: { ...type.body },
  rowLabelYou: { color: colors.brand },
  rowValue: { ...type.label, fontSize: 14, color: colors.text },
});
