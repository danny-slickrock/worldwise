// The waiting state, wearing the brand.
//
// Kit §FIVE STATES: "Loading — skeleton blocks at 10% brand tint; no spinners
// under 1s." Both halves of that matter, and this component is the second half:
// when a wait is long enough to need an indicator at all, it is the compass,
// not a platform ActivityIndicator that belongs to some other product.
//
// `delay` is the "no spinners under 1s" rule made mechanical. Nothing renders
// until the wait has actually lasted that long, so a fast load shows a calm
// blank frame instead of a flash of instrument — which is the thing that makes
// an app feel slower than it is. For content-shaped waits prefer <Skeleton>;
// this is for whole-screen and whole-panel waits where there is no shape to
// stand in for yet.
/* global setTimeout, clearTimeout */
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import SpinningMark from "./SpinningMark";
import { MaterialSurface } from "./Material";
import { colors, materialInk, spacing, type } from "../theme";

// Kit §MOTION / §FIVE STATES.
export const SPINNER_DELAY = 1000;

export default function BrandLoader({
  // What is being waited for, in the kit's voice: "Reading the atlas…".
  label = null,
  size = 64,
  // "page" fills its parent on the paper ground; "panel" is the dark inset;
  // "inline" is a bare mark for a row that already has its own ground.
  variant = "page",
  delay = SPINNER_DELAY,
  style,
}) {
  const [visible, setVisible] = useState(delay <= 0);

  useEffect(() => {
    if (delay <= 0) return undefined;
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  // A live region either way: a screen reader should hear "loading" the moment
  // the wait starts, whether or not a sighted user sees anything yet.
  const a11y = {
    accessibilityRole: "progressbar",
    accessibilityLabel: label ?? "Loading",
    "aria-live": "polite",
  };

  if (!visible) return <View style={[styles.fill, style]} {...a11y} />;

  if (variant === "inline") {
    return (
      <View style={[styles.inline, style]} {...a11y}>
        <SpinningMark size={size} halo={false} />
        {label ? <Text style={styles.inlineLabel}>{label}</Text> : null}
      </View>
    );
  }

  const dark = variant === "panel";
  const ink = materialInk(dark ? "duskDeep" : "paper");

  return (
    <MaterialSurface
      name={dark ? "duskDeep" : "paper"}
      style={[styles.fill, styles.center, style]}
      {...a11y}
    >
      <SpinningMark size={size} tone={dark ? "cream" : "pine"} />
      {label ? (
        <Text
          style={[
            styles.label,
            // The kit gives lichen a 16px floor over a material; the eyebrow
            // scale is 11px, so on dark this label steps up rather than
            // reaching for an alpha it isn't allowed.
            dark ? { color: ink.quiet, fontSize: ink.quietMinSize } : null,
          ]}
        >
          {label}
        </Text>
      ) : null}
    </MaterialSurface>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center", gap: spacing(5) },
  label: { ...type.eyebrow, color: colors.textMuted },
  inline: { flexDirection: "row", alignItems: "center", gap: spacing(3) },
  inlineLabel: { ...type.caption },
});
