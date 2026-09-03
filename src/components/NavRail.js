// The desktop half of the persistent navigation — a fixed left rail.
//
// Same data contract as TabBar (`tabs`, `active`, `onSelect`), so the two are
// interchangeable and AppChrome can swap them on a breakpoint without either
// knowing the other exists. Same treatment too, per kit §BOTTOM NAV: the active
// destination is navy with a white glyph, and labels are always shown — here
// they simply sit beside the icon instead of under it.
//
// It collapses to icons-only below layout.js's `railLabels` breakpoint, which
// is what lets the rail appear at 840px without stealing the width the content
// column needs.
import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { colors, spacing, radius, type, hitTarget } from "../theme";

export default function NavRail({ tabs, active, onSelect, width, showLabels }) {
  return (
    <View style={[styles.rail, { width }]}>
      {/* The wordmark moves up here on desktop. On a phone it sits inside the
          Home screen, where it can afford the vertical space; in a rail it
          doubles as the anchor that stops the tab group floating at the top
          edge of an 1100px-tall viewport. */}
      <View style={[styles.brandRow, !showLabels && styles.brandRowCompact]}>
        <Text style={styles.brandGlyph}>✦</Text>
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
              <Text
                style={[
                  showLabels ? styles.label : styles.microLabel,
                  isActive && styles.labelActive,
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    backgroundColor: colors.surfaceRaised,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    paddingTop: spacing(8),
    paddingHorizontal: spacing(3),
    gap: spacing(8),
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(2),
    paddingHorizontal: spacing(2),
  },
  brandRowCompact: { justifyContent: "center", paddingHorizontal: 0 },
  brandGlyph: { fontSize: 20, color: colors.accent },
  brandText: { ...type.h3, fontSize: 19 },
  group: { gap: spacing(1) },
  item: {
    borderRadius: radius.card,
    backgroundColor: "transparent",
    minHeight: hitTarget.touch,
  },
  itemFull: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(3),
    paddingHorizontal: spacing(3),
  },
  itemCompact: {
    alignItems: "center",
    justifyContent: "center",
    gap: spacing(0.5),
    paddingVertical: spacing(1.5),
  },
  itemActive: { backgroundColor: colors.brand },
  icon: { fontSize: 19, color: colors.textMuted },
  iconActive: { color: colors.onFill },
  label: { ...type.label, fontSize: 15, color: colors.textMuted },
  microLabel: { ...type.label, fontSize: 10, color: colors.textMuted },
  labelActive: { color: colors.onFill },
});
