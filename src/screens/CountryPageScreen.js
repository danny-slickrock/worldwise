// Country page (M2.2) — the "why should I care?" hub for a single place.
//
// Maps-first: the country's outline is the hero. Below it, the story, key facts,
// its neighbors, and ways to jump into a game. Brazil is the reference entry
// (see data/countryPages.js); every other country renders from the same shape,
// degrading gracefully where content isn't authored yet.
import React from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { colors, spacing, radius, type, shadow } from "../theme";
import { getCountryPage } from "../data/countryPages";
import { COUNTRIES } from "../data/countries";
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

const countryName = (code) => COUNTRIES.find((c) => c.code === code)?.name ?? code.toUpperCase();

// Order of the labelled fact rows, so they read consistently across countries.
const FACT_ORDER = [
  { key: "climate", label: "Climate" },
  { key: "trade", label: "Trade" },
  { key: "culture", label: "Culture" },
];

export default function CountryPageScreen({ code, onExit, onPlay }) {
  const page = getCountryPage(code);

  if (!page) {
    return (
      <View style={styles.wrap}>
        <BackBar onExit={onExit} />
        <View style={styles.empty}>
          <Text style={styles.emptyText}>We don't have a page for that place yet.</Text>
        </View>
      </View>
    );
  }

  const facts = page.facts ?? {};
  const factRows = FACT_ORDER.filter((f) => facts[f.key]);
  const relatedModes = (page.relatedGameModes ?? []).filter((m) => MODES[m]);

  return (
    <View style={styles.wrap}>
      <BackBar onExit={onExit} />
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
                    style={[styles.gameBtn, { borderColor: meta.accent }]}
                  >
                    <Text style={[styles.gameIcon, { color: meta.accent }]}>{meta.icon}</Text>
                    <Text style={styles.gameBtnText}>{meta.title}</Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
    </View>
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
  back: { paddingHorizontal: spacing(3), paddingTop: spacing(2), paddingBottom: spacing(1) },
  backText: { ...type.body, color: colors.teal, fontWeight: "700" },
  content: { padding: spacing(3), paddingTop: spacing(1), paddingBottom: spacing(6) },

  hero: {
    backgroundColor: colors.navy,
    borderRadius: radius.lg,
    padding: spacing(3),
    alignItems: "center",
    marginBottom: spacing(2.5),
    ...shadow,
  },
  outlineBox: { width: "100%", height: 200 },
  outlineFallback: { flex: 1, alignItems: "center", justifyContent: "center" },
  outlineFallbackGlyph: { fontSize: 56, color: "rgba(255,255,255,0.35)" },
  outlineFallbackText: {
    ...type.muted,
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    marginTop: spacing(1),
  },

  kicker: { color: colors.earth, fontWeight: "800", letterSpacing: 2, fontSize: 12 },
  name: { ...type.hero, fontSize: 38, marginTop: spacing(0.5) },
  capital: { ...type.muted, fontSize: 15, marginTop: spacing(0.5), marginBottom: spacing(2.5) },

  statsRow: { flexDirection: "row", gap: spacing(1.5), marginBottom: spacing(2.5) },
  stat: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing(2),
    alignItems: "center",
    ...shadow,
  },
  statValue: { fontSize: 22, fontWeight: "900", color: colors.navy },
  statLabel: { ...type.muted, fontSize: 12, marginTop: 2 },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing(2.5),
    marginBottom: spacing(2.5),
    ...shadow,
  },
  summary: { ...type.body, lineHeight: 24 },

  factRow: { paddingVertical: spacing(1.25) },
  factRowDivider: { borderTopWidth: 1, borderTopColor: colors.line, marginTop: spacing(0.25) },
  factLabel: { ...type.pill, fontSize: 11, letterSpacing: 1, color: colors.earth, marginBottom: 2 },
  factText: { ...type.body, fontSize: 14, color: colors.ink, lineHeight: 20 },

  section: { ...type.h2, marginBottom: spacing(1.5) },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing(1), marginBottom: spacing(2.5) },
  chip: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    paddingVertical: spacing(0.75),
    paddingHorizontal: spacing(1.5),
  },
  chipText: { ...type.pill, color: colors.navy },

  gameWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing(1.5) },
  gameBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(1),
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderRadius: radius.pill,
    paddingVertical: spacing(1.25),
    paddingHorizontal: spacing(2),
  },
  gameIcon: { fontSize: 18, fontWeight: "800" },
  gameBtnText: { ...type.body, fontWeight: "800", color: colors.ink },

  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing(3) },
  emptyText: { ...type.muted },
});
