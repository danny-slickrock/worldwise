// Bottom tab bar. Takes its tabs as data so Day D can add destinations without
// touching this file — it renders whatever it's handed.
import React from "react";
import { View, Text, StyleSheet, Pressable, Platform } from "react-native";
import { colors, spacing, type } from "../theme";

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
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={tab.label}
          >
            <Text style={[styles.icon, isActive && styles.activeInk]}>{tab.icon}</Text>
            <Text style={[styles.label, isActive && styles.activeInk]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    // Breathing room for the iOS home indicator without pulling in safe-area context.
    paddingBottom: Platform.OS === "ios" ? spacing(2) : spacing(0.75),
    paddingTop: spacing(1),
  },
  tab: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: spacing(0.5) },
  icon: { fontSize: 20, color: colors.muted, marginBottom: 2 },
  label: { ...type.pill, fontSize: 11, color: colors.muted },
  activeInk: { color: colors.navy },
});
