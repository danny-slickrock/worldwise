// World Map explore screen. Since M2.3.7 the surface is a GLOBE: an
// orthographic projection of the sphere (see game/globeProjection.js), spun by
// dragging and zoomed by pinch/wheel. Tapping a country still opens its page
// through the same overlay seam the country index uses.
//
// What carried over from the flat map (M2.3 steps 1-5) and what didn't:
//   · Gesture plumbing is unchanged in behaviour but no longer lives here: the
//     2-touch-only pinch claim, the drag threshold, the momentum coast and the
//     web mousedown/wheel listeners moved wholesale into
//     hooks/useGlobeGestures.js. They were written for this screen and stayed
//     welded to it, which is exactly why the Country Locator's globe shipped as
//     a still image — QuizScreen had no way to reuse any of it.
//   · Pan became SPIN. A flat map has edges to clamp against; a globe doesn't,
//     so longitude wraps and only latitude clamps (game/globeMotion.js).
//   · Region presets became ROTATIONS. Instead of a bounding box converted to
//     scale/pan, each region resolves to the direction its countries sit in
//     plus the zoom that frames their angular spread.
//   · Zoom scalars (pinchScale/wheelZoom) are reused untouched from
//     game/mapZoom.js — that math never cared about the projection.
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { colors, spacing, radius, type, elevation, constrain } from "../theme";
import FadeInUp from "../components/FadeInUp";
import Material from "../components/Material";
import GlobeMap from "../components/GlobeMap";
import BasemapToggle from "../components/BasemapToggle";
import { COUNTRY_CENTERS, COUNTRY_RINGS } from "../data/worldGeo";
import { COUNTRIES } from "../data/countries";
import { MAP_ZOOM_MIN, MAP_ZOOM_MAX } from "../constants";
import { MAP_REGIONS } from "../game/mapRegions";
import {
  DEFAULT_SPIN,
  groupSpin,
  groupZoom,
  zoomForRadius,
  countryAngularRadius,
  clampSpin,
} from "../game/globeMotion";
import useGlobeGestures from "../hooks/useGlobeGestures";

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
        ? {
            spin,
            zoom: groupZoom(codes, COUNTRY_CENTERS, spin, { min: MAP_ZOOM_MIN, max: MAP_ZOOM_MAX }),
          }
        : null,
    ];
  })
);

const sameSpin = (a, b) => Math.abs(a.lng - b.lng) < 0.01 && Math.abs(a.lat - b.lat) < 0.01;

export default function WorldMapScreen({
  onExit,
  onOpenCountry,
  onBrowseIndex,
  onOpenLearningPath,
  focusCountry = null,
  basemap,
  onChangeBasemap,
}) {
  const [activeRegion, setActiveRegion] = useState(null);

  // Every drag, pinch, wheel and flick on this globe. onManualChange drops the
  // active region pill: once the player has moved the view themselves, the pill
  // would be claiming a framing it no longer has.
  const { spin, zoom, animateTo, surfaceProps } = useGlobeGestures({
    onManualChange: () => setActiveRegion(null),
  });

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

  return (
    <View style={[styles.wrap, !onExit && styles.wrapNoBack]}>
      {/* Back only when something is actually underneath. As the Explore tab's
          root this screen is usually the bottom of its stack, and a Back button
          there would be a control that does nothing. */}
      {onExit && (
        <Pressable onPress={onExit} hitSlop={12} style={styles.back}>
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>
      )}

      <FadeInUp>
        <View style={styles.header}>
          <Text style={styles.title}>World Map</Text>
          <Text style={styles.subtitle}>
            Tap a country to explore it · drag to spin · pinch/scroll to zoom
          </Text>
          {/* The browsable index lost its Home tile when Explore became a tab,
              so this is now its entry point — a peer of the globe, one level
              inside the same tab rather than a sibling doorway off Home. */}
          {onBrowseIndex && (
            <Pressable onPress={onBrowseIndex} hitSlop={8} style={styles.browseBtn}>
              <Text style={styles.browseText}>Browse all 196 ›</Text>
            </Pressable>
          )}
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
        <View style={styles.mapWrap} {...surfaceProps}>
          {/* Pine grain behind the globe, same as the Home card: the dark stage
              is a wall in the cartography room rather than a flat pine fill. */}
          <Material name="pineGrain" />
          {/* No wrapping transform: the globe applies zoom to its own radius,
              which is what keeps borders a constant thickness on screen. */}
          <GlobeMap spin={spin} zoom={zoom} onSelect={onOpenCountry} basemap={basemap} />

          <BasemapToggle value={basemap} onChange={onChangeBasemap} style={styles.basemapToggle} />

          {activeRegion !== null && (
            // M2.4 step 5: the same region pill that framed the globe doubles
            // as the learning-path entry point — tapping it opens that
            // region's path rather than just labeling the view. Falls back to
            // a non-interactive label (pointerEvents none, as before) when no
            // handler is passed in, so the map still works standalone.
            <Pressable
              onPress={onOpenLearningPath && (() => onOpenLearningPath(activeRegion.toLowerCase()))}
              disabled={!onOpenLearningPath}
              hitSlop={8}
              style={styles.regionLabel}
              pointerEvents={onOpenLearningPath ? "auto" : "none"}
            >
              <Text style={styles.regionLabelText}>{activeRegion}</Text>
              {onOpenLearningPath && <Text style={styles.regionLabelSub}>Learning path ›</Text>}
            </Pressable>
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
  // Transparent: AppChrome owns the page ground (the kit's paper fibre).
  wrap: { flex: 1, backgroundColor: "transparent" },
  // Chrome tracks the reading column; the map below gets the wider media cap.
  back: {
    ...constrain.content,
    paddingHorizontal: spacing(5),
    paddingTop: spacing(4),
    paddingBottom: spacing(2),
  },
  backText: { ...type.label, fontSize: 14, color: colors.link },

  header: { ...constrain.content, paddingHorizontal: spacing(5), marginBottom: spacing(4) },
  // A quiet link, not a slab: the globe is the hero on this screen and a
  // filled button here would compete with it for the first look.
  // The Back row carries this screen's top inset. Without it — i.e. at the
  // Explore tab's root — the title would sit hard against the chrome, so the
  // inset moves onto the wrapper rather than disappearing with the button.
  wrapNoBack: { paddingTop: spacing(8) },
  browseBtn: { alignSelf: "flex-start", marginTop: spacing(2.5) },
  browseText: { ...type.label, color: colors.link },
  title: { ...type.h1, fontSize: 34 },
  subtitle: { ...type.eyebrow, fontSize: 11, marginTop: spacing(1.5) },

  regionRow: {
    ...constrain.content,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing(2),
    paddingHorizontal: spacing(5),
    marginBottom: spacing(4),
  },
  regionChip: {
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(3.5),
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  regionChipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  regionChipText: { ...type.label, color: colors.textMuted },
  regionChipTextActive: { color: colors.onFill },

  // The globe sits on the same deep-navy stage every map in the app uses, so
  // the world reads as the lit subject rather than as chrome.
  mapOuter: { ...constrain.media, flex: 1 },
  mapWrap: {
    flex: 1,
    marginHorizontal: spacing(5),
    marginBottom: spacing(6),
    borderRadius: radius.sheet,
    overflow: "hidden",
    backgroundColor: colors.brand,
    ...elevation(2),
  },

  resetPill: {
    position: "absolute",
    top: spacing(4),
    right: spacing(4),
    paddingHorizontal: spacing(3.5),
    paddingVertical: spacing(2),
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceRaised,
    ...elevation(1),
  },
  resetPillText: { ...type.label, fontSize: 12, color: colors.link },

  basemapToggle: { position: "absolute", left: spacing(3), top: spacing(3) },
  regionLabel: {
    position: "absolute",
    top: spacing(4),
    left: spacing(4),
    paddingHorizontal: spacing(3.5),
    paddingVertical: spacing(2),
    borderRadius: radius.pill,
    backgroundColor: colors.brand,
    ...elevation(1),
  },
  regionLabelText: { ...type.label, fontSize: 12, color: colors.onFill },
  regionLabelSub: {
    ...type.label,
    fontSize: 10,
    color: colors.onFill,
    opacity: 0.7,
    marginTop: 1,
  },
});
