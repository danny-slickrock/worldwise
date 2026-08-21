// World Map explore screen. Since M2.3.7 the surface is a GLOBE: an
// orthographic projection of the sphere (see game/globeProjection.js), spun by
// dragging and zoomed by pinch/wheel. Tapping a country still opens its page
// through the same overlay seam the country index uses.
//
// What carried over from the flat map (M2.3 steps 1-5) and what didn't:
//   · Gesture plumbing is unchanged — the 2-touch-only pinch claim, the
//     drag-threshold before a single touch becomes a gesture, and the web
//     mousedown/wheel listeners bound to the real DOM node all behave exactly
//     as they did, including the window-bound click swallow that stops a drag
//     released over a country from opening it.
//   · Pan became SPIN. A flat map has edges to clamp against; a globe doesn't,
//     so longitude wraps and only latitude clamps (game/globeMotion.js).
//   · Region presets became ROTATIONS. Instead of a bounding box converted to
//     scale/pan, each region resolves to the direction its countries sit in
//     plus the zoom that frames their angular spread.
//   · Zoom scalars (pinchScale/wheelZoom) are reused untouched from
//     game/mapZoom.js — that math never cared about the projection.
import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable, PanResponder, Platform, Animated } from "react-native";
import { colors, spacing, radius, type, depth, constrain } from "../theme";
import FadeInUp from "../components/FadeInUp";
import GlobeMap from "../components/GlobeMap";
import { COUNTRY_CENTERS, COUNTRY_RINGS } from "../data/worldGeo";
import { COUNTRIES } from "../data/countries";
import {
  MAP_ZOOM_MIN,
  MAP_ZOOM_MAX,
  MAP_WHEEL_ZOOM_SPEED,
  MAP_DRAG_THRESHOLD,
  GLOBE_VIEW_SIZE,
  GLOBE_BASE_RADIUS,
  GLOBE_SPIN_ANIMATION_MS,
} from "../constants";
import { pinchScale, touchDistance, wheelZoom } from "../game/mapZoom";
import { MAP_REGIONS } from "../game/mapRegions";
import {
  DEFAULT_SPIN,
  spinFromDrag,
  lerpSpin,
  groupSpin,
  groupZoom,
  zoomForRadius,
  countryAngularRadius,
  clampSpin,
} from "../game/globeMotion";

// Each region's rotation target, resolved once at module load from its own
// countries' center vectors — same precompute-from-static-data pattern the
// flat map used for REGION_BOUNDS.
const REGION_TARGETS = Object.fromEntries(
  MAP_REGIONS.map((region) => {
    const codes = COUNTRIES.filter((c) => c.region === region).map((c) => c.code);
    const spin = groupSpin(codes, COUNTRY_CENTERS);
    return [
      region,
      spin
        ? { spin, zoom: groupZoom(codes, COUNTRY_CENTERS, spin, { min: MAP_ZOOM_MIN, max: MAP_ZOOM_MAX }) }
        : null,
    ];
  })
);

const sameSpin = (a, b) => Math.abs(a.lng - b.lng) < 0.01 && Math.abs(a.lat - b.lat) < 0.01;

export default function WorldMapScreen({ onExit, onOpenCountry, focusCountry = null }) {
  const [zoom, setZoom] = useState(1);
  const [spin, setSpin] = useState(DEFAULT_SPIN);
  const [activeRegion, setActiveRegion] = useState(null);
  const gesture = useRef({ mode: null, startDistance: 0, startZoom: 1, startSpin: DEFAULT_SPIN });
  const mapNodeRef = useRef(null);
  const zoomRef = useRef(zoom);
  const spinRef = useRef(spin);
  const boxSizeRef = useRef({ width: 0, height: 0 });
  const animationRef = useRef(null);
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);
  useEffect(() => {
    spinRef.current = spin;
  }, [spin]);
  useEffect(() => () => animationRef.current?.stop(), []);

  // The globe's radius in SCREEN pixels — what a drag has to be measured
  // against for the surface to track the finger. The SVG is a fixed square
  // viewBox fitted into the box with preserveAspectRatio, so the conversion is
  // the fit ratio times the radius the globe is drawn at inside that viewBox.
  const screenRadius = () => {
    const { width, height } = boxSizeRef.current;
    const fit = Math.min(width || GLOBE_VIEW_SIZE, height || GLOBE_VIEW_SIZE) / GLOBE_VIEW_SIZE;
    return GLOBE_BASE_RADIUS * zoomRef.current * fit;
  };

  // Tweens zoom and orientation to a target, used by the region pills and
  // Reset so a preset reads as the globe turning rather than teleporting.
  // lerpSpin takes the short way around the antimeridian; a naive lerp would
  // spin the long way home from the Pacific.
  const animateTo = (targetZoom, targetSpin) => {
    animationRef.current?.stop();
    const startZoom = zoomRef.current;
    const startSpin = spinRef.current;
    const progress = new Animated.Value(0);
    const id = progress.addListener(({ value }) => {
      const nextZoom = startZoom + (targetZoom - startZoom) * value;
      const nextSpin = lerpSpin(startSpin, targetSpin, value);
      zoomRef.current = nextZoom;
      spinRef.current = nextSpin;
      setZoom(nextZoom);
      setSpin(nextSpin);
    });
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: GLOBE_SPIN_ANIMATION_MS,
      useNativeDriver: false,
    });
    animationRef.current = { stop: () => progress.stopAnimation() };
    anim.start(({ finished }) => {
      progress.removeListener(id);
      // Snap to the exact target rather than trusting the last interpolated
      // frame — isReset compares against DEFAULT_SPIN, and float drift could
      // otherwise leave the World pill permanently just short of active.
      if (finished) {
        zoomRef.current = targetZoom;
        spinRef.current = targetSpin;
        setZoom(targetZoom);
        setSpin(targetSpin);
      }
    });
  };

  // Opened from a country page's "View on map" link (M2.3.7 step 4): spin
  // straight to that country instead of leaving the globe at DEFAULT_SPIN.
  // Reuses groupSpin for direction (a "group" of just this one country's
  // center), but NOT groupZoom for framing — groupZoom compares countries'
  // centers against each other, so a lone country reads as a zero-width
  // point and always zooms to max regardless of whether it's Russia or the
  // Vatican. countryAngularRadius measures the country's own outline extent
  // instead, same as GlobeMap.js's small-country hit-target sizing. Runs
  // once on mount only: focusCountry is set by the caller when this screen
  // opens and WorldMapScreen is freshly mounted each time (screen state, not
  // a persistent stack), so there's no later change to react to.
  useEffect(() => {
    if (!focusCountry) return;
    const targetSpin = groupSpin([focusCountry], COUNTRY_CENTERS);
    if (!targetSpin) return;
    const radius = countryAngularRadius(COUNTRY_RINGS[focusCountry], COUNTRY_CENTERS[focusCountry]);
    const targetZoom = zoomForRadius(radius, { min: MAP_ZOOM_MIN, max: MAP_ZOOM_MAX });
    animateTo(targetZoom, targetSpin);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Manual zoom. Refs are written synchronously so back-to-back wheel events
  // in one tick compound correctly instead of all reading last render's value.
  // Also drops the active region pill: the view has moved off whatever framing
  // that preset established, so the pill would be claiming a match it no
  // longer has. Called unconditionally (React bails when already null) because
  // the wheel/pinch handlers are wired once via useRef and close over a stale
  // copy of activeRegion.
  const applyZoom = (nextZoom) => {
    zoomRef.current = nextZoom;
    setZoom(nextZoom);
    setActiveRegion(null);
  };

  const applySpin = (nextSpin) => {
    spinRef.current = nextSpin;
    setSpin(nextSpin);
    setActiveRegion(null);
  };

  const isReset = zoom === 1 && sameSpin(spin, DEFAULT_SPIN);
  const resetView = () => {
    animateTo(1, DEFAULT_SPIN);
    setActiveRegion(null);
  };

  // Region pills: turn the globe to face that region and frame its spread.
  // Tapping the already-active region returns to the world view, same as the
  // "World" pill.
  const selectRegion = (region) => {
    if (region === activeRegion) {
      resetView();
      return;
    }
    const target = REGION_TARGETS[region];
    if (!target) return;
    setActiveRegion(region);
    animateTo(target.zoom, target.spin);
  };

  const handleMapLayout = (e) => {
    const { width, height } = e.nativeEvent.layout;
    boxSizeRef.current = { width, height };
  };

  // Two-finger pinch zooms; a single touch only starts spinning once it moves
  // past the drag threshold, so a stationary tap still falls through to
  // GlobeMap's tap-to-select <Path>s untouched.
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt) => evt.nativeEvent.touches.length === 2,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        const touches = evt.nativeEvent.touches;
        if (touches.length === 2) return true;
        if (touches.length === 1) {
          return (
            Math.abs(gestureState.dx) > MAP_DRAG_THRESHOLD ||
            Math.abs(gestureState.dy) > MAP_DRAG_THRESHOLD
          );
        }
        return false;
      },
      onPanResponderGrant: (evt) => {
        const touches = evt.nativeEvent.touches;
        gesture.current = {
          mode: touches.length === 2 ? "pinch" : "spin",
          startDistance: touches.length === 2 ? touchDistance(touches[0], touches[1]) : 0,
          startZoom: zoomRef.current,
          startSpin: spinRef.current,
        };
      },
      onPanResponderMove: (evt, gestureState) => {
        const touches = evt.nativeEvent.touches;
        const g = gesture.current;
        if (touches.length === 2 && g.mode === "pinch") {
          applyZoom(
            pinchScale(
              g.startDistance,
              touchDistance(touches[0], touches[1]),
              g.startZoom,
              MAP_ZOOM_MIN,
              MAP_ZOOM_MAX
            )
          );
        } else if (g.mode === "spin") {
          applySpin(spinFromDrag(g.startSpin, gestureState.dx, gestureState.dy, screenRadius()));
        }
      },
    })
  ).current;

  // Web has no pinch/drag gesture in RN's responder system, so zoom follows the
  // wheel/trackpad and spin follows a mouse drag — both bound straight to the
  // DOM node react-native-web renders under this View.
  useEffect(() => {
    if (Platform.OS !== "web" || !mapNodeRef.current) return;
    const node = mapNodeRef.current;

    const handleWheel = (e) => {
      e.preventDefault();
      applyZoom(wheelZoom(zoomRef.current, e.deltaY, MAP_WHEEL_ZOOM_SPEED, MAP_ZOOM_MIN, MAP_ZOOM_MAX));
    };
    node.addEventListener("wheel", handleWheel, { passive: false });

    const drag = { active: false, startX: 0, startY: 0, startSpin: DEFAULT_SPIN, dragged: false };
    // Bound to window, not the map node: a drag can end with the cursor
    // outside the map box, and the click a mouseup fires lands wherever the
    // cursor is — a listener on the map node alone would never see that click,
    // leaving it attached to wrongly swallow the next real click inside the box.
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
      if (drag.dragged) applySpin(spinFromDrag(drag.startSpin, dx, dy, screenRadius()));
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
      drag.startSpin = spinRef.current;
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

      <FadeInUp>
        <View style={styles.header}>
          <Text style={styles.title}>World Map</Text>
          <Text style={styles.subtitle}>
            Tap a country to explore it · drag to spin · pinch/scroll to zoom
          </Text>
        </View>
      </FadeInUp>

      <View style={styles.regionRow}>
        <Pressable
          onPress={resetView}
          hitSlop={8}
          style={[styles.regionChip, activeRegion === null && isReset && styles.regionChipActive]}
        >
          <Text
            style={[
              styles.regionChipText,
              activeRegion === null && isReset && styles.regionChipTextActive,
            ]}
          >
            World
          </Text>
        </Pressable>
        {MAP_REGIONS.map((region) => {
          const active = region === activeRegion;
          return (
            <Pressable
              key={region}
              onPress={() => selectRegion(region)}
              hitSlop={8}
              style={[styles.regionChip, active && styles.regionChipActive]}
            >
              <Text style={[styles.regionChipText, active && styles.regionChipTextActive]}>
                {region}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <FadeInUp index={1} rise={0} style={styles.mapOuter}>
        <View
          style={styles.mapWrap}
          ref={mapNodeRef}
          onLayout={handleMapLayout}
          {...(Platform.OS === "web" ? {} : panResponder.panHandlers)}
        >
          {/* No wrapping transform: the globe applies zoom to its own radius,
              which is what keeps borders a constant thickness on screen. */}
          <GlobeMap spin={spin} zoom={zoom} onSelect={onOpenCountry} />

          {activeRegion !== null && (
            <View style={styles.regionLabel} pointerEvents="none">
              <Text style={styles.regionLabelText}>{activeRegion}</Text>
            </View>
          )}

          {!isReset && (
            <Pressable onPress={resetView} hitSlop={8} style={styles.resetPill}>
              <Text style={styles.resetPillText}>Reset view</Text>
            </Pressable>
          )}
        </View>
      </FadeInUp>
    </View>
  );
}

// Kept exported for tests and any future caller that needs the same framing
// math the pills use.
export { REGION_TARGETS, clampSpin };

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  // Chrome tracks the reading column; the map below gets the wider media cap.
  back: {
    ...constrain.content,
    paddingHorizontal: spacing(2.5),
    paddingTop: spacing(2),
    paddingBottom: spacing(1),
  },
  backText: { ...type.pill, fontSize: 14, color: colors.teal },

  header: { ...constrain.content, paddingHorizontal: spacing(2.5), marginBottom: spacing(2) },
  title: { ...type.hero, fontSize: 34 },
  subtitle: { ...type.section, fontSize: 11, marginTop: spacing(0.75) },

  regionRow: {
    ...constrain.content,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing(1),
    paddingHorizontal: spacing(2.5),
    marginBottom: spacing(2),
  },
  regionChip: {
    paddingVertical: spacing(1),
    paddingHorizontal: spacing(1.75),
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    ...depth(3),
  },
  regionChipActive: { backgroundColor: colors.teal, ...depth(3, colors.navyDeep) },
  regionChipText: { ...type.pill, color: colors.muted },
  regionChipTextActive: { color: colors.navyDeep },

  // The globe sits on the same deep-navy stage every map in the app uses, so
  // the world reads as the lit subject rather than as chrome.
  mapOuter: { ...constrain.media, flex: 1 },
  mapWrap: {
    flex: 1,
    marginHorizontal: spacing(2.5),
    marginBottom: spacing(3),
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: colors.navy,
    ...depth(5),
  },

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

  regionLabel: {
    position: "absolute",
    top: spacing(2),
    left: spacing(2),
    paddingHorizontal: spacing(1.75),
    paddingVertical: spacing(1),
    borderRadius: radius.pill,
    backgroundColor: colors.teal,
    ...depth(3, colors.navyDeep),
  },
  regionLabelText: { ...type.pill, fontSize: 12, color: colors.navyDeep },
});
