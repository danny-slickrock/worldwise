// The desktop half of the persistent navigation — a fixed left rail.
//
// Same data contract as TabBar (`tabs`, `active`, `onSelect`), so the two are
// interchangeable and AppChrome can swap them on a breakpoint without either
// knowing the other exists. Same treatment too, and the same blooming pill —
// see TabBar's header for why the pill is per-tab rather than one that travels.
//
// It collapses to icons-only below layout.js's `railLabels` breakpoint, which
// is what lets the rail appear at 840px without stealing the width the content
// column needs. The lockup collapses with it: mark only, name dropped, which is
// exactly the case the kit's clear-space rule is written for.
import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Pressable, Animated, Easing } from "react-native";
import Wordmark from "./Wordmark";
import { colors, spacing, radius, type, hitTarget, motion } from "../theme";
import useReducedMotion from "../hooks/useReducedMotion";

export default function NavRail({ tabs, active, onSelect, width, showLabels }) {
  return (
    <View style={[styles.rail, { width }]}>
      {/* The lockup moves up here on desktop. On a phone it sits inside the
          Home screen, where it can afford the vertical space; in a rail it
          doubles as the anchor that stops the tab group floating at the top
          edge of an 1100px-tall viewport.

          This used to be a bare ✦ next to the name in one flat colour — two
          brand-rule violations in one row (wrong mark, wrong wordmark). It is
          the real lockup now. */}
      <View style={[styles.brandRow, !showLabels && styles.brandRowCompact]}>
        <Wordmark size={28} showName={showLabels} />
      </View>

      <View style={styles.group}>
        {tabs.map((tab) => (
          <RailItem
            key={tab.key}
            tab={tab}
            isActive={tab.key === active}
            showLabels={showLabels}
            onPress={() => onSelect(tab.key)}
          />
        ))}
      </View>

      {/* A brass rule down the rail's edge. Line, not fill — the one way brass
          is allowed to appear on a light ground. */}
      <View style={styles.edge} />
    </View>
  );
}

function RailItem({ tab, isActive, showLabels, onPress }) {
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
      style={[styles.item, showLabels ? styles.itemFull : styles.itemCompact]}
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={tab.label}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          styles.fill,
          {
            opacity: anim,
            // A rail item is wide, so the pill grows along its length — the
            // destination filling in from its own centre.
            transform: [
              { scaleX: anim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) },
            ],
          },
        ]}
      />
      <Text style={[styles.icon, isActive && styles.iconActive]}>{tab.icon}</Text>
      <Text style={[showLabels ? styles.label : styles.microLabel, isActive && styles.labelActive]}>
        {tab.label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  rail: {
    backgroundColor: colors.surfaceRaised,
    paddingTop: spacing(8),
    paddingHorizontal: spacing(3),
    gap: spacing(8),
  },
  edge: {
    position: "absolute",
    top: 0,
    bottom: 0,
    right: 0,
    width: 1,
    backgroundColor: colors.brass,
    opacity: 0.35,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing(2),
  },
  brandRowCompact: { justifyContent: "center", paddingHorizontal: 0 },
  group: { gap: spacing(1) },
  item: {
    borderRadius: radius.card,
    minHeight: hitTarget.touch,
    overflow: "hidden",
  },
  fill: { backgroundColor: colors.brand, borderRadius: radius.card },
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
  icon: { fontSize: 19, color: colors.textMuted },
  iconActive: { color: colors.onFill },
  label: { ...type.label, fontSize: 15, color: colors.textMuted },
  microLabel: { ...type.label, fontSize: 10, color: colors.textMuted },
  labelActive: { color: colors.onFill },
});
