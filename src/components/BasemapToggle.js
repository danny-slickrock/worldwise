// The Google-Earth switch: realistic terrain, or the plain map.
//
// Both basemaps are legitimate answers to different questions, which is why
// this is a toggle rather than a setting buried in Profile. Terrain answers
// "what is this place like?" — desert, rainforest, taiga. Simple answers "where
// exactly does this country end?", because one flat land colour makes every
// border a hard edge instead of one shade of green meeting another.
//
// Lives on the dark globe stage, so it takes the map's own on-dark inks. Per
// the kit, neither carries alpha: hierarchy on a dark ground comes from size,
// case and weight, never from opacity.
import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { radius, spacing, type, map, colors } from "../theme";
import { BASEMAPS } from "../game/settings";

const LABELS = { terrain: "Terrain", simple: "Map" };

export default function BasemapToggle({ value, onChange, style }) {
  if (!onChange) return null;
  return (
    <View style={[styles.wrap, style]}>
      {BASEMAPS.map((key) => {
        const active = key === value;
        return (
          <Pressable
            key={key}
            onPress={() => onChange(key)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${LABELS[key]} basemap`}
            style={[styles.option, active && styles.optionActive]}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{LABELS[key]}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  // A plate rather than a floating pill: the kit puts map labels on a 72%
  // nightwood plate, and the same treatment keeps this legible over ocean,
  // desert and ice alike.
  wrap: {
    flexDirection: "row",
    backgroundColor: map.labelPlate,
    borderRadius: radius.pill,
    padding: 3,
    gap: 2,
  },
  option: {
    borderRadius: radius.pill,
    paddingVertical: spacing(1.5),
    paddingHorizontal: spacing(3),
    // Kept near the pointer minimum rather than the touch minimum: the control
    // sits ON the map, and a 44px-tall chrome element would eat the globe. The
    // hitSlop above carries the real target to 46px for a finger, which is what
    // the kit's 44x44 actually asks for.
    minHeight: 26,
    justifyContent: "center",
  },
  optionActive: { backgroundColor: colors.onFill },
  label: { ...type.label, fontSize: 12, color: map.onMapQuiet },
  labelActive: { color: colors.brandDeep },
});
