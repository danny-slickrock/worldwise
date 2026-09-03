// The desktop half of the persistent navigation — a fixed left rail.
//
// Same data contract as TabBar (`tabs`, `active`, `onSelect`), so the two are
// interchangeable and AppChrome can swap them on a breakpoint without either
// knowing the other exists. Same visual language too: the active destination is
// a filled, extruded slab rather than a tinted glyph, because on a dark UI a
// colour swap alone is too quiet to read as "you are here".
//
// It collapses to icons-only below layout.js's `railLabels` breakpoint, which
// is what lets the rail appear at 840px without stealing the width the content
// column needs.
import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { colors, spacing, radius, type, depth } from "../theme";

export default function NavRail({ tabs, active, onSelect, width, showLabels }) {
  return (
    <View style={[styles.rail, { width }]}>
      {/* The wordmark moves up here on desktop. On a phone it sits inside the
          Home screen, where it can afford the vertical space; in a rail it
          doubles as the anchor that stops the tab group floating at the top
          edge of an 1100px-tall viewport. */}
      <View style={[styles.brand, !showLabels && styles.brandCompact]}>
        <Text style={styles.brandGlyph}>🌐</Text>
        {showLabels && <Text style={styles.brandText}>Worldwise</Text>}
      </View>

      <View style={styles.group}>
        {tabs.map((tab) => {
          const isActive = tab.key === active;
          return (
            <Pressable
              key={tab.key}
              onPress={() => onSelect(tab.key)}
              style={[
                styles.item,
                showLabels ? styles.itemFull : styles.itemCompact,
                isActive && styles.itemActive,
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={tab.label}
            >
              <Text style={[styles.icon, isActive && styles.iconActive]}>{tab.icon}</Text>
              {showLabels ? (
                <Text style={[styles.label, isActive && styles.labelActive]}>{tab.label}</Text>
              ) : (
                <Text style={[styles.microLabel, isActive && styles.microLabelActive]}>
                  {tab.label}
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    backgroundColor: colors.navy,
    borderRightWidth: 1,
    borderRightColor: colors.line,
    paddingTop: spacing(3),
    paddingHorizontal: spacing(1.5),
    gap: spacing(3),
  },
  brand: { flexDirection: "row", alignItems: "center", gap: spacing(1), paddingHorizontal: spacing(1) },
  brandCompact: { justifyContent: "center", paddingHorizontal: 0 },
  brandGlyph: { fontSize: 24 },
  brandText: { ...type.h2, fontSize: 19, letterSpacing: -0.3 },
  group: { gap: spacing(0.75) },
  item: {
    borderRadius: radius.sm,
    backgroundColor: "transparent",
    // Matches the 44px minimum the M2.4 tap-target audit held every other
    // control to, in both variants.
    minHeight: 48,
  },
  itemFull: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(1.5),
    paddingHorizontal: spacing(1.5),
  },
  itemCompact: { alignItems: "center", justifyContent: "center", gap: spacing(0.25), paddingVertical: spacing(0.75) },
  itemActive: { backgroundColor: colors.teal, ...depth(3, colors.navyDeep) },
  icon: { fontSize: 22, color: colors.muted },
  iconActive: { color: colors.navyDeep },
  label: { ...type.pill, fontSize: 15, color: colors.muted },
  labelActive: { color: colors.navyDeep },
  microLabel: { ...type.pill, fontSize: 10, color: colors.muted, letterSpacing: 0.6 },
  microLabelActive: { color: colors.navyDeep },
});
