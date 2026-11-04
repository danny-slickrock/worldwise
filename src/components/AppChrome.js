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
import React, { createContext, useContext } from "react";
import { View, StyleSheet, useWindowDimensions } from "react-native";
import TabBar, { TAB_BAR_HEIGHT, TAB_BAR_BOTTOM } from "./TabBar";
import NavRail, { RAIL_MARGIN } from "./NavRail";
import Material from "./Material";
import { colors, themed } from "../theme";
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
// It now sits behind the chrome too: the tab bar and rail are frosted GLASS
// panes floating above the page, so the page has to be there for them to
// frost. (They used to be opaque cream beside it.)
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

// How much of the bottom edge the floating chrome covers. Screens read it via
// <ChromeSpacer /> at the end of their scroll content, so the last item can
// scroll clear of the glass tab bar instead of stopping underneath it.
const ChromeInsetContext = createContext({ bottom: 0 });

// The same inset as a number, for a screen that fills the viewport rather than
// scrolling (the Explore globe), so it can stop above the floating bar.
export const useChromeInset = () => useContext(ChromeInsetContext);

export function ChromeSpacer() {
  const { bottom } = useContext(ChromeInsetContext);
  return bottom ? <View style={{ height: bottom }} pointerEvents="none" /> : null;
}

export default function AppChrome({ tabs, active, onSelect, chrome = true, children }) {
  const { width } = useWindowDimensions();
  const { mode, railWidth, showLabels } = chromeLayout(width);

  if (!chrome) return <Page>{children}</Page>;

  // Both chromes FLOAT over the page as glass. The rail never has content
  // under it (the page is offset past it); the bar does — content scrolls
  // behind it, which is what the frosting is for.
  if (mode === "rail") {
    return (
      <View style={styles.fill}>
        <Material name="paper" />
        <View style={[styles.fill, { marginLeft: railWidth + RAIL_MARGIN * 2 }]}>
          <View style={styles.fill}>{children}</View>
        </View>
        <NavRail
          tabs={tabs}
          active={active}
          onSelect={onSelect}
          width={railWidth}
          showLabels={showLabels}
        />
      </View>
    );
  }

  return (
    <ChromeInsetContext.Provider value={{ bottom: TAB_BAR_HEIGHT + TAB_BAR_BOTTOM }}>
      <View style={styles.fill}>
        <Page>{children}</Page>
        <TabBar tabs={tabs} active={active} onSelect={onSelect} />
      </View>
    </ChromeInsetContext.Provider>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    // `surface` under the material, so the very first frame — and any platform
    // that fails to draw the SVG — is still parchment rather than a hole.
    fill: { flex: 1, backgroundColor: colors.surface },
  })
);
