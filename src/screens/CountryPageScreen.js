// Country page (M2.2) — the "why should I care?" hub for a single place.
//
// Maps-first: the country's outline is the hero. Below it, the story, key facts,
// its neighbors, and ways to jump into a game. Brazil is the reference entry
// (see data/countryPages.js); every other country renders from the same shape,
// degrading gracefully where content isn't authored yet.
import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, Animated } from "react-native";
import { colors, spacing, radius, type, depth } from "../theme";
import { getCountryPage } from "../data/countryPages";
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

export default function CountryPageScreen({ code, onExit, onPlay }) {
  const page = getCountryPage(code);

  // Fade/rise-in on open, matching QuizScreen's per-question transition;
  // fade/settle-out on close, so leaving the page doesn't cut instantly —
  // the exit callback fires once the animation finishes, not on tap.
  const screenAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(screenAnim, { toValue: 1, duration: 260, useNativeDriver: true }).start();
  }, [screenAnim]);
  function handleExit() {
    Animated.timing(screenAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(onExit);
  }
  const screenStyle = {
    opacity: screenAnim,
    transform: [{ translateY: screenAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
  };

  if (!page) {
    return (
      <Animated.View style={[styles.wrap, screenStyle]}>
        <BackBar onExit={handleExit} />
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
      <BackBar onExit={handleExit} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero — the outline is the star, except for the handful of places
            mapsicon has no vector for (see countries.js noOutline), where a
            broken image would undercut the "maps are the hero" premise more
            than a clean placeholder does. */}
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

        <Text style={styles.kicker}>{page.region.toUpperCase()}</Text>
        <Text style={styles.name}>{page.name}</Text>
        <Text style={styles.capital}>Capital · {page.capital}</Text>

        {/* Key facts */}
        {(page.population || page.areaKm2) && (
          <View style={styles.statsRow}>
            {page.population ? <Stat value={compact(page.population)} label="People" /> : null}
            {page.areaKm2 ? <Stat value={`${compact(page.areaKm2)} km²`} label="Area" /> : null}
            {page.neighbors?.length ? <Stat value={String(page.neighbors.length)} label="Neighbors" /> : null}
          </View>
        )}

        {/* The story */}
        <View style={styles.card}>
          <Text style={styles.summary}>{page.summary}</Text>
        </View>

        {/* Climate / trade / culture */}
        {factRows.length > 0 && (
          <View style={styles.card}>
            {factRows.map((f, i) => (
              <View key={f.key} style={[styles.factRow, i > 0 && styles.factRowDivider]}>
                <Text style={styles.factLabel}>{f.label}</Text>
                <Text style={styles.factText}>{facts[f.key]}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Neighbors */}
        {page.neighbors?.length > 0 && (
          <>
            <Text style={styles.section}>Borders</Text>
            <View style={styles.chipWrap}>
              {page.neighbors.map((nb) => (
                <View key={nb} style={styles.chip}>
                  <Text style={styles.chipText}>{countryName(nb)}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Related games */}
        {relatedModes.length > 0 && onPlay && (
          <>
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
          </>
        )}
      </ScrollView>
    </Animated.View>
  );
}

function BackBar({ onExit }) {
  return (
    <Pressable onPress={onExit} hitSlop={12} style={styles.back}>
      <Text style={styles.backText}>‹ Back</Text>
    </Pressable>
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
  back: { paddingHorizontal: spacing(2.5), paddingTop: spacing(2), paddingBottom: spacing(1) },
  backText: { ...type.pill, fontSize: 14, color: colors.teal },
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
