// The Worldwise lockup: the compass mark, then the name.
//
// The name was being typed out by hand in two places (HomeScreen's header and
// NavRail's, which used a bare ✦ instead of the mark and drew the name in one
// flat colour). Both were a brand-rule violation waiting to spread, so the
// lockup is now a component and the rules live in one file:
//
//   · **Two-tone, always.** "World" in pine, "wise" in lakewater; on a dark
//     ground, parchment and lakewater-light. Never one flat colour.
//   · **Newsreader 600** — the single place the display face is used at 600,
//     "because a logotype needs presence the headline scale does not".
//   · **Tracking -0.01em, and never past -0.012em.** The serif wants air.
//   · **Clear space is 0.5× the mark height**, measured from the star points —
//     so it scales with the lockup rather than being a fixed 8px that goes
//     wrong at both ends.
//   · **Minimum mark height 28px** for the lockup (16px for the bare icon).
//     Below the floor the mark is dropped rather than shrunk past legibility.
//
// It renders as ONE <Text> with a nested span, not two adjacent Texts: the name
// has to wrap, scale and get selected as a single word. Two siblings in a row
// break at the seam under dynamic type.
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import CompassMark from "./CompassMark";
import SpinningMark from "./SpinningMark";
import { colors, fonts, type } from "../theme";
import { clearSpace } from "../game/brandMark";

// Kit §LOGO: "Minimum sizes: lockup 28px mark height."
export const LOCKUP_MIN_MARK = 28;

// The name is set slightly larger than the mark is tall — the cap height of
// Newsreader at this ratio matches the mark's ring, which is what makes the two
// look aligned rather than merely centred.
const NAME_RATIO = 1.02;

const TONES = {
  light: { mark: "pine", world: colors.brand, wise: colors.accent },
  dark: { mark: "cream", world: colors.onFill, wise: colors.accentLight },
};

export default function Wordmark({
  // Mark height in px. The name and the clear space both derive from it.
  size = 32,
  // Which ground this is sitting on, not which colour to use.
  tone = "light",
  // Icons-only rail, or anywhere the name is already on screen.
  showName = true,
  // Drives the mark's loading animation. `false` is a plain, still lockup.
  spinning = false,
  style,
  ...rest
}) {
  const t = TONES[tone] ?? TONES.light;
  const mark = Math.max(size, LOCKUP_MIN_MARK);
  const fontSize = Math.round(mark * NAME_RATIO);

  return (
    <View
      style={[styles.row, { gap: clearSpace(mark) }, style]}
      accessibilityRole="header"
      accessibilityLabel="Worldwise"
      {...rest}
    >
      {spinning ? (
        <SpinningMark size={mark} tone={t.mark} halo={false} />
      ) : (
        <CompassMark size={mark} tone={t.mark} />
      )}

      {showName && (
        <Text
          // Already announced by the row's label; reading it twice is noise.
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[
            styles.name,
            { fontSize, lineHeight: Math.round(fontSize * 1.1), color: t.world },
            // -0.01em, resolved against this instance's own size.
            { letterSpacing: -0.01 * fontSize },
          ]}
        >
          World<Text style={{ color: t.wise }}>wise</Text>
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
  name: { ...type.h1, fontFamily: fonts.displayBold },
});
