// World Map explore screen (M2.3 step 1) — the first cut of the interactive
// map: every country with map data is tappable, opening its country page via
// the same overlay seam the country index uses. Reachable from Home.
//
// M2.3 step 2a adds zoom (pinch on native, wheel/trackpad on web); drag-to-pan
// is a later step, so for now zooming stays centered on the box, not the
// gesture point.
import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable, PanResponder, Platform } from "react-native";
import { colors, spacing, radius, type, depth } from "../theme";
import ExploreMap from "../components/ExploreMap";
import { MAP_ZOOM_MIN, MAP_ZOOM_MAX, MAP_WHEEL_ZOOM_SPEED } from "../constants";
import { pinchScale, touchDistance, wheelZoom } from "../game/mapZoom";

export default function WorldMapScreen({ onExit, onOpenCountry }) {
  const [scale, setScale] = useState(1);
  const gesture = useRef({ startDistance: 0, startScale: 1 });
  const mapNodeRef = useRef(null);

  // Two-finger pinch, native only — a single touch is left alone so it still
  // reaches ExploreMap's tap-to-select <Path>s untouched.
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt) => evt.nativeEvent.touches.length === 2,
      onMoveShouldSetPanResponder: (evt) => evt.nativeEvent.touches.length === 2,
      onPanResponderGrant: (evt) => {
        const [a, b] = evt.nativeEvent.touches;
        gesture.current = { startDistance: touchDistance(a, b), startScale: scale };
      },
      onPanResponderMove: (evt) => {
        const touches = evt.nativeEvent.touches;
        if (touches.length !== 2) return;
        const { startDistance, startScale } = gesture.current;
        setScale(
          pinchScale(startDistance, touchDistance(touches[0], touches[1]), startScale, MAP_ZOOM_MIN, MAP_ZOOM_MAX)
        );
      },
    })
  ).current;

  // Web has no pinch gesture in RN's responder system, so zoom follows the
  // wheel/trackpad instead — bound straight to the DOM node react-native-web
  // renders under this View, since RN's synthetic events don't expose wheel.
  useEffect(() => {
    if (Platform.OS !== "web" || !mapNodeRef.current) return;
    const node = mapNodeRef.current;
    const handleWheel = (e) => {
      e.preventDefault();
      setScale((current) => wheelZoom(current, e.deltaY, MAP_WHEEL_ZOOM_SPEED, MAP_ZOOM_MIN, MAP_ZOOM_MAX));
    };
    node.addEventListener("wheel", handleWheel, { passive: false });
    return () => node.removeEventListener("wheel", handleWheel);
  }, []);

  return (
    <View style={styles.wrap}>
      <Pressable onPress={onExit} hitSlop={12} style={styles.back}>
        <Text style={styles.backText}>‹ Back</Text>
      </Pressable>

      <View style={styles.header}>
        <Text style={styles.title}>World Map</Text>
        <Text style={styles.subtitle}>Tap a country to explore it · pinch or scroll to zoom</Text>
      </View>

      <View
        style={styles.mapWrap}
        ref={mapNodeRef}
        {...(Platform.OS === "web" ? {} : panResponder.panHandlers)}
      >
        <View style={[styles.mapScale, { transform: [{ scale }] }]}>
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
