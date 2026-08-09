// Country page (M2.2) — the "why should I care?" hub for a single place.
//
// Maps-first: the country's outline is the hero. Below it, the story, key facts,
// its neighbors, and ways to jump into a game. Brazil is the reference entry
// (see data/countryPages.js); every other country renders from the same shape,
// degrading gracefully where content isn't authored yet.
import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, Animated, Easing } from "react-native";
import { colors, spacing, radius, type, depth, constrain, motion } from "../theme";
import Container from "../components/Container";
import FadeInUp from "../components/FadeInUp";
import { getCountryPage } from "../data/countryPages";
import { fetchCountry } from "../data/contentSource";
import { countryName } from "../data/countries";
import { MODES } from "../game/questions";
import CountryOutline from "../components/CountryOutline";

// Compact human numbers: 216422446 → "216M", 8515767 → "8.5M".
function compact(n) {
  if (!n && n !== 0) return null;
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${Math.round(n / 1_000_000)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

// Order of the labelled fact rows, so they read consistently across countries.
const FACT_ORDER = [
  { key: "climate", label: "Climate" },
  { key: "trade", label: "Trade" },
  { key: "culture", label: "Culture" },
];

export default function CountryPageScreen({ code, onExit, onPlay, onViewMap }) {
  // Bundled content paints immediately, then the fetched version replaces it if
  // one arrives (M2.3.5). The page is never blank waiting on a network call, and
  // an offline visitor sees exactly what shipped before this milestone — the
  // remote read is an upgrade, never a dependency.
  const [page, setPage] = useState(() => getCountryPage(code));
  useEffect(() => {
    let cancelled = false;
    setPage(getCountryPage(code));
    fetchCountry(code).then((result) => {
      // Guard the unmount/re-navigate race: without this, opening Brazil then
      // quickly tapping Peru could land Brazil's slower response on Peru's page.
      if (!cancelled && result.page) setPage(result.page);
    });
    return () => {
      cancelled = true;
    };
  }, [code]);

  // Fade/rise-in on open, matching QuizScreen's per-question transition;
  // fade/settle-out on close, so leaving the page doesn't cut instantly —
  // the exit/view-map callback fires once the animation finishes, not on tap.
  const screenAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(screenAnim, {
      toValue: 1,
      duration: motion.duration.base,
      easing: Easing.bezier(...motion.easeOut),
      useNativeDriver: true,
    }).start();
  }, [screenAnim]);
  function handleExit() {
    Animated.timing(screenAnim, {
      toValue: 0,
      duration: motion.duration.fast,
      useNativeDriver: true,
    }).start(onExit);
  }
  // M2.3 step 4 — a country page can be reached from the index or a quiz
  // round, where Back doesn't lead to the World Map (only returnTo:
  // "worldMap" does). This gives every country page its own way there,
  // mirroring the map's own tap-to-open-a-country-page direction.
  function handleViewMap() {
    Animated.timing(screenAnim, {
      toValue: 0,
      duration: motion.duration.fast,
      useNativeDriver: true,
    }).start(onViewMap);
  }
  const screenStyle = {
    opacity: screenAnim,
    transform: [
      { translateY: screenAnim.interpolate({ inputRange: [0, 1], outputRange: [motion.rise, 0] }) },
    ],
  };

  if (!page) {
    return (
      <Animated.View style={[styles.wrap, screenStyle]}>
        <BackBar onExit={handleExit} onViewMap={onViewMap && handleViewMap} />
        <View style={styles.empty}>
          <Text style={styles.emptyText}>We don't have a page for that place yet.</Text>
        </View>
      </Animated.View>
    );
  }

  const facts = page.facts ?? {};
  const factRows = FACT_ORDER.filter((f) => facts[f.key]);
  const relatedModes = (page.relatedGameModes ?? []).filter((m) => MODES[m]);

  return (
    <Animated.View style={[styles.wrap, screenStyle]}>
      <BackBar onExit={handleExit} onViewMap={onViewMap && handleViewMap} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Container>
          {/* Hero — the outline is the star, except for the handful of places
              mapsicon has no vector for (see countries.js noOutline), where a
              broken image would undercut the "maps are the hero" premise more
              than a clean placeholder does. */}
          {/* Every block below uses rise={0}: the page as a whole already rises
              via screenAnim, so these contribute the stagger and nothing else —
              stacking transforms would overshoot the 8-16px band. */}
          <FadeInUp rise={0}>
            <View style={styles.hero}>
              <View style={styles.outlineBox}>
                {page.noOutline ? (
                  <View style={styles.outlineFallback}>
                    <Text style={styles.outlineFallbackGlyph}>◇</Text>
                    <Text style={styles.outlineFallbackText}>Map outline coming soon</Text>
                  </View>
                ) : (
                  <CountryOutline code={page.code} />
                )}
              </View>
            </View>
          </FadeInUp>

          <FadeInUp rise={0} index={1}>
            <Text style={styles.kicker}>{page.region.toUpperCase()}</Text>
            <Text style={styles.name}>{page.name}</Text>
            <Text style={styles.capital}>Capital · {page.capital}</Text>
          </FadeInUp>

          {/* Key facts */}
          {(page.population || page.areaKm2) && (
            <FadeInUp rise={0} index={2}>
              <View style={styles.statsRow}>
                {page.population ? <Stat value={compact(page.population)} label="People" /> : null}
                {page.areaKm2 ? <Stat value={`${compact(page.areaKm2)} km²`} label="Area" /> : null}
                {page.neighbors?.length ? (
                  <Stat value={String(page.neighbors.length)} label="Neighbors" />
                ) : null}
              </View>
            </FadeInUp>
          )}

          {/* The story */}
          <FadeInUp rise={0} index={3}>
            <View style={styles.card}>
              <Text style={styles.summary}>{page.summary}</Text>
            </View>
          </FadeInUp>

          {/* Climate / trade / culture */}
          {factRows.length > 0 && (
            <FadeInUp rise={0} index={4}>
              <View style={styles.card}>
                {factRows.map((f, i) => (
                  <View key={f.key} style={[styles.factRow, i > 0 && styles.factRowDivider]}>
                    <Text style={styles.factLabel}>{f.label}</Text>
                    <Text style={styles.factText}>{facts[f.key]}</Text>
                  </View>
                ))}
              </View>
            </FadeInUp>
          )}

          {/* Neighbors */}
          {page.neighbors?.length > 0 && (
            <FadeInUp rise={0} index={5}>
              <Text style={styles.section}>Borders</Text>
              <View style={styles.chipWrap}>
                {page.neighbors.map((nb) => (
                  <View key={nb} style={styles.chip}>
                    <Text style={styles.chipText}>{countryName(nb)}</Text>
                  </View>
                ))}
              </View>
            </FadeInUp>
          )}

          {/* Related games */}
          {relatedModes.length > 0 && onPlay && (
            <FadeInUp rise={0} index={6}>
              <Text style={styles.section}>Play with {page.name}</Text>
              <View style={styles.gameWrap}>
                {relatedModes.map((m) => {
                  const meta = MODES[m];
                  return (
                    <Pressable
                      key={m}
                      onPress={() => onPlay(m)}
                      hitSlop={8}
                      style={[styles.gameBtn, { backgroundColor: meta.accent }]}
                    >
                      <Text style={styles.gameIcon}>{meta.icon}</Text>
                      <Text style={styles.gameBtnText}>{meta.title}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </FadeInUp>
          )}
        </Container>
      </ScrollView>
    </Animated.View>
  );
}

function BackBar({ onExit, onViewMap }) {
  return (
    <View style={styles.topBar}>
      <Pressable onPress={onExit} hitSlop={12}>
        <Text style={styles.backText}>‹ Back</Text>
      </Pressable>
      {onViewMap && (
        <Pressable onPress={onViewMap} hitSlop={12}>
          <Text style={styles.viewMapText}>View on map ›</Text>
        </Pressable>
      )}
    </View>
  );
}

function Stat({ value, label }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  // Constrained like the content below it, so Back and "View on map" sit at the
  // column's edges on a wide screen rather than drifting out to the viewport's.
  topBar: {
    ...constrain.content,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing(2.5),
    paddingTop: spacing(2),
    paddingBottom: spacing(1),
  },
  backText: { ...type.pill, fontSize: 14, color: colors.teal },
  viewMapText: { ...type.pill, fontSize: 14, color: colors.teal },
  content: { padding: spacing(2.5), paddingTop: spacing(1), paddingBottom: spacing(6) },

  hero: {
    backgroundColor: colors.navy,
    borderRadius: radius.lg,
    padding: spacing(3),
    alignItems: "center",
    marginBottom: spacing(2.5),
    ...depth(6, colors.navyDeep),
  },
  outlineBox: { width: "100%", height: 200 },
  outlineFallback: { flex: 1, alignItems: "center", justifyContent: "center" },
  outlineFallbackGlyph: { fontSize: 56, color: colors.surfaceAlt },
  outlineFallbackText: { ...type.muted, fontSize: 13, marginTop: spacing(1) },

  kicker: { ...type.kicker, fontSize: 12 },
  name: { ...type.hero, fontSize: 38, marginTop: spacing(0.5) },
  capital: { ...type.muted, fontSize: 15, marginTop: spacing(0.5), marginBottom: spacing(2.5) },

  statsRow: { flexDirection: "row", gap: spacing(1.5), marginBottom: spacing(2.5) },
  stat: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing(2),
    alignItems: "center",
    ...depth(),
  },
  statValue: { fontSize: 22, fontWeight: "900", color: colors.headline },
  statLabel: { ...type.section, fontSize: 10, marginTop: spacing(0.5) },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing(2.5),
    marginBottom: spacing(2.5),
    ...depth(),
  },
  summary: { ...type.body, lineHeight: 24 },

  factRow: { paddingVertical: spacing(1.25) },
  factRowDivider: { borderTopWidth: 1, borderTopColor: colors.line, marginTop: spacing(0.25) },
  factLabel: { ...type.kicker, marginBottom: spacing(0.5) },
  factText: { ...type.body, fontSize: 14, color: colors.ink, lineHeight: 20 },

  section: { ...type.section, marginBottom: spacing(1.5) },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing(1), marginBottom: spacing(2.5) },
  chip: {
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingVertical: spacing(1),
    paddingHorizontal: spacing(1.75),
    ...depth(3),
  },
  chipText: { ...type.pill, color: colors.ink },

  gameWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing(1.5) },
  // Filled with the mode's accent rather than outlined in it: on the dark base a
  // 1.5px tinted border is too faint to read as a button.
  gameBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(1),
    borderRadius: radius.pill,
    paddingVertical: spacing(1.5),
    paddingHorizontal: spacing(2.25),
    ...depth(4, colors.navyDeep),
  },
  gameIcon: { fontSize: 18, fontWeight: "900", color: colors.navyDeep },
  gameBtnText: { ...type.body, fontWeight: "900", color: colors.navyDeep },

  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing(3) },
  emptyText: { ...type.muted },
});
