// Bottom tab bar. Takes its tabs as data so new destinations can be added
// without touching this file — it renders whatever it's handed.
//
// The active tab is a filled, extruded tile rather than a tinted glyph: on a
// dark UI a colour swap alone is too quiet to read as "you are here".
import React from "react";
import { View, Text, StyleSheet, Pressable, Platform } from "react-native";
import { colors, spacing, radius, type, depth } from "../theme";

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
    backgroundColor: colors.navy,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    // Breathing room for the iOS home indicator without pulling in safe-area context.
    paddingBottom: Platform.OS === "ios" ? spacing(2) : spacing(1),
    paddingTop: spacing(1.25),
  },
  tab: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing(0.5) },
  tile: {
    width: 52,
    height: 44,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  tileActive: { backgroundColor: colors.teal, ...depth(3, colors.navyDeep) },
  icon: { fontSize: 22, color: colors.muted },
  iconActive: { color: colors.navyDeep },
  label: { ...type.pill, fontSize: 11, color: colors.muted, letterSpacing: 0.6 },
  labelActive: { color: colors.headline },
});
