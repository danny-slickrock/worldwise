// The loading state that isn't a spinner.
//
// Kit §FIVE STATES: "Loading — skeleton blocks at 10% brand tint; no spinners
// under 1s." A skeleton beats an instrument whenever the thing being waited for
// has a KNOWN SHAPE, because it reserves the layout: the page doesn't jump when
// content lands, and the reader's eye is already where the words will be.
//
// The sweep is a band of cream travelling left to right, not an opacity pulse.
// A pulse says "something is broken and blinking"; a sweep says "this is being
// drawn", which is the same grammar as the compass hunting — one system, two
// scales. It rides on translateX, so it composites off the JS thread.
//
// Reduce-motion holds the tint with no sweep at all. A block of colour where
// the paragraph will be still does the reserving job, which was always the
// larger half.
import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { colors, radius as radii, spacing } from "../theme";
import useReducedMotion from "../hooks/useReducedMotion";

// 10% brand, per the kit. Written as an rgba of pine rather than a mixed hex so
// it sits correctly on parchment and on cream alike.
const TINT = "rgba(33,64,60,0.10)";
const SHEEN = "ww-sheen";
const SWEEP_PERIOD = 1400;
// The band is wider than the block so its soft edges are always outside it —
// a hard edge entering frame reads as a glitch.
const BAND = 1.8;

export default function Skeleton({
  width = "100%",
  height = 14,
  radius = radii.sm,
  style,
  ...rest
}) {
  const reduceMotion = useReducedMotion();
  const sweep = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) return undefined;
    const loop = Animated.loop(
      Animated.timing(sweep, {
        toValue: 1,
        duration: SWEEP_PERIOD,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [reduceMotion, sweep]);

  return (
    <View
      style={[{ width, height, borderRadius: radius, backgroundColor: TINT }, styles.clip, style]}
      // A skeleton is a placeholder for content that isn't there; announcing it
      // would read a row of nothing to a screen reader. BrandLoader's live
      // region is what says "loading".
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      {...rest}
    >
      {!reduceMotion && (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              transform: [
                {
                  translateX: sweep.interpolate({
                    inputRange: [0, 1],
                    // Percentages, so one component works at every block width
                    // without measuring.
                    outputRange: ["-100%", "100%"],
                  }),
                },
              ],
            },
          ]}
        >
          <Svg width={`${BAND * 100}%`} height="100%">
            {/* One shared id across every skeleton on the page. Unlike
                Material's gradients — which differ per instance and therefore
                have to be uniquely named — every sheen is the identical
                three-stop ramp, so the duplicate ids resolve to the same paint
                whichever one the document finds first. */}
            <Defs>
              <LinearGradient id={SHEEN} x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor={colors.surfaceRaised} stopOpacity={0} />
                <Stop offset="0.5" stopColor={colors.surfaceRaised} stopOpacity={0.55} />
                <Stop offset="1" stopColor={colors.surfaceRaised} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Rect x={0} y={0} width="100%" height="100%" fill={`url(#${SHEEN})`} />
          </Svg>
        </Animated.View>
      )}
    </View>
  );
}

// A paragraph's worth. The last line is short, because real paragraphs are —
// a stack of equal bars reads as a table and the eye doesn't accept it as text.
export function SkeletonText({ lines = 3, style }) {
  return (
    <View style={[styles.stack, style]}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} height={12} width={i === lines - 1 ? "62%" : "100%"} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: "hidden" },
  stack: { gap: spacing(2.5) },
});
