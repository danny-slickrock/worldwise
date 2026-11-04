// Learning path screen — an OPEN map of one region's countries.
//
// It used to be a gated ladder: medium countries locked until the easy tier
// was mastered, hard until medium. Now nothing is ever locked. Every country
// is a tappable tile from the first visit; mastery (game/masteryPolicy.js) is
// shown as a FILLED-IN state — a tile that has taken on its colour — so the
// path reads as "look how much of Africa you know" rather than "you may not
// go there yet". The point is encouragement and orientation, not permission.
//
// Layout, mobile-first: the region pills (unchanged), a progress card with a
// Play button for a round from this region, then the countries as a grid in
// three bands — Famous, Familiar, Deep cuts — so the region still reads from
// broad to specific without anything being withheld.
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  Pressable,
  ScrollView,
  Animated,
  Easing,
} from "react-native";
import {
  colors,
  spacing,
  radius,
  type,
  elevation,
  motion,
  themed,
  onFill,
} from "../theme";
import Container from "../components/Container";
import FadeInUp from "../components/FadeInUp";
import Skeleton from "../components/Skeleton";
import { getLearningPath, LEARNING_PATH_REGIONS } from "../data/learningPaths";
import { computeNodeStates, pathProgress } from "../game/masteryPolicy";
import { gridColumns } from "../game/layout";
import { flagUrl } from "../data/countries";
import PressableTint from "../components/PressableTint";
import ProgressTrack from "../components/ProgressTrack";
import { useAuth } from "../auth/AuthProvider";
import { fetchRoundResults } from "../storage/cloudProgress";
import { ChromeSpacer } from "../components/AppChrome";

// The three bands a region reads through, broad to specific. Labels, not
// gates: every band is open.
const BANDS = [
  { difficulty: "easy", label: "Famous" },
  { difficulty: "medium", label: "Familiar" },
  { difficulty: "hard", label: "Deep cuts" },
];
// Tiles are small cells — three across on a phone, more on a wide column.
const TILE_GRID = { minCell: 100, gap: 10, minColumns: 3, maxColumns: 6 };

export default function LearningPathScreen({
  pathId,
  onExit,
  onOpenCountry,
  onSwitchPath,
  onPlayRegion,
}) {
  const path = getLearningPath(pathId);
  const { user } = useAuth();
  // Local storage keeps no per-round history (only aggregated totals), so
  // results start empty — a signed-out player sees every country as "new",
  // and every one is still open.
  const [results, setResults] = useState([]);
  // A failed fetch (offline, backend down) also resolves to an empty results
  // array, which looks identical to "no history yet" and would otherwise
  // mislabel every locked tier as genuinely un-played. Track it separately so
  // a signed-in player sees an honest "couldn't load" notice instead.
  const [resultsError, setResultsError] = useState(false);
  // Mastery is mined entirely from round history, so until the fetch lands
  // `results` is [] and computeNodeStates() honestly reports every tier past
  // the first as locked. Painting that and then re-labelling it a beat later
  // reads as the app taking progress away and giving it back. Skeleton rows
  // instead: the list keeps its shape and its height, and nothing claims a
  // state it doesn't know yet.
  //
  // Only for a signed-in player. Signed out there is no history to wait for —
  // local storage keeps totals, never per-round rows — so the locked list is
  // the final answer and a skeleton would be a lie about a pending fetch.
  const [loadingResults, setLoadingResults] = useState(Boolean(user));

  useEffect(() => {
    let active = true;
    setResultsError(false);
    setLoadingResults(Boolean(user));
    fetchRoundResults(user).then(({ rows, error }) => {
      if (!active) return;
      setResults(rows);
      setResultsError(Boolean(error));
      setLoadingResults(false);
    });
    return () => {
      active = false;
    };
  }, [user]);

  const nodes = path ? computeNodeStates(path, results) : [];
  const progress = pathProgress(nodes);
  const [gridWidth, setGridWidth] = useState(0);
  const columns = gridColumns(gridWidth, TILE_GRID);
  const tileWidth =
    gridWidth > 0 ? (gridWidth - TILE_GRID.gap * (columns - 1)) / columns : undefined;

  // Fade/rise-in on open, fade/settle-out on close — same shape as
  // CountryPageScreen (M2.2 step 6.4). A node tap skips the defer: it opens a
  // country page, which already has its own entrance transition, so there's
  // nothing to avoid double-animating. Switching region pills stays instant
  // too — the screen never unmounts for that, it's just a content swap.
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
    <Animated.View style={[styles.wrap, !onExit && styles.wrapNoBack, screenStyle]}>
      {/* Only when there's something underneath — always, now that paths are
          pushed from Play rather than being a tab root; kept conditional so a
          stack that somehow starts here still renders cleanly. */}
      {onExit && (
        <Pressable onPress={handleExit} hitSlop={12} style={styles.back}>
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>
      )}

      {onSwitchPath && (
        <View style={styles.regionRow}>
          {LEARNING_PATH_REGIONS.map((region) => {
            const id = region.toLowerCase();
            const active = id === pathId;
            return (
              <Pressable
                key={id}
                onPress={() => onSwitchPath(id)}
                hitSlop={8}
                style={[styles.regionChip, active && styles.regionChipActive]}
              >
                <Text style={[styles.regionChipText, active && styles.regionChipTextActive]}>
                  {region}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {!path ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>We don't have a learning path for that yet.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Container>
            {/* rise={0}: the screen as a whole already rises via screenAnim,
                so these two groups contribute the fade + stagger only —
                stacking transforms would overshoot the 8-16px band, same
                reasoning as CountryPageScreen's own blocks. */}
            <FadeInUp rise={0}>
              <Text style={styles.kicker}>Learning path</Text>
              <Text style={styles.title}>{path.region}</Text>

              {/* Where you stand in this region — the encouragement half. */}
              <View style={styles.progressCard}>
                {loadingResults ? (
                  <>
                    <Skeleton width="62%" height={15} />
                    <Skeleton width="100%" height={8} style={styles.skeletonSub} />
                  </>
                ) : (
                  <>
                    <Text style={styles.progressHeadline}>
                      {progress.mastered > 0
                        ? `${progress.mastered} of ${progress.total} mastered`
                        : progress.explored > 0
                          ? `${progress.explored} of ${progress.total} explored`
                          : `${progress.total} countries to explore`}
                    </Text>
                    <ProgressTrack
                      value={progress.ratio}
                      style={styles.progressTrack}
                      label={`${progress.mastered} of ${progress.total} mastered`}
                    />
                    <Text style={styles.progressSub}>
                      {progress.inProgress > 0
                        ? `${progress.inProgress} in progress · tap any country to dive in`
                        : "Every country is open — tap any one to dive in"}
                    </Text>
                  </>
                )}
                {onPlayRegion && (
                  <PressableTint
                    onPress={() => onPlayRegion(path.region)}
                    radius={radius.pill}
                    style={styles.playBtn}
                    accessibilityRole="button"
                    accessibilityLabel={`Play a round from ${path.region}`}
                  >
                    <Text style={styles.playBtnText}>Play {path.region}</Text>
                  </PressableTint>
                )}
              </View>

              {resultsError && user && (
                <Text style={styles.noticeText}>
                  ⚠ Couldn't load your progress — every country is still open.
                </Text>
              )}
            </FadeInUp>

            {BANDS.map((band, bi) => {
              const bandNodes = (loadingResults ? path.nodes : nodes).filter(
                (n) => n.difficulty === band.difficulty
              );
              if (!bandNodes.length) return null;
              return (
                <FadeInUp key={band.difficulty} rise={0} index={bi + 1}>
                  <Text style={styles.band}>
                    {band.label} · {bandNodes.length}
                  </Text>
                  <View
                    style={styles.grid}
                    onLayout={
                      bi === 0 ? (e) => setGridWidth(e.nativeEvent.layout.width) : undefined
                    }
                  >
                    {bandNodes.map((node) => (
                      <CountryTile
                        key={node.code}
                        node={node}
                        width={tileWidth}
                        loading={loadingResults}
                        onPress={() => onOpenCountry?.(node.code)}
                      />
                    ))}
                  </View>
                </FadeInUp>
              );
            })}
          </Container>
          <ChromeSpacer />
        </ScrollView>
      )}
    </Animated.View>
  );
}

// One country. Mastered = the tile fills with brand colour and carries a ✓;
// in progress = a fill bar along the foot; new = a plain cream card. Every
// state is tappable — the state is a reward to look at, not a key.
function CountryTile({ node, width, loading, onPress }) {
  const mastered = !loading && node.state === "mastered";
  const inProgress = !loading && node.state === "inProgress";
  const stateLabel = mastered ? "mastered" : inProgress ? "in progress" : "new";
  return (
    <PressableTint
      onPress={onPress}
      radius={radius.sheet}
      tone={mastered ? "dark" : "light"}
      style={[styles.tile, { width: width ?? "31%" }, mastered && styles.tileMastered]}
      accessibilityRole="button"
      accessibilityLabel={`${node.name}, ${stateLabel}`}
    >
      <Image source={{ uri: flagUrl(node.code) }} style={styles.tileFlag} resizeMode="cover" />
      <Text style={[styles.tileName, mastered && styles.tileNameMastered]} numberOfLines={2}>
        {node.name}
      </Text>
      {mastered && <Text style={styles.tileCheck}>✓</Text>}
      {inProgress && (
        <View style={styles.tileBar}>
          <View style={[styles.tileBarFill, { width: `${Math.round(node.progress * 100)}%` }]} />
        </View>
      )}
    </PressableTint>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    // Transparent: AppChrome owns the page ground (the kit's paper fibre).
    wrap: { flex: 1, backgroundColor: "transparent" },
    back: { paddingHorizontal: spacing(5), paddingTop: spacing(4), paddingBottom: spacing(2) },
    // Back carries the top inset; when it isn't drawn, the
    // inset moves to the wrapper instead of vanishing with it.
    wrapNoBack: { paddingTop: spacing(8) },
    backText: { ...type.label, fontSize: 14, color: colors.link },
    regionRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing(2),
      paddingHorizontal: spacing(5),
      paddingBottom: spacing(2),
    },
    regionChip: {
      paddingVertical: spacing(2),
      paddingHorizontal: spacing(3.5),
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceRaised,
      borderWidth: 1,
      borderColor: colors.border,
    },
    regionChipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
    regionChipText: { ...type.label, color: colors.textMuted },
    regionChipTextActive: { color: onFill(colors.brand) },
    content: { padding: spacing(5), paddingTop: spacing(2), paddingBottom: spacing(12) },
    kicker: { ...type.eyebrow },
    title: { ...type.h1, fontSize: 34, marginTop: spacing(1) },
    noticeText: {
      ...type.caption,
      fontSize: 13,
      color: colors.danger,
      marginBottom: spacing(4),
    },
    skeletonSub: { marginTop: spacing(2) },

    progressCard: {
      backgroundColor: colors.surfaceRaised,
      borderRadius: radius.sheet,
      padding: spacing(5),
      marginTop: spacing(4),
      marginBottom: spacing(6),
      ...elevation(1),
    },
    progressHeadline: { ...type.h3, fontSize: 20 },
    progressTrack: { marginTop: spacing(3) },
    progressSub: { ...type.caption, marginTop: spacing(2) },
    playBtn: {
      marginTop: spacing(4),
      minHeight: 48,
      borderRadius: radius.pill,
      backgroundColor: colors.brand,
      alignItems: "center",
      justifyContent: "center",
    },
    playBtnText: { ...type.label, fontSize: 15, color: onFill(colors.brand) },

    band: { ...type.eyebrow, marginBottom: spacing(3) },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: TILE_GRID.gap,
      marginBottom: spacing(7),
    },
    tile: {
      minHeight: 104,
      padding: spacing(2.5),
      borderRadius: radius.sheet,
      backgroundColor: colors.surfaceRaised,
      overflow: "hidden",
      ...elevation(1),
    },
    // Mastered: the tile takes on the brand fill — "filled in" is the reward.
    tileMastered: { backgroundColor: colors.brand },
    tileFlag: {
      width: 36,
      height: 24,
      borderRadius: 3,
      backgroundColor: colors.surfaceSunken,
      marginBottom: spacing(2),
    },
    tileName: { ...type.label, fontSize: 13, lineHeight: 17, color: colors.text },
    tileNameMastered: { color: onFill(colors.brand) },
    tileCheck: {
      position: "absolute",
      top: spacing(2),
      right: spacing(2.5),
      ...type.label,
      fontSize: 14,
      color: onFill(colors.brand),
    },
    tileBar: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      height: 4,
      backgroundColor: colors.surfaceSunken,
    },
    tileBarFill: { height: 4, backgroundColor: colors.accent },
    empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing(6) },
    emptyText: { ...type.caption },
  })
);
