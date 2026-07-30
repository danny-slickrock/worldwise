// Pure zoom-scale math for the World Map screen (M2.3 step 2a: zoom only —
// drag-to-pan is a later step). No RN/DOM imports, so test/engine.test.js can
// exercise it directly under tsx.

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
