// The kit's progress bar, animated.
//
// Kit §PROGRESS / STREAK: "8px pill track, fill --ww-success, animate width at
// --ww-dur-ui." Three details in that sentence are load-bearing:
//
//   · **It animates.** A bar that snaps has no information in the motion; a bar
//     that grows shows you how far it moved, which is the only reason to draw a
//     bar rather than print a percentage.
//   · **The fill is a colour token, not a hue.** Achievements pass their badge
//     accent so a locked badge's bar matches its own card.
//   · **Reduce-motion jumps instead of animating** — the kit says so
//     explicitly, and a width transition is exactly the kind of movement the
//     preference is asking about.
//
// Width is animated with `useNativeDriver: false` because layout properties
// cannot be driven natively. That is unavoidable for a real width; the
// alternative — scaleX on a full-width bar — distorts rounded ends into
// ellipses, which is visibly wrong at the pill radius the kit specifies.
import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { colors, motion, radius } from "../theme";
import useReducedMotion from "../hooks/useReducedMotion";

export default function ProgressTrack({
  // 0..1. Clamped, because a policy that returns 1.02 should show a full bar
  // rather than overflow its own track.
  value = 0,
  height = 8,
  fill = colors.success,
  track = colors.border,
  // The label a screen reader hears. Kit §PROGRESS: "always pair a number with
  // a word" — a bare percentage is not a sentence.
  label,
  style,
  ...rest
}) {
  const reduceMotion = useReducedMotion();
  const ratio = Math.max(0, Math.min(1, Number(value) || 0));
  const anim = useRef(new Animated.Value(ratio)).current;

  useEffect(() => {
    if (reduceMotion) {
      anim.setValue(ratio);
      return undefined;
    }
    const run = Animated.timing(anim, {
      toValue: ratio,
      duration: motion.duration.ui,
      easing: Easing.bezier(...motion.easing),
      useNativeDriver: false,
    });
    run.start();
    return () => run.stop();
  }, [anim, ratio, reduceMotion]);

  return (
    <View
      style={[styles.track, { height, borderRadius: radius.pill, backgroundColor: track }, style]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(ratio * 100) }}
      accessibilityLabel={label}
      {...rest}
    >
      <Animated.View
        style={[
          styles.fill,
          {
            backgroundColor: fill,
            borderRadius: radius.pill,
            width: anim.interpolate({
              inputRange: [0, 1],
              outputRange: ["0%", "100%"],
            }),
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: "100%", overflow: "hidden" },
  fill: { height: "100%" },
});
