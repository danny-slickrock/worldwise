// World Map explore screen (M2.3 step 1) — the first cut of the interactive
// map: every country with map data is tappable, opening its country page via
// the same overlay seam the country index uses. Reachable from Home.
//
// M2.3 step 2a added zoom (pinch on native, wheel/trackpad on web), centered
// on the box. Step 2b added drag-to-pan (single-finger on native, mouse-drag
// on web). Step 2c (this one) clamps pan to the map's own bounds — see
// clampPan in game/mapZoom.js for the math — and adds a Reset button so a
// lost pinch/drag always has a way back to the fitted view.
import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable, PanResponder, Platform } from "react-native";
import { colors, spacing, radius, type, depth } from "../theme";
import ExploreMap from "../components/ExploreMap";
import { MAP_ZOOM_MIN, MAP_ZOOM_MAX, MAP_WHEEL_ZOOM_SPEED, MAP_DRAG_THRESHOLD } from "../constants";
import { pinchScale, touchDistance, wheelZoom, dragPan, clampPan } from "../game/mapZoom";

export default function WorldMapScreen({ onExit, onOpenCountry }) {
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const gesture = useRef({ mode: null, startDistance: 0, startScale: 1, startPan: { x: 0, y: 0 } });
  const mapNodeRef = useRef(null);
  const scaleRef = useRef(scale);
  const panRef = useRef(pan);
  const boxSizeRef = useRef({ width: 0, height: 0 });
  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);
  useEffect(() => {
    panRef.current = pan;
  }, [pan]);

  // Applies a candidate scale, then re-clamps the current pan against the box
  // it's actually visible in — zooming back out can leave a pan that was
  // valid at a higher scale hanging past the new, smaller overflow. Refs are
  // updated synchronously (not just via the effects above) so back-to-back
  // wheel/pinch events in the same tick read the value this call just set,
  // not last render's.
  const applyScale = (nextScale) => {
    const nextPan = clampPan(panRef.current, nextScale, boxSizeRef.current.width, boxSizeRef.current.height);
    scaleRef.current = nextScale;
    panRef.current = nextPan;
    setScale(nextScale);
    setPan(nextPan);
  };

  const isReset = scale === 1 && pan.x === 0 && pan.y === 0;
  const resetView = () => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  };

  const handleMapLayout = (e) => {
    const { width, height } = e.nativeEvent.layout;
    boxSizeRef.current = { width, height };
  };

  // Two-finger pinch zooms; a single touch only starts panning once it moves
  // past the drag threshold, so a stationary tap still falls through to
  // ExploreMap's tap-to-select <Path>s untouched.
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt) => evt.nativeEvent.touches.length === 2,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        const touches = evt.nativeEvent.touches;
        if (touches.length === 2) return true;
        if (touches.length === 1) {
          return Math.abs(gestureState.dx) > MAP_DRAG_THRESHOLD || Math.abs(gestureState.dy) > MAP_DRAG_THRESHOLD;
        }
        return false;
      },
      onPanResponderGrant: (evt) => {
        const touches = evt.nativeEvent.touches;
        if (touches.length === 2) {
          const [a, b] = touches;
          gesture.current = {
            mode: "pinch",
            startDistance: touchDistance(a, b),
            startScale: scaleRef.current,
            startPan: panRef.current,
          };
        } else {
          gesture.current = { mode: "pan", startDistance: 0, startScale: scaleRef.current, startPan: panRef.current };
        }
      },
      onPanResponderMove: (evt, gestureState) => {
        const touches = evt.nativeEvent.touches;
        const g = gesture.current;
        if (touches.length === 2 && g.mode === "pinch") {
          applyScale(pinchScale(g.startDistance, touchDistance(touches[0], touches[1]), g.startScale, MAP_ZOOM_MIN, MAP_ZOOM_MAX));
        } else if (g.mode === "pan") {
          const next = dragPan(g.startPan, gestureState.dx, gestureState.dy, g.startScale);
          setPan(clampPan(next, scaleRef.current, boxSizeRef.current.width, boxSizeRef.current.height));
        }
      },
    })
  ).current;

  // Web has no pinch/pan gesture in RN's responder system, so zoom follows
  // the wheel/trackpad and panning follows a mouse drag — both bound
  // straight to the DOM node react-native-web renders under this View, since
  // RN's synthetic events don't expose wheel/mouse move globally.
  useEffect(() => {
    if (Platform.OS !== "web" || !mapNodeRef.current) return;
    const node = mapNodeRef.current;

    const handleWheel = (e) => {
      e.preventDefault();
      applyScale(wheelZoom(scaleRef.current, e.deltaY, MAP_WHEEL_ZOOM_SPEED, MAP_ZOOM_MIN, MAP_ZOOM_MAX));
    };
    node.addEventListener("wheel", handleWheel, { passive: false });

    const drag = { active: false, startX: 0, startY: 0, startPan: { x: 0, y: 0 }, dragged: false };
    // Bound to window, not the map node: a drag can end with the cursor
    // outside the map box (released over the header, the Reset pill's own
    // area, or off-window entirely), and the click a mouseup fires lands
    // wherever the cursor is — a listener on the map node alone would never
    // see that click, leaving it attached to wrongly swallow the *next*
    // real click inside the box instead.
    const swallowNextClick = (e) => {
      e.stopPropagation();
      window.removeEventListener("click", swallowNextClick, true);
    };
    const handleMouseMove = (e) => {
      if (!drag.active) return;
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      if (!drag.dragged && (Math.abs(dx) > MAP_DRAG_THRESHOLD || Math.abs(dy) > MAP_DRAG_THRESHOLD)) {
        drag.dragged = true;
      }
      if (drag.dragged) {
        const next = clampPan(
          dragPan(drag.startPan, dx, dy, scaleRef.current),
          scaleRef.current,
          boxSizeRef.current.width,
          boxSizeRef.current.height
        );
        panRef.current = next;
        setPan(next);
      }
    };
    const handleMouseUp = () => {
      drag.active = false;
      if (drag.dragged) window.addEventListener("click", swallowNextClick, true);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
    const handleMouseDown = (e) => {
      drag.active = true;
      drag.dragged = false;
      drag.startX = e.clientX;
      drag.startY = e.clientY;
      drag.startPan = panRef.current;
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    };
    node.addEventListener("mousedown", handleMouseDown);

    return () => {
      node.removeEventListener("wheel", handleWheel);
      node.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("click", swallowNextClick, true);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  return (
    <View style={styles.wrap}>
      <Pressable onPress={onExit} hitSlop={12} style={styles.back}>
        <Text style={styles.backText}>‹ Back</Text>
      </Pressable>

      <View style={styles.header}>
        <Text style={styles.title}>World Map</Text>
        <Text style={styles.subtitle}>Tap a country to explore it · pinch/scroll to zoom · drag to pan</Text>
      </View>

      <View
        style={styles.mapWrap}
        ref={mapNodeRef}
        onLayout={handleMapLayout}
        {...(Platform.OS === "web" ? {} : panResponder.panHandlers)}
      >
        <View style={[styles.mapScale, { transform: [{ scale }, { translateX: pan.x }, { translateY: pan.y }] }]}>
          <ExploreMap onSelect={onOpenCountry} />
        </View>

        {!isReset && (
          <Pressable onPress={resetView} hitSlop={8} style={styles.resetPill}>
            <Text style={styles.resetPillText}>Reset view</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  back: { paddingHorizontal: spacing(2.5), paddingTop: spacing(2), paddingBottom: spacing(1) },
  backText: { ...type.pill, fontSize: 14, color: colors.teal },

  header: { paddingHorizontal: spacing(2.5), marginBottom: spacing(2) },
  title: { ...type.hero, fontSize: 34 },
  subtitle: { ...type.section, fontSize: 11, marginTop: spacing(0.75) },

  // The map stage is deep navy everywhere it appears (see QuizScreen's mapBox),
  // so the world reads as the lit subject rather than as chrome.
  mapWrap: {
    flex: 1,
    marginHorizontal: spacing(2.5),
    marginBottom: spacing(3),
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: colors.navy,
    ...depth(5),
  },
  mapScale: { flex: 1 },

  resetPill: {
    position: "absolute",
    top: spacing(2),
    right: spacing(2),
    paddingHorizontal: spacing(1.75),
    paddingVertical: spacing(1),
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    ...depth(3),
  },
  resetPillText: { ...type.pill, fontSize: 12, color: colors.teal },
});
