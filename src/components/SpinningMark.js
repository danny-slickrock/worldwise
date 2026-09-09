// The mark, alive. This is the app's loading indicator.
//
// It is deliberately not a throbber with a logo dropped in the middle.
// CompassMark comes apart into a housing and a needle (see its header), so:
//
//   · the NEEDLE hunts — fast, slow, fast, slow, the way a magnetic needle
//     swings toward a bearing and overshoots. Constant rate is what a spinner
//     does; the varying rate is what makes it read as an instrument.
//   · the GLOBE inside the housing drifts the other way, at a twentieth of the
//     rate. Barely visible, and the whole reason it reads as depth rather than
//     as a rotating decal.
//   · a lakewater HALO breathes out from the pivot and fades on the needle's
//     own period, so the two motions are locked rather than merely coexisting.
//   · when loading ENDS the needle does not stop dead. It finishes its turn on
//     an ease-out and settles on north — an instrument coming to rest. A
//     spinner that vanishes mid-rotation is the tell that it was never
//     measuring anything.
//
// The hunting rate is a multi-stop interpolation, not a bezier easing, and that
// is not a style choice. An ease-in-out across one full turn has zero velocity
// at both ends, so a looped rotation visibly STOPS every revolution. Placing
// the slow phases at the quarter points instead puts the fast phase across the
// loop seam, and the join is invisible.
//
// Reduce-motion renders the same mark, still. That is not a degraded loader:
// the mark alone still says "Worldwise is working", and for someone with a
// vestibular disorder a permanently rotating object is the single worst thing a
// loading state can do.
import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import CompassMark from "./CompassMark";
import { colors, motion } from "../theme";
import { markDetail, hasRing } from "../game/brandMark";
import useReducedMotion from "../hooks/useReducedMotion";

// One hunt. Long enough to read as searching rather than as frantic.
const NEEDLE_PERIOD = 2200;
// The globe behind it, at a twentieth of the rate.
const GLOBE_PERIOD = NEEDLE_PERIOD * 20;
// The rest, once there is nothing left to wait for.
const SETTLE = motion.duration.sheet * 2;

// Fastest across the loop seam (300°→360°→120°), slowest at the quarter points.
const HUNT = {
  inputRange: [0, 0.25, 0.5, 0.75, 1],
  outputRange: ["0deg", "120deg", "180deg", "300deg", "360deg"],
};

const TURN = { inputRange: [0, 1], outputRange: ["0deg", "-360deg"] };

// A 0→1 loop that, when it stops, finishes the turn it is on rather than
// freezing at whatever angle it happened to reach.
function useTurn(active, duration, { settle = false } = {}) {
  const value = useRef(new Animated.Value(0)).current;
  const everRan = useRef(false);

  useEffect(() => {
    if (active) {
      everRan.current = true;
      const loop = Animated.loop(
        Animated.timing(value, {
          toValue: 1,
          duration,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      loop.start();
      // Stopped on unmount and on every flip of `active`, so a screen that
      // finishes loading mid-turn leaves no timer against a gone view.
      return () => loop.stop();
    }

    if (!settle || !everRan.current) {
      value.setValue(0);
      return undefined;
    }

    // Animated.loop restarts from 0 each iteration, so the value sits in [0,1)
    // — running it to 1 is exactly "complete the revolution you are on".
    const rest = Animated.timing(value, {
      toValue: 1,
      duration: SETTLE,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    rest.start(({ finished }) => {
      // 1 and 0 are the same angle; normalising means the next spin starts from
      // a known place instead of accumulating.
      if (finished) value.setValue(0);
    });
    return () => rest.stop();
  }, [active, duration, settle, value]);

  return value;
}

export default function SpinningMark({
  size = 56,
  tone = "pine",
  // False renders the identical mark at rest. If it was spinning, it settles.
  spinning = true,
  // The breathing halo. Off inside dense layouts, where it would collide.
  halo = true,
  style,
  ...rest
}) {
  const reduceMotion = useReducedMotion();
  const active = spinning && !reduceMotion;

  const needle = useTurn(active, NEEDLE_PERIOD, { settle: true });
  const globe = useTurn(active, GLOBE_PERIOD);

  // The transforms are applied unconditionally — at rest the driving value is
  // 0, which interpolates to 0deg. Making the STYLE conditional instead would
  // snap the needle to north the instant loading ended, which is the settle
  // this component exists to avoid.
  const needleSpin = { transform: [{ rotate: needle.interpolate(HUNT) }] };
  const globeSpin = { transform: [{ rotate: globe.interpolate(TURN) }] };

  // The housing only exists at 32px and up; below that there is nothing to
  // counter-rotate and nothing for a halo to sit inside.
  const layered = hasRing(markDetail(size));

  if (!layered) {
    return (
      <Animated.View style={[style, needleSpin]} {...rest}>
        <CompassMark size={size} tone={tone} />
      </Animated.View>
    );
  }

  return (
    <View style={[{ width: size, height: size }, style]} {...rest}>
      {halo && active && <Halo size={size} progress={needle} tone={tone} />}

      <Animated.View style={[StyleSheet.absoluteFill, globeSpin]}>
        <CompassMark size={size} tone={tone} parts="globe" />
      </Animated.View>

      <Animated.View style={[StyleSheet.absoluteFill, needleSpin]}>
        <CompassMark size={size} tone={tone} parts="needle" />
      </Animated.View>
    </View>
  );
}

// A ring that grows out of the pivot and fades, locked to the needle's period
// so it pushes out once per hunt rather than drifting against it.
function Halo({ size, progress, tone }) {
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        styles.halo,
        {
          borderColor: tone === "pine" ? colors.accent : colors.accentLight,
          borderRadius: size / 2,
          opacity: progress.interpolate({
            inputRange: [0, 0.15, 0.75, 1],
            outputRange: [0, 0.3, 0, 0],
          }),
          transform: [
            {
              scale: progress.interpolate({
                inputRange: [0, 0.75, 1],
                outputRange: [0.35, 1.25, 1.25],
              }),
            },
          ],
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  halo: { borderWidth: 1.5 },
});
