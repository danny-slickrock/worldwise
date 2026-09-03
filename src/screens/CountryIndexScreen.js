// Browsable country index (M2.2 step 5b) — every country, searchable and
// filterable by region, each row opening its country page. The third real
// entry point into CountryPageScreen, alongside the post-answer "Learn more"
// link and (later) the interactive map.
import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable, TextInput, FlatList } from "react-native";
import { colors, spacing, radius, type, elevation, constrain, motion } from "../theme";
import FadeInUp, { staggerDelay } from "../components/FadeInUp";
import { COUNTRIES } from "../data/countries";
import { searchCountries, REGIONS } from "../game/countryIndex";

export default function CountryIndexScreen({ onExit, onOpenCountry }) {
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("All");

  const results = useMemo(() => searchCountries(COUNTRIES, { query, region }), [query, region]);

  return (
    <View style={styles.wrap}>
      {onExit && (
        <Pressable onPress={onExit} hitSlop={12} style={styles.back}>
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>
      )}

      <FadeInUp>
        <View style={styles.header}>
          <Text style={styles.title}>Countries</Text>
          <Text style={styles.subtitle}>
            {results.length} of {COUNTRIES.length} places
          </Text>
        </View>
      </FadeInUp>

      <View style={styles.inputOuter}>
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          placeholder="Search by country or capital"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <View style={styles.regionRow}>
        {REGIONS.map((r) => {
          const active = r === region;
          return (
            <Pressable
              key={r}
              onPress={() => setRegion(r)}
              hitSlop={8}
              style={[styles.regionChip, active && styles.regionChipActive]}
            >
              <Text style={[styles.regionChipText, active && styles.regionChipTextActive]}>
                {r}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <FlatList
        data={results}
        keyExtractor={(c) => c.code}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={<Text style={styles.empty}>No countries match "{query}".</Text>}
        renderItem={({ item, index }) => {
          const row = (
            <Pressable onPress={() => onOpenCountry(item.code)} style={styles.row}>
              <View style={styles.rowBody}>
                <Text style={styles.rowName}>{item.name}</Text>
                <Text style={styles.rowCapital}>
                  {item.capital} · {item.region}
                </Text>
              </View>
              <Text style={styles.chev}>›</Text>
            </Pressable>
          );
          // Only the first screenful cascades. A FlatList mounts rows as they
          // scroll into view, so animating every row would re-fire the entrance
          // on every scroll — the gratuitous motion we're avoiding. Rows past
          // the window mount plain.
          if (index >= motion.maxStaggerSteps) return row;
          return <FadeInUp delay={staggerDelay(index)}>{row}</FadeInUp>;
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.surface },
  // Every element carries the cap itself: a FlatList has no single content
  // wrapper to hang it on, so the chrome and the rows each center independently
  // and end up sharing one column edge.
  back: {
    ...constrain.content,
    paddingHorizontal: spacing(5),
    paddingTop: spacing(4),
    paddingBottom: spacing(2),
  },
  backText: { ...type.label, fontSize: 14, color: colors.accent },

  header: { ...constrain.content, paddingHorizontal: spacing(5), marginBottom: spacing(4) },
  title: { ...type.h1, fontSize: 34 },
  subtitle: { ...type.eyebrow, fontSize: 11, marginTop: spacing(1.5) },

  // Inset field: darker than the card layer, so it reads as carved in rather
  // than sitting on top like the slabs around it.
  // Cap lives on inputOuter: `width: 100%` plus `marginHorizontal` makes the
  // browser drop the margin, so the field would run edge-to-edge on a phone.
  inputOuter: { ...constrain.content },
  input: {
    marginHorizontal: spacing(5),
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    paddingHorizontal: spacing(3.5),
    paddingVertical: spacing(3.5),
    ...type.body,
    marginBottom: spacing(3),
  },

  regionRow: {
    ...constrain.content,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing(2),
    paddingHorizontal: spacing(5),
    marginBottom: spacing(4),
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
  regionChipTextActive: { color: colors.onFill },

  list: { paddingHorizontal: spacing(5), paddingBottom: spacing(12) },
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
  rowBody: { flex: 1 },
  rowName: { ...type.body, color: colors.brand },
  rowCapital: { ...type.caption, fontSize: 13, marginTop: 2 },
  chev: { fontSize: 24, color: colors.textMuted },

  empty: { ...type.caption, textAlign: "center", marginTop: spacing(8) },
});
