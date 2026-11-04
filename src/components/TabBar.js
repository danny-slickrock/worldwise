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
import { View, Text, StyleSheet, Pressable, Platform, Animated } from "react-native";
import {
  colors,
  spacing,
  radius,
  type,
  hitTarget,
  motion,
  themed,
  onFill,
  glass,
  elevation,
} from "../theme";
import Glass from "./Glass";
import useReducedMotion from "../hooks/useReducedMotion";

// The bar FLOATS: a frosted glass pane inset from the screen edges, with the
// page scrolling behind it — the modern Apple tab bar. AppChrome positions it
// and tells each screen how much bottom inset to leave (ChromeSpacer), so the
// last item can still scroll clear of it.
export const TAB_BAR_HEIGHT = 64;
export const TAB_BAR_MARGIN = spacing(3);
export const TAB_BAR_BOTTOM = TAB_BAR_MARGIN + (Platform.OS === "ios" ? spacing(4) : 0);

export default function TabBar({ tabs, active, onSelect }) {
  return (
    <Glass style={styles.bar}>
      {tabs.map((tab) => (
        <Tab
          key={tab.key}
          tab={tab}
          isActive={tab.key === active}
          onPress={() => onSelect(tab.key)}
        />
      ))}
    </Glass>
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
    // A spring, so the pill blooms past full width a touch and settles.
    const run = Animated.spring(anim, {
      toValue: isActive ? 1 : 0,
      ...motion.spring.bloom,
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
              // Clamped: the spring overshoots 1, and opacity past 1 is noise.
              opacity: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 1],
                extrapolate: "clamp",
              }),
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

const styles = themed(() =>
  StyleSheet.create({
    bar: {
      position: "absolute",
      left: TAB_BAR_MARGIN,
      right: TAB_BAR_MARGIN,
      bottom: TAB_BAR_BOTTOM,
      height: TAB_BAR_HEIGHT,
      flexDirection: "row",
      alignItems: "center",
      borderRadius: glass.radius,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      ...elevation(3),
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
    iconActive: { color: onFill(colors.brand) },
    label: { ...type.label, fontSize: 11, color: colors.textMuted },
    labelActive: { color: colors.brand },
  })
);
