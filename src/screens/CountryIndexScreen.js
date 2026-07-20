// Browsable country index (M2.2 step 5b) — every country, searchable and
// filterable by region, each row opening its country page. The third real
// entry point into CountryPageScreen, alongside the post-answer "Learn more"
// link and (later) the interactive map.
import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable, TextInput, FlatList } from "react-native";
import { colors, spacing, radius, type, shadow } from "../theme";
import { COUNTRIES } from "../data/countries";
import { searchCountries, REGIONS } from "../game/countryIndex";

export default function CountryIndexScreen({ onExit, onOpenCountry }) {
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("All");

  const results = useMemo(() => searchCountries(COUNTRIES, { query, region }), [query, region]);

  return (
    <View style={styles.wrap}>
      <Pressable onPress={onExit} hitSlop={12} style={styles.back}>
        <Text style={styles.backText}>‹ Back</Text>
      </Pressable>

      <View style={styles.header}>
        <Text style={styles.title}>Countries</Text>
        <Text style={styles.subtitle}>{results.length} of {COUNTRIES.length} places</Text>
      </View>

      <TextInput
        style={styles.input}
        value={query}
        onChangeText={setQuery}
        placeholder="Search by country or capital"
        placeholderTextColor={colors.muted}
        autoCapitalize="none"
        autoCorrect={false}
      />

      <View style={styles.regionRow}>
        {REGIONS.map((r) => {
          const active = r === region;
          return (
            <Pressable
              key={r}
              onPress={() => setRegion(r)}
              style={[styles.regionChip, active && styles.regionChipActive]}
            >
              <Text style={[styles.regionChipText, active && styles.regionChipTextActive]}>{r}</Text>
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
        renderItem={({ item }) => (
          <Pressable onPress={() => onOpenCountry(item.code)} style={styles.row}>
            <View style={styles.rowBody}>
              <Text style={styles.rowName}>{item.name}</Text>
              <Text style={styles.rowCapital}>{item.capital} · {item.region}</Text>
            </View>
            <Text style={styles.chev}>›</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  back: { paddingHorizontal: spacing(3), paddingTop: spacing(2), paddingBottom: spacing(1) },
  backText: { ...type.body, color: colors.teal, fontWeight: "700" },

  header: { paddingHorizontal: spacing(3), marginBottom: spacing(2) },
  title: { ...type.hero, fontSize: 32 },
  subtitle: { ...type.muted, marginTop: spacing(0.5) },

  input: {
    marginHorizontal: spacing(3),
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    paddingHorizontal: spacing(1.75),
    paddingVertical: spacing(1.5),
    ...type.body,
    marginBottom: spacing(1.5),
  },

  regionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing(1),
    paddingHorizontal: spacing(3),
    marginBottom: spacing(1.5),
  },
  regionChip: {
    paddingVertical: spacing(0.75),
    paddingHorizontal: spacing(1.5),
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  regionChipActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  regionChipText: { ...type.pill, color: colors.muted },
  regionChipTextActive: { color: colors.white },

  list: { paddingHorizontal: spacing(3), paddingBottom: spacing(6) },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing(1.5),
    paddingHorizontal: spacing(2),
    marginBottom: spacing(1),
    ...shadow,
  },
  rowBody: { flex: 1 },
  rowName: { ...type.body, fontWeight: "700", color: colors.ink },
  rowCapital: { ...type.muted, fontSize: 13, marginTop: 2 },
  chev: { fontSize: 24, color: colors.line, fontWeight: "700" },

  empty: { ...type.muted, textAlign: "center", marginTop: spacing(4) },
});
