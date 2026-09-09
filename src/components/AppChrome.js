// The persistent navigation shell. Wraps whatever screen is current and puts
// the tab chrome around it — a bottom bar on a phone, a left rail on a desktop.
//
// Two things here are the actual fix for "clunky":
//
//  1. The chrome is OUTSIDE the screen switch, so it survives navigation. Every
//     surface except Home and Profile used to render *instead of* the tab shell
//     — open a country page and the tabs vanished, leaving unwinding as the
//     only way to reach anywhere else. Now a country page, the globe and a
//     learning path all keep their navigation.
//  2. It is one component for both form factors. The breakpoint decision comes
//     from the pure `chromeLayout()`, and TabBar and NavRail share a data
//     contract, so "responsive" is a swap of one child rather than a parallel
//     desktop layout that drifts.
//
// `chrome={false}` drops the navigation entirely for focus mode — a quiz in
// progress. That is a deliberate exception, not an oversight: mid-round, the
// only way out should be the round's own ✕.
import React from "react";
import { View, StyleSheet, useWindowDimensions } from "react-native";
import TabBar from "./TabBar";
import NavRail from "./NavRail";
import Material from "./Material";
import { colors } from "../theme";
import { chromeLayout } from "../game/layout";

// The page ground, owned here rather than by each screen.
//
// The kit calls paper fibre "the default page ground", and it means every page:
// a weave that appears on Home and stops at Profile is not a material, it is a
// decoration on one screen. Screens used to each set `backgroundColor:
// surface` on their own scroller, which is eight places to keep in step and
// eight places for one to drift. They are transparent now and this is the
// single sheet they are all printed on.
//
// It sits behind the screen slot and NOT behind the chrome: the tab bar and the
// rail are cream, and the kit is explicit that chrome sits above the page
// rather than being part of it.
//
// Screens with their own ground still win — the quiz and the globe paint over
// this, which is correct: those are the dark stage, not the page.
function Page({ children }) {
  return (
    <View style={styles.fill}>
      <Material name="paper" />
      {children}
    </View>
  );
}

export default function AppChrome({ tabs, active, onSelect, chrome = true, children }) {
  const { width } = useWindowDimensions();
  const { mode, railWidth, showLabels } = chromeLayout(width);

  if (!chrome) return <Page>{children}</Page>;

  if (mode === "rail") {
    return (
      <View style={styles.row}>
        <NavRail
          tabs={tabs}
          active={active}
          onSelect={onSelect}
          width={railWidth}
          showLabels={showLabels}
        />
        <Page>{children}</Page>
      </View>
    );
  }

  return (
    <View style={styles.fill}>
      <Page>{children}</Page>
      <TabBar tabs={tabs} active={active} onSelect={onSelect} />
    </View>
  );
}

const styles = StyleSheet.create({
  // `surface` under the material, so the very first frame — and any platform
  // that fails to draw the SVG — is still parchment rather than a hole.
  fill: { flex: 1, backgroundColor: colors.surface },
  row: { flex: 1, flexDirection: "row" },
});
