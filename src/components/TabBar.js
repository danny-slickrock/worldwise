// Bottom tab bar (mobile). Takes its tabs as data so new destinations can be
// added without touching this file — it renders whatever it's handed.
//
// Kit §BOTTOM NAV: "4 tabs max, active in brand with a filled icon; labels
// always visible at 10/600." So the active state is a pine pill carrying a
// parchment glyph, and the label never disappears.
//
// THE PILL IS ANIMATED, AND IT BLOOMS RATHER THAN SLIDES. A pill that travels
// between tabs has to measure them, which means an onLayout pass, a stored
// width per tab and a re-measure on every rotation and font-scale change — a
// lot of machinery to make the chrome lag one frame behind the tap. Instead
// each tab owns its own pill, which grows out of the centre on selection and
// shrinks away on deselection. Both run at once, so the eye still reads it as
// one pill moving across, and the tapped tab responds on the same frame.
//
// The glyph rises 2px as it fills. That is the entire "filled icon" the kit
// asks for, done with motion instead of a second icon set: it reads as the
// destination lifting toward you.
import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Pressable, Platform, Animated, Easing } from "react-native";
import { colors, spacing, radius, type, hitTarget, motion } from "../theme";
import useReducedMotion from "../hooks/useReducedMotion";

export default function TabBar({ tabs, active, onSelect }) {
  return (
    <View style={styles.bar}>
      {/* A brass hairline above the bar — the kit's "ember and brass appear as
          line and rule far more often than as fill". It is what separates the
          chrome from the page now that a heavy border would read as a rule
          drawn on paper. */}
      <View style={styles.rule} />
      {tabs.map((tab) => (
        <Tab
          key={tab.key}
          tab={tab}
          isActive={tab.key === active}
          onPress={() => onSelect(tab.key)}
        />
      ))}
    </View>
  );
}

function Tab({ tab, isActive, onPress }) {
  const reduceMotion = useReducedMotion();
  const anim = useRef(new Animated.Value(isActive ? 1 : 0)).current;

  useEffect(() => {
    if (reduceMotion) {
      anim.setValue(isActive ? 1 : 0);
      return undefined;
    }
    const run = Animated.timing(anim, {
      toValue: isActive ? 1 : 0,
      duration: motion.duration.ui,
      easing: Easing.bezier(...motion.easing),
      useNativeDriver: true,
    });
    run.start();
    return () => run.stop();
  }, [anim, isActive, reduceMotion]);

  return (
    <Pressable
      onPress={onPress}
      style={styles.tab}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={tab.label}
    >
      <View style={styles.tile}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            styles.pill,
            {
              opacity: anim,
              // scaleX only: a uniform scale would make the pill grow taller
              // as well, which reads as a bubble rather than as a pill sliding
              // into place.
              transform: [
                { scaleX: anim.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }) },
              ],
            },
          ]}
        />
        <Animated.Text
          style={[
            styles.icon,
            isActive && styles.iconActive,
            {
              transform: [
                { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -2] }) },
              ],
            },
          ]}
        >
          {tab.icon}
        </Animated.Text>
      </View>
      <Text style={[styles.label, isActive && styles.labelActive]}>{tab.label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    backgroundColor: colors.surfaceRaised,
    // Breathing room for the iOS home indicator without pulling in safe-area context.
    paddingBottom: Platform.OS === "ios" ? spacing(4) : spacing(2),
    paddingTop: spacing(2),
  },
  rule: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.brass,
    opacity: 0.35,
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
  },
  pill: { backgroundColor: colors.brand, borderRadius: radius.pill },
  icon: { fontSize: 19, color: colors.textMuted },
  iconActive: { color: colors.onFill },
  label: { ...type.label, fontSize: 11, color: colors.textMuted },
  labelActive: { color: colors.brand },
});
