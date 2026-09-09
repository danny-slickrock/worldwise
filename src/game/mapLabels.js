// Sizing and placing a label on the globe. Pure — no React, no SVG — so the
// one thing that is easy to get wrong here (a tooltip that runs off the edge of
// the viewBox, or hangs over the country it is naming) is stated once and
// tested, rather than being eyeballed at one zoom level and trusted.
//
// The globe draws into a fixed square viewBox (GLOBE_VIEW_SIZE) whatever its
// on-screen size, so every number here is in viewBox units and needs no
// knowledge of the device.

// IBM Plex Mono — the map's label face — is monospaced, and a monospaced font's
// advance width is a fixed fraction of its size. That makes text width
// computable rather than measurable, which is the whole reason the tooltip can
// be a plain <Rect> + <Text> in SVG with no layout pass. 0.6 is Plex Mono's
// advance ratio.
export const MONO_ADVANCE_RATIO = 0.6;

export function monoTextWidth(text, fontSize) {
  const chars = typeof text === "string" ? text.length : 0;
  const size = Number(fontSize);
  if (!chars || !Number.isFinite(size) || size <= 0) return 0;
  return chars * size * MONO_ADVANCE_RATIO;
}

// The tooltip chip's own box, before it is placed anywhere.
export function tooltipBox(text, fontSize, padX = 4, padY = 2.5) {
  const width = monoTextWidth(text, fontSize) + padX * 2;
  // Cap height is roughly the font size; the pad is applied above and below.
  const height = Number(fontSize) + padY * 2;
  return { width, height };
}

// Where to draw a tooltip that names the thing at `center`.
//
// Two rules, both of which exist because breaking them looks like a bug:
//   · It sits ABOVE the point by `gap`, never on it. A chip centred on the
//     country covers exactly the shape the player is trying to look at.
//   · It is clamped inside the viewBox. Near the limb — which is most of the
//     globe, since a sphere foreshortens hard toward its edge — an unclamped
//     chip is half off-canvas and the name is unreadable.
//
// Returns the chip's TOP-LEFT corner plus the text's baseline anchor, because
// SVG <Rect> is positioned by corner and <Text> by baseline; computing both
// here keeps the two from drifting apart in the component.
export function placeTooltip(center, box, viewSize, gap = 6) {
  if (!Array.isArray(center) || center.length < 2) return null;
  const [cx, cy] = center;
  if (!Number.isFinite(cx) || !Number.isFinite(cy)) return null;

  const { width, height } = box;
  // Flip below the point when there is no room above — otherwise the clamp
  // alone would slide the chip down over the country it is naming.
  const above = cy - gap - height;
  const y = above >= 0 ? above : Math.min(cy + gap, viewSize - height);

  return {
    x: clamp(cx - width / 2, 0, viewSize - width),
    y: clamp(y, 0, Math.max(0, viewSize - height)),
    width,
    height,
    // Baseline: the text box's top plus the pad plus the cap height. Derived
    // from the box rather than passed in, so a padding change can't leave the
    // text sitting off its chip.
    textY: clamp(y, 0, Math.max(0, viewSize - height)) + height * 0.72,
    textX: clamp(cx - width / 2, 0, viewSize - width) + width / 2,
  };
}

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}
