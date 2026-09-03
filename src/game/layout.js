// PURE responsive-chrome policy — no React, no Dimensions, no CSS.
//
// One question, answered in one tested place: given a viewport width, what
// shape should the persistent navigation take? Components call this and render
// what it says; nothing else is allowed an opinion about a pixel threshold.
//
// Why this exists at all: the app was phone-first, so it shipped a bottom tab
// bar to every viewport. A bottom bar on a 1600px desktop is wrong twice over —
// it strands navigation a mouse-mile from the content, and it wastes the axis
// desktop actually has to spare (width) while eating the one it doesn't
// (height). theme.js's `constrain` already stopped content from sprawling
// sideways; this stops the *chrome* from being phone-shaped on a monitor.
//
// Distinct from theme.js's `layout`, which caps how wide CONTENT may get. This
// module decides the shape of the CHROME around it. Both are needed and they
// answer different questions.

// Two thresholds, both chosen from what the chrome itself needs rather than
// from a device-name list (there is no "tablet" here, only widths):
//
//   rail — below this there isn't room for a side rail and a readable content
//          column at the same time, so navigation goes back to the bottom edge
//          where a thumb can reach it. Sits above the common 834px portrait
//          tablet, which genuinely is happier with a bar.
//   railLabels — a rail can show icons alone in ~88px, but spelling out the
//          destination costs ~220px. Only spend that once the content column
//          (maxMediaWidth, 880) still fits beside it without being squeezed.
export const BREAKPOINTS = {
  rail: 840,
  railLabels: 1120,
};

export const RAIL_WIDTH = { compact: 88, full: 220 };

export function navMode(width) {
  return width >= BREAKPOINTS.rail ? "rail" : "bar";
}

// The single call a component makes. Returns everything the chrome needs to
// draw itself, so a screen never re-derives a threshold on its own.
//
// `railWidth` is 0 in bar mode rather than undefined: it is used directly as a
// left offset/padding, and 0 is the honest answer there.
export function chromeLayout(width) {
  const mode = navMode(width);
  if (mode === "bar") {
    return { mode, railWidth: 0, showLabels: true };
  }
  const showLabels = width >= BREAKPOINTS.railLabels;
  return {
    mode,
    railWidth: showLabels ? RAIL_WIDTH.full : RAIL_WIDTH.compact,
    showLabels,
  };
}

