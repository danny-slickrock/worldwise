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
  // Position in a group. Sugar for delay={staggerDelay(index)}.
  index = 0,
  // Explicit delay in ms; wins over `index` when both are given.
  delay = null,
  duration = motion.duration.base,
  // Travel distance. `0` fades with no movement — useful for something already
  // in place, like a hero swapping content.
  rise = motion.rise,
  style,
  ...rest
}) {
  const reduceMotion = useReducedMotion();

  // Start at the resting state when motion is off so the very first frame is
  // already correct — no flash of transparent content before the effect runs.
  const anim = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;

  useEffect(() => {
    if (reduceMotion) {
      // Covers the case where the preference resolves (or is toggled) after
      // mount: jump to the final state rather than animating toward it.
      anim.setValue(1);
      return undefined;
    }

    const animation = Animated.timing(anim, {
      toValue: 1,
      duration,
      delay: delay ?? staggerDelay(index),
      easing: Easing.bezier(...motion.easeOut),
      // Opacity and translateY are both transform-family properties, so this
      // runs off the JS thread on native and as a compositor animation on web.
      useNativeDriver: true,
    });

    animation.start();
    // Stop on unmount so a navigation mid-cascade can't set state on a gone view.
    return () => animation.stop();
  }, [anim, delay, index, duration, reduceMotion]);

  const animatedStyle = reduceMotion
    ? null
    : {
        opacity: anim,
        transform: [
          { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [rise, 0] }) },
        ],
      };

  return (
    <Animated.View style={[style, animatedStyle]} {...rest}>
      {children}
    </Animated.View>
  );
}
