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
import { chromeLayout } from "../game/layout";

export default function AppChrome({ tabs, active, onSelect, chrome = true, children }) {
  const { width } = useWindowDimensions();
  const { mode, railWidth, showLabels } = chromeLayout(width);

  if (!chrome) return <View style={styles.fill}>{children}</View>;

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
        <View style={styles.fill}>{children}</View>
      </View>
    );
  }

  return (
    <View style={styles.fill}>
      <View style={styles.fill}>{children}</View>
      <TabBar tabs={tabs} active={active} onSelect={onSelect} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  row: { flex: 1, flexDirection: "row" },
});
