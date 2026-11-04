// The entrance primitive: fade in, rise a little, settle.
//
// One component so timing and easing live in theme.js instead of being
// re-typed per screen. It replaces the hand-rolled 260ms fade/rise that
// CountryPageScreen and QuizScreen each grew independently.
//
// Usage:
//   <FadeInUp>...</FadeInUp>                    // page content
//   {tiles.map((t, i) => <FadeInUp key={t.id} index={i}>...)}  // cascade
//
// Two properties worth preserving if this is ever rewritten:
//
// 1. It never blocks interaction. The animated view sets no pointerEvents, so a
//    button is tappable from frame one — the animation is decoration over
//    usable content, not a gate in front of it.
// 2. It respects reduce-motion by rendering the final state immediately, with
//    no transform and no timer scheduled at all.
import React, { useEffect, useRef } from "react";
import { Animated, Easing } from "react-native";
import { motion } from "../theme";
import useReducedMotion from "../hooks/useReducedMotion";

// Position in a staggered group → delay in ms. Capped so a long list (the
// 196-country index) can't schedule a cascade that outlasts the reader's
// patience; past the cap everything shares the final delay and arrives together.
export function staggerDelay(index = 0) {
  if (!index || index < 0) return 0;
  return Math.min(index, motion.maxStaggerSteps) * motion.stagger;
}

export default function FadeInUp({
  children,
  index = 0,
  delay = null,
  duration = motion.duration.ui,
  rise = motion.rise,
  style,
  ...rest
}) {
  const reduceMotion = useReducedMotion();

  // Two drivers: opacity fades on a timed curve (a spring's overshoot would
  // flash past 100%), while position and scale SPRING — a soft rise that
  // overshoots a touch and settles, which is where the drama comes from.
  const fade = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const lift = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;

  useEffect(() => {
    if (reduceMotion) {
      fade.setValue(1);
      lift.setValue(1);
      return undefined;
    }
    const wait = delay ?? staggerDelay(index);
    const animation = Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration,
        delay: wait,
        easing: Easing.bezier(...motion.easing),
        useNativeDriver: true,
      }),
      Animated.spring(lift, {
        toValue: 1,
        delay: wait,
        ...motion.spring.entrance,
        useNativeDriver: true,
      }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [fade, lift, delay, index, duration, reduceMotion]);

  // `rise={0}` (a block inside a screen that itself rises) also opts out of
  // the scale, so nested entrances never compound into a wobble.
  const animatedStyle = reduceMotion
    ? null
    : {
        opacity: fade,
        transform: [
          { translateY: lift.interpolate({ inputRange: [0, 1], outputRange: [rise, 0] }) },
          {
            scale: lift.interpolate({
              inputRange: [0, 1],
              outputRange: [rise ? motion.entranceScale : 1, 1],
            }),
          },
        ],
      };

  return (
    <Animated.View style={[style, animatedStyle]} {...rest}>
      {children}
    </Animated.View>
  );
}
