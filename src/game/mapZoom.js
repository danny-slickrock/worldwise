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
// No bounds clamping yet — that's a later step (M2.3 step 2c).
export function dragPan(startPan, dx, dy, scale) {
  return { x: startPan.x + dx / scale, y: startPan.y + dy / scale };
}
