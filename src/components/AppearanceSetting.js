// The colour-scheme setting: System · Light · Dark, as one segmented row.
//
// It lives on Profile in BOTH states (signed in, under Preferences; signed
// out, under the sign-in pitch) because it is a device setting rather than an
// account one — nobody should need an account to turn the lamp down.
import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { colors, spacing, radius, type, elevation, onFill, themed, hitTarget } from "../theme";
import { COLOR_SCHEME_PREFS, COLOR_SCHEME_LABELS } from "../game/colorScheme";

export default function AppearanceSetting({ value, onChange, style }) {
  return (
    <View style={style}>
      <Text style={styles.label}>Appearance</Text>
      <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel="Appearance">
        {COLOR_SCHEME_PREFS.map((pref) => {
          const active = pref === value;
          return (
            <Pressable
              key={pref}
              onPress={() => onChange?.(pref)}
              style={[styles.option, active && styles.optionActive]}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
            >
              <Text style={[styles.optionText, active && styles.optionTextActive]}>
                {COLOR_SCHEME_LABELS[pref]}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.hint}>
        {value === "system" ? "Follows your device’s light or dark setting." : " "}
      </Text>
    </View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    label: { ...type.eyebrow, marginBottom: spacing(3) },
    row: {
      flexDirection: "row",
      gap: spacing(1),
      padding: spacing(1),
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceRaised,
      ...elevation(1),
    },
    option: {
      flex: 1,
      // react-native-web ignores hitSlop on Pressable, so the target is the box.
      minHeight: hitTarget.touch,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radius.pill,
    },
    optionActive: { backgroundColor: colors.brand },
    optionText: { ...type.label, fontSize: 14, color: colors.textSecondary },
    optionTextActive: { color: onFill(colors.brand) },
    hint: { ...type.caption, fontSize: 12, marginTop: spacing(2) },
  })
);
