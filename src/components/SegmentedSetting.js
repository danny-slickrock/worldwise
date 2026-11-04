// One labelled segmented row — the shape every Settings choice shares
// (appearance, sound, map style). A radiogroup rather than a toggle, so a
// screen reader announces the choice AND the alternatives.
import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { colors, spacing, radius, type, elevation, onFill, themed, hitTarget } from "../theme";

export default function SegmentedSetting({ label, options, value, onChange, hint, style }) {
  return (
    <View style={style}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel={label}>
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <Pressable
              key={String(opt.value)}
              onPress={() => onChange?.(opt.value)}
              style={[styles.option, active && styles.optionActive]}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
            >
              <Text style={[styles.optionText, active && styles.optionTextActive]}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
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
