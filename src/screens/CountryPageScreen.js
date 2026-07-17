// Country page (M2.2) — the "why should I care?" hub for a single place.
//
// Step 2 (this version) is deliberately minimal: it proves the navigation seam
// (open by code, render getCountryPage data, get back) works end to end. Step 3
// turns it into the polished hero — outline map, fact tiles, neighbor chips,
// related-games buttons.
import React from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { colors, spacing, radius, type, shadow } from "../theme";
import { getCountryPage } from "../data/countryPages";

export default function CountryPageScreen({ code, onExit }) {
  const page = getCountryPage(code);

  return (
    <View style={styles.wrap}>
      <Pressable onPress={onExit} hitSlop={12} style={styles.back}>
        <Text style={styles.backText}>‹ Back</Text>
      </Pressable>

      {!page ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>We don't have a page for that place yet.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.kicker}>{page.region.toUpperCase()}</Text>
          <Text style={styles.name}>{page.name}</Text>
          <Text style={styles.capital}>Capital · {page.capital}</Text>
          <View style={styles.card}>
            <Text style={styles.summary}>{page.summary}</Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  back: { paddingHorizontal: spacing(3), paddingTop: spacing(2), paddingBottom: spacing(1) },
  backText: { ...type.body, color: colors.teal, fontWeight: "700" },
  content: { padding: spacing(3), paddingTop: spacing(1), paddingBottom: spacing(6) },
  kicker: { color: colors.earth, fontWeight: "800", letterSpacing: 2, fontSize: 12 },
  name: { ...type.hero, fontSize: 36, marginTop: spacing(0.5) },
  capital: { ...type.muted, fontSize: 15, marginTop: spacing(0.5), marginBottom: spacing(2.5) },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing(2.5), ...shadow },
  summary: { ...type.body, lineHeight: 24 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing(3) },
  emptyText: { ...type.muted },
});
