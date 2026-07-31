// World Map explore screen (M2.3 step 1) — the first cut of the interactive
// map: every country with map data is tappable, opening its country page via
// the same overlay seam the country index uses. Reachable from Home.
//
// M2.3 step 2a added zoom (pinch on native, wheel/trackpad on web), centered
// on the box. Step 2b adds drag-to-pan (single-finger on native, mouse-drag
// on web) so content beyond the initial fit is reachable — bounds/reset are
// still a later step, so panning is unclamped for now.
import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable, PanResponder, Platform } from "react-native";
import { colors, spacing, radius, type, depth } from "../theme";
import ExploreMap from "../components/ExploreMap";
import { MAP_ZOOM_MIN, MAP_ZOOM_MAX, MAP_WHEEL_ZOOM_SPEED, MAP_DRAG_THRESHOLD } from "../constants";
import { pinchScale, touchDistance, wheelZoom, dragPan } from "../game/mapZoom";

export default function WorldMapScreen({ onExit, onOpenCountry }) {
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const gesture = useRef({ mode: null, startDistance: 0, startScale: 1, startPan: { x: 0, y: 0 } });
  const mapNodeRef = useRef(null);
  const scaleRef = useRef(scale);
  const panRef = useRef(pan);
  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);
  useEffect(() => {
    panRef.current = pan;
  }, [pan]);

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
          gesture.current = { mode: "pinch", startDistance: touchDistance(a, b), startScale: scale, startPan: pan };
        } else {
          gesture.current = { mode: "pan", startDistance: 0, startScale: scale, startPan: pan };
        }
      },
      onPanResponderMove: (evt, gestureState) => {
        const touches = evt.nativeEvent.touches;
        const g = gesture.current;
        if (touches.length === 2 && g.mode === "pinch") {
          setScale(pinchScale(g.startDistance, touchDistance(touches[0], touches[1]), g.startScale, MAP_ZOOM_MIN, MAP_ZOOM_MAX));
        } else if (g.mode === "pan") {
          setPan(dragPan(g.startPan, gestureState.dx, gestureState.dy, g.startScale));
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
      setScale((current) => wheelZoom(current, e.deltaY, MAP_WHEEL_ZOOM_SPEED, MAP_ZOOM_MIN, MAP_ZOOM_MAX));
    };
    node.addEventListener("wheel", handleWheel, { passive: false });

    const drag = { active: false, startX: 0, startY: 0, startPan: { x: 0, y: 0 }, dragged: false };
    const swallowNextClick = (e) => {
      e.stopPropagation();
      node.removeEventListener("click", swallowNextClick, true);
    };
    const handleMouseMove = (e) => {
      if (!drag.active) return;
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      if (!drag.dragged && (Math.abs(dx) > MAP_DRAG_THRESHOLD || Math.abs(dy) > MAP_DRAG_THRESHOLD)) {
        drag.dragged = true;
      }
      if (drag.dragged) setPan(dragPan(drag.startPan, dx, dy, scaleRef.current));
    };
    const handleMouseUp = () => {
      drag.active = false;
      if (drag.dragged) node.addEventListener("click", swallowNextClick, true);
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
      node.removeEventListener("click", swallowNextClick, true);
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
        {...(Platform.OS === "web" ? {} : panResponder.panHandlers)}
      >
        <View style={[styles.mapScale, { transform: [{ scale }, { translateX: pan.x }, { translateY: pan.y }] }]}>
          <ExploreMap onSelect={onOpenCountry} />
        </View>
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
});
