// Pure zoom/pan math for the World Map screen. No RN/DOM imports, so
// test/engine.test.js can exercise it directly under tsx.

export function clampScale(scale, min, max) {
  return Math.min(max, Math.max(min, scale));
}

// Two-finger pinch (native): scale relative to the gesture's start, driven by
// how much the distance between the two touches has changed since it began.
export function pinchScale(startDistance, currentDistance, startScale, min, max) {
  if (startDistance <= 0) return clampScale(startScale, min, max);
  return clampScale(startScale * (currentDistance / startDistance), min, max);
}

// Mouse-wheel/trackpad zoom (web): scrolling up (negative deltaY) zooms in.
export function wheelZoom(currentScale, deltaY, speed, min, max) {
  return clampScale(currentScale - deltaY * speed, min, max);
}

// Distance between two RN touch points ({ pageX, pageY }), for pinchScale.
export function touchDistance(touchA, touchB) {
  const dx = touchA.pageX - touchB.pageX;
  const dy = touchA.pageY - touchB.pageY;
  return Math.sqrt(dx * dx + dy * dy);
}

// Single-finger/mouse drag-to-pan: dx/dy are the raw screen-pixel distance
// travelled since the drag started. Dividing by the scale in effect when the
// drag began converts that into the map's own (pre-scale) units, so the
// content tracks the finger/cursor 1:1 on screen regardless of zoom level.
// Bounds are enforced separately by clampPan.
export function dragPan(startPan, dx, dy, scale) {
  return { x: startPan.x + dx / scale, y: startPan.y + dy / scale };
}

// Keeps the map from panning fully out of view. The map fills the box exactly
// at scale 1 (preserveAspectRatio="meet"), and the transform applies pan in
// the map's own pre-scale units *before* scaling (see WorldMapScreen), so a
// pan of p renders as a p*scale screen-pixel shift. The zoomed-in overflow on
// each side is boxSize*(scale-1)/2 screen pixels, so the largest pan that
// still keeps the map covering the box is that overflow divided by scale.
// At scale 1 the bound is 0 — there's nothing to pan into a fully-fit view.
export function clampPan(pan, scale, boxWidth, boxHeight) {
  const maxX = boxWidth > 0 ? (boxWidth * (scale - 1)) / (2 * scale) : 0;
  const maxY = boxHeight > 0 ? (boxHeight * (scale - 1)) / (2 * scale) : 0;
  return {
    x: clampScale(pan.x, -maxX, maxX),
    y: clampScale(pan.y, -maxY, maxY),
  };
}
