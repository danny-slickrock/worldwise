// Bottom tab bar (mobile). Takes its tabs as data so new destinations can be
// added without touching this file — it renders whatever it's handed.
//
// Kit §BOTTOM NAV: "4 tabs max, active in navy with filled icon; labels always
// shown." So the active state is a navy pill carrying a white glyph, and the
// label never disappears — the old dark-UI treatment (an extruded teal slab)
// was solving a legibility problem that only existed on a dark base.
//
// The bar itself is `surfaceRaised`, not the page: chrome sits *above* the page
// the world is printed on, and the hairline plus a faint upward shadow is what
// separates them now that a heavy border would read as a rule on paper.
import React from "react";
import { View, Text, StyleSheet, Pressable, Platform } from "react-native";
import { colors, spacing, radius, type, hitTarget } from "../theme";

export default function TabBar({ tabs, active, onSelect }) {
  return (
    <View style={styles.bar}>
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onSelect(tab.key)}
            style={styles.tab}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={tab.label}
          >
            <View style={[styles.tile, isActive && styles.tileActive]}>
              <Text style={[styles.icon, isActive && styles.iconActive]}>{tab.icon}</Text>
            </View>
            <Text style={[styles.label, isActive && styles.labelActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    backgroundColor: colors.surfaceRaised,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    // Breathing room for the iOS home indicator without pulling in safe-area context.
    paddingBottom: Platform.OS === "ios" ? spacing(4) : spacing(2),
    paddingTop: spacing(2),
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing(1),
    minHeight: hitTarget.touch,
  },
  tile: {
    width: 48,
    height: 32,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  tileActive: { backgroundColor: colors.brand },
  icon: { fontSize: 19, color: colors.textMuted },
  iconActive: { color: colors.onFill },
  label: { ...type.label, fontSize: 11, color: colors.textMuted },
  labelActive: { color: colors.brand },
});
