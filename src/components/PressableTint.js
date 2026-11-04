// A Pressable that responds the way the kit says it should, and no other way.
//
// Kit §INTERACTIONS: "Hover only on pointer devices (@media (hover:hover));
// touch uses a pressed tint." The kit's original §BUTTON rule — "no scale
// bounce" — was retired by product decision (Nov 2026) for a modern Apple
// feel: a pressed surface now SINKS (motion.pressScale) on a stiff spring and
// springs back with a slight overshoot on release.
//
// The interaction vocabulary:
//
//   press  — a tint over the surface, plus the spring sink
//   hover  — the kit's e1→e2 lift plus a 1px lakewater border, pointer only
//
// Reduce-motion drops the sink entirely (the tint still shows): movement is
// exactly what that setting asks us not to do.
//
// Hover is bound through Pressable's onHoverIn/onHoverOut, which react-native-
// web only ever fires for real pointer devices — so the media query the kit
// asks for is enforced by the platform rather than re-implemented here. On
// native those props are simply never called.
//
// The tint is an absolutely-positioned overlay rather than an animated
// backgroundColor, so it composites and so it works over a Material, an image
// or a globe — anything a background colour would have to paint over.
import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet } from "react-native";
import { colors, motion, themed } from "../theme";
import useReducedMotion from "../hooks/useReducedMotion";

// Pine on light, parchment on dark: a press should read as the surface being
// pushed toward its own ink, not as a grey wash. `light` is the page ground, so
// it follows the scheme (colors.tint); `dark` is a fixed dark surface.
const TINTS = themed(() => ({ light: colors.tint, dark: "rgba(244,235,217,0.12)" }));

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function PressableTint({
  // Which ground this sits on, so the tint darkens or lightens accordingly.
  tone = "light",
  // Hover is opt-out for cards, opt-in for rows inside a scrolling list where a
  // border on every row under the pointer is noise.
  hover = true,
  // The surface's own corner radius. The tint is an absolutely-filled sibling,
  // so it has to be told — a square overlay on a rounded card shows its corners
  // for 120ms, which is exactly long enough to notice.
  radius = 0,
  onHoverIn,
  onHoverOut,
  // Pulled out explicitly. They used to be read off `...rest` while `...rest`
  // was ALSO spread onto the Pressable below — which put the caller's handler
  // after ours and silently replaced it, so a card with its own onPressIn got
  // no tint at all. Destructuring is what makes the composition real.
  onPressIn,
  onPressOut,
  style,
  children,
  ...rest
}) {
  const reduceMotion = useReducedMotion();
  const tint = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const sink = (down) => {
    if (reduceMotion || rest.disabled) return;
    Animated.spring(scale, {
      toValue: down ? motion.pressScale : 1,
      ...motion.spring.press,
      useNativeDriver: true,
    }).start();
  };
  const [hovered, setHovered] = useState(false);
  const pressed = useRef(false);

  // Animated is imperative, so the press handlers drive it directly rather than
  // through state — a setState per touch-down would re-render the subtree for a
  // purely visual change.
  const to = (v) => {
    if (reduceMotion) {
      tint.setValue(v);
      return;
    }
    Animated.timing(tint, {
      toValue: v,
      duration: motion.duration.micro,
      easing: Easing.bezier(...motion.easing),
      useNativeDriver: true,
    }).start();
  };

  useEffect(() => {
    // A press that ends because the component unmounted (navigating away on
    // tap) must not leave an animation running against a gone view.
    return () => {
      tint.stopAnimation();
      scale.stopAnimation();
    };
  }, [tint, scale]);

  return (
    <AnimatedPressable
      onPressIn={(e) => {
        pressed.current = true;
        to(1);
        sink(true);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        pressed.current = false;
        to(0);
        sink(false);
        onPressOut?.(e);
      }}
      onHoverIn={(e) => {
        if (hover) setHovered(true);
        onHoverIn?.(e);
      }}
      onHoverOut={(e) => {
        setHovered(false);
        onHoverOut?.(e);
      }}
      style={[
        style,
        hover && hovered && styles.hovered,
        reduceMotion ? null : { transform: [{ scale }] },
      ]}
      {...rest}
    >
      {children}
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: TINTS[tone], borderRadius: radius, opacity: tint },
        ]}
      />
    </AnimatedPressable>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    // Kit §CARD: "hover --ww-e2 and a 1px --ww-accent border."
    hovered: { borderColor: colors.accent },
  })
);
