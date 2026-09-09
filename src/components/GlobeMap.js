/* global setTimeout, clearTimeout */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";
import Svg, {
  Circle,
  Path,
  Rect,
  Text as SvgText,
  Defs,
  RadialGradient,
  Stop,
} from "react-native-svg";
import { COUNTRY_RINGS, COUNTRY_CENTERS, GLOBE_COUNTRY_CODES } from "../data/worldGeo";
import { countryName } from "../data/countries";
import { colors, map, fonts } from "../theme";
import {
  orientation,
  rotate,
  toScreen,
  projectCountry,
  isVisible,
  graticuleLines,
  projectGraticuleLine,
  pointsToPolylinePath,
} from "../game/globeProjection";
import { terrainClass } from "../data/countryTerrain";
import { angleBetween } from "../game/globeMotion";
import { locatorFillState, nonOverlappingRadius, needsMarker } from "../game/locatorRound";
import { DEFAULT_BASEMAP } from "../game/settings";
import { tooltipBox, placeTooltip } from "../game/mapLabels";
import {
  GLOBE_VIEW_SIZE,
  GLOBE_BASE_RADIUS,
  GLOBE_BORDER_WIDTH,
  GLOBE_SMALL_COUNTRY_MAX_DEGREES,
  GLOBE_SMALL_HIT_RADIUS,
  GLOBE_LOCATOR_MARKER_RADIUS,
  GLOBE_LOCATOR_HIT_RADIUS,
  GLOBE_LOCATOR_MARKER_WIDTH,
  GLOBE_GRATICULE_STEP_DEG,
  GLOBE_GRATICULE_SAMPLE_DEG,
  GLOBE_GRATICULE_WIDTH,
  GLOBE_ATMOSPHERE_WIDTH,
  GLOBE_ATMOSPHERE_PEAK_OPACITY,
  GLOBE_ATMOSPHERE_RIM_WIDTH,
  GLOBE_ATMOSPHERE_RIM_OPACITY,
  MAP_TAP_LABEL_DELAY_MS,
  MAP_TAP_LABEL_FONT_SIZE,
  GLOBE_TOOLTIP_FONT_SIZE,
  GLOBE_TOOLTIP_PAD_X,
  GLOBE_TOOLTIP_PAD_Y,
  GLOBE_TOOLTIP_GAP,
  GLOBE_SHADE_INNER_FRAC,
  GLOBE_SHADE_OPACITY,
} from "../constants";

// The globe (M2.3.7) — the Explore surface's replacement for the flat
// ExploreMap. Every country facing the viewer is a real, tappable SVG <Path>,
// exactly as before; what changed is that the path data is recomputed for the
// current orientation instead of being a fixed string.
//
// Two properties fall out of drawing the sphere into a FIXED viewBox and
// growing its radius with zoom, rather than scaling the canvas:
//   · Borders and labels keep a constant on-screen thickness at every zoom.
//     The flat map had the opposite problem — a scaled canvas fattens its own
//     strokes as it zooms in.
//   · The back of the globe is genuinely absent, not hidden. projectRing()
//     returns null for a ring that faces away, so those countries emit no
//     <Path> at all and can't be tapped through the sphere.
const VIEWBOX = `0 0 ${GLOBE_VIEW_SIZE} ${GLOBE_VIEW_SIZE}`;
const CENTER = GLOBE_VIEW_SIZE / 2;

// Same platform tap-handling split as ExploreMap/WorldMap: react-native-svg's
// onPress rides RN's responder system, which a surrounding View steals on web,
// so web binds a real DOM onClick instead.
function pickHandler(code, onTap) {
  return Platform.OS === "web" ? { onClick: () => onTap(code) } : { onPress: () => onTap(code) };
}

const HOVER_HANDLERS_SUPPORTED = Platform.OS === "web";
const HOVER_STYLE = { cursor: "pointer" };

// World-space; independent of orientation, so this is computed once rather
// than every frame like the country rings' projection is.
const GRATICULE = graticuleLines(GLOBE_GRATICULE_STEP_DEG, GLOBE_GRATICULE_SAMPLE_DEG);

// Which countries are too small to tap reliably, measured once in ANGULAR
// terms — the widest arc from a country's center to its own outline. Degrees,
// not pixels, because a country's pixel size now changes with both zoom and
// where it sits on the disc (foreshortening squashes everything near the
// limb), while its angular size never changes.
// Kept as a code -> angular-size map rather than a plain list, because locator
// mode needs the size itself: whether a country still needs a marker ring
// depends on its apparent size, which is its angular size times the zoom.
const SMALL_COUNTRY_DEGREES = {};
for (const code of GLOBE_COUNTRY_CODES) {
  const center = COUNTRY_CENTERS[code];
  if (!center) continue;
  let widest = 0;
  let tooBig = false;
  for (const ring of COUNTRY_RINGS[code]) {
    for (let i = 0; i < ring.length; i += 3) {
      widest = Math.max(widest, angleBetween(center, [ring[i], ring[i + 1], ring[i + 2]]));
      if (widest > GLOBE_SMALL_COUNTRY_MAX_DEGREES) {
        tooBig = true;
        break;
      }
    }
    if (tooBig) break;
  }
  if (!tooBig) SMALL_COUNTRY_DEGREES[code] = widest;
}
const SMALL_COUNTRIES = Object.keys(SMALL_COUNTRY_DEGREES);

// Each country's terrain colour, resolved once at module load from the class
// data/countryTerrain.js derived from its own Factbook climate and landform
// prose. Static data in, static map out — the per-frame render never recomputes
// it, and a country's class never changes as the globe turns.
const TERRAIN_FILLS = {};
for (const code of GLOBE_COUNTRY_CODES) {
  TERRAIN_FILLS[code] = map.terrain[terrainClass(code)] ?? map.land;
}

// The two basemaps. "simple" is the kit's own map layer — one flat land colour
// over the ocean — and is what every globe looked like before terrain existed;
// it reads borders better, which is why the Country Locator defaults to it.
const landFill = (code, basemap) =>
  basemap === "simple" ? map.land : (TERRAIN_FILLS[code] ?? map.land);

// Locator mode's fill per state. The state itself is decided by the pure
// locatorFillState(); this is only the name -> token mapping, kept here so that
// module stays theme-free and testable.
//
// An unpicked wrong candidate stays `candidate` rather than turning red: only
// the choice actually made deserves to be marked wrong.
const LOCATOR_FILLS = {
  inert: map.land,
  candidate: map.landActive,
  correct: colors.success,
  wrong: colors.danger,
};

// One surface, two jobs. Passing `locator` turns the globe into the Country
// Locator's answer surface: candidates are highlighted and tappable, everything
// else is inert scenery. Without it the globe is the free-roaming Explore map
// it has always been.
//
// Extending rather than forking because everything expensive here — the
// per-frame reprojection, the horizon clipping, the graticule, the atmosphere,
// the enlarged hit targets for small countries — is identical in both. A second
// component would have been a copy of 250 lines to change which fill a path
// gets.
// `highlightCode` marks one country as THE subject — the country page's inset,
// where the globe exists to say "this one, here". It takes map.selected (earth),
// the kit's own "selected place" colour, which reads against every terrain band.
// An absent `onSelect` is what makes a globe read-only scenery.
export default function GlobeMap({
  spin,
  zoom = 1,
  onSelect,
  locator = null,
  highlightCode = null,
  basemap = DEFAULT_BASEMAP,
}) {
  const [hoveredCode, setHoveredCode] = useState(null);
  const [tapped, setTapped] = useState(null);
  const tapTimer = useRef(null);
  useEffect(() => () => clearTimeout(tapTimer.current), []);

  const candidateCodes = useMemo(
    () => new Set((locator?.choices ?? []).map((c) => c.code ?? c)),
    [locator]
  );
  const isLocator = Boolean(locator);
  const locked = isLocator && locator.answered;

  const handleTap = (code) => {
    if (locked) return;
    // In locator mode only a candidate is answerable, and the answer is
    // reported immediately: the quiz screen paints its own correct/wrong
    // feedback, so the Explore surface's name-label delay would just sit
    // between the tap and the result.
    if (isLocator) {
      if (!candidateCodes.has(code)) return;
      onSelect(code);
      return;
    }
    setTapped(code);
    clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => onSelect(code), MAP_TAP_LABEL_DELAY_MS);
  };

  // This frame's projected centers for the candidates, so a tap target can be
  // shrunk to never overlap its neighbour's.
  const fillFor = (code) => {
    if (isLocator) {
      const state = locatorFillState(code, locator);
      // Scenery still gets its terrain colour — the round is played on the
      // same world the Explore map shows, not on a stripped-back diagram. Only
      // the states that mean something (candidate, correct, wrong) override it.
      return state === "inert"
        ? landFill(code, basemap)
        : (LOCATOR_FILLS[state] ?? landFill(code, basemap));
    }
    if (code === highlightCode) return map.selected;
    return code === hoveredCode || code === tapped ? map.landActive : landFill(code, basemap);
  };

  // Only an answerable country should look answerable. In locator mode a
  // non-candidate gets no pointer and no handler at all; with no onSelect at
  // all — the country page's inset, where the globe is context rather than
  // navigation — nothing is tappable, so handleTap can never be reached with an
  // undefined callback behind it.
  const selectable = (code) =>
    Boolean(onSelect) && !locked && (!isLocator || candidateCodes.has(code));

  // Hovering is separate from tapping. A read-only globe still benefits from
  // naming what is under the pointer, and the locator is the one place hover
  // must be withheld from non-candidates — highlighting them would narrow the
  // answer for free.
  const hoverable = (code) => HOVER_HANDLERS_SUPPORTED && (isLocator ? selectable(code) : true);

  // The whole projection for this frame. Memoized on orientation and zoom
  // alone: hovering or tapping changes only fills, so it must not pay for a
  // reprojection of all 8,190 points.
  const { paths, radius, centers, graticuleD, atmosphere } = useMemo(() => {
    const o = orientation(spin.lng, spin.lat);
    const r = GLOBE_BASE_RADIUS * zoom;
    const view = { cx: CENTER, cy: CENTER, radius: r };

    // The halo's outer radius grows with the fixed glow width, not with zoom,
    // so the fractions below always place the glow's zero point exactly on
    // the sphere's true edge and its peak partway into the margin beyond it —
    // consistent at any zoom, not just the one this was tuned at.
    const outerRadius = r + GLOBE_ATMOSPHERE_WIDTH;
    const edgeFrac = r / outerRadius;
    const peakFrac = edgeFrac + (1 - edgeFrac) / 2;

    const grid = [];
    for (const line of GRATICULE) {
      for (const segment of projectGraticuleLine(line, o, view)) {
        const d = pointsToPolylinePath(segment);
        if (d) grid.push(d);
      }
    }

    const drawn = [];
    for (const code of GLOBE_COUNTRY_CODES) {
      const d = projectCountry(COUNTRY_RINGS[code], o, view);
      if (d) drawn.push([code, d]);
    }

    // Projected centers, for the tap label and the small-country hit circles.
    // Only for countries actually facing us — a center behind the horizon
    // would otherwise anchor a label on the wrong side of the world.
    const centerPoints = {};
    for (const code of GLOBE_COUNTRY_CODES) {
      const c = COUNTRY_CENTERS[code];
      if (!c) continue;
      const v = rotate(c, o);
      if (isVisible(v[2])) centerPoints[code] = toScreen(v, view);
    }

    return {
      paths: drawn,
      radius: r,
      centers: centerPoints,
      graticuleD: grid,
      atmosphere: { outerRadius, edgeFrac, peakFrac },
    };
  }, [spin.lng, spin.lat, zoom]);

  const candidateCenters = isLocator
    ? [...candidateCodes].map((c) => centers[c]).filter(Boolean)
    : [];
  const hitRadiusFor = (code) =>
    isLocator
      ? nonOverlappingRadius(centers[code], candidateCenters, GLOBE_LOCATOR_HIT_RADIUS)
      : GLOBE_SMALL_HIT_RADIUS;

  // Hover tooltip: name the country under the pointer before committing to a
  // tap. Explore only — NEVER in locator mode, where hovering the candidates
  // would hand over the answer, which is also why `interactive()` withholds
  // hover handlers from non-candidates there.
  //
  // Pointer-only by nature. HOVER_HANDLERS_SUPPORTED is already false off web,
  // so on touch nothing sets hoveredCode and this is simply never built; the
  // tap label remains the only naming affordance there.
  const tooltip = (() => {
    if (isLocator || !hoveredCode) return null;
    const center = centers[hoveredCode];
    if (!center) return null;
    const name = countryName(hoveredCode);
    if (!name) return null;
    const box = tooltipBox(name, GLOBE_TOOLTIP_FONT_SIZE, GLOBE_TOOLTIP_PAD_X, GLOBE_TOOLTIP_PAD_Y);
    const placed = placeTooltip(center, box, GLOBE_VIEW_SIZE, GLOBE_TOOLTIP_GAP);
    return placed ? { ...placed, name } : null;
  })();

  return (
    <Svg viewBox={VIEWBOX} width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
      <Defs>
        {/* The atmosphere glow: transparent until the sphere's true edge,
            peaking partway into the margin beyond it, then fading back to
            nothing at the halo's own outer boundary — a soft ring rather than
            a wash, and no hard cutoff for the outer circle to reveal. */}
        <RadialGradient id="globeAtmosphere" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={map.related} stopOpacity={0} />
          <Stop
            offset={`${(atmosphere.edgeFrac * 100).toFixed(2)}%`}
            stopColor={map.related}
            stopOpacity={0}
          />
          <Stop
            offset={`${(atmosphere.peakFrac * 100).toFixed(2)}%`}
            stopColor={map.related}
            stopOpacity={GLOBE_ATMOSPHERE_PEAK_OPACITY}
          />
          <Stop offset="100%" stopColor={map.related} stopOpacity={0} />
        </RadialGradient>

        {/* The lit sphere. A flat ocean fill makes the globe read as a disc
            with a picture on it; brightening the middle and letting it fall
            away toward the limb is what gives it volume. */}
        <RadialGradient id="globeOcean" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={map.oceanLit} stopOpacity={1} />
          <Stop offset="55%" stopColor={map.ocean} stopOpacity={1} />
          <Stop offset="100%" stopColor={map.ocean} stopOpacity={1} />
        </RadialGradient>

        {/* Limb darkening, laid over land and water alike. Transparent across
            the middle of the disc so terrain colours stay true where they are
            actually being read, ramping only over the outer third. */}
        <RadialGradient id="globeShade" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={map.shade} stopOpacity={0} />
          <Stop
            offset={`${(GLOBE_SHADE_INNER_FRAC * 100).toFixed(0)}%`}
            stopColor={map.shade}
            stopOpacity={0}
          />
          <Stop offset="100%" stopColor={map.shade} stopOpacity={GLOBE_SHADE_OPACITY} />
        </RadialGradient>
      </Defs>

      {/* Drawn before the sphere itself so the ocean/land occlude the halo's
          inner portion, leaving only the glow that bleeds past the true edge
          visible — a rim light, not a filled aura. */}
      <Circle
        cx={CENTER}
        cy={CENTER}
        r={atmosphere.outerRadius}
        fill="url(#globeAtmosphere)"
        pointerEvents="none"
      />

      {/* The ocean is the sphere itself, so the globe reads as an object with
          an edge rather than as land floating on a panel. Same lit-land-on-deep-
          water relationship the flat map uses, just bounded by a circle. */}
      <Circle cx={CENTER} cy={CENTER} r={radius} fill="url(#globeOcean)" />

      {/* The graticule, drawn before land so it's only ever visible through
          open ocean — exactly like a country's own coastline would occlude
          it, with no extra clipping logic needed. */}
      {graticuleD.map((d, i) => (
        <Path
          key={`grid-${i}`}
          d={d}
          fill="none"
          stroke={map.graticule}
          strokeWidth={GLOBE_GRATICULE_WIDTH}
        />
      ))}

      {paths.map(([code, d]) => (
        <Path
          key={code}
          d={d}
          fill={fillFor(code)}
          // Borders in the ocean's own color, so every country reads as its
          // own island and shared land borders are as legible as coastlines.
          stroke={map.border}
          strokeWidth={GLOBE_BORDER_WIDTH}
          strokeLinejoin="round"
          style={HOVER_HANDLERS_SUPPORTED && selectable(code) ? HOVER_STYLE : undefined}
          {...(selectable(code) ? pickHandler(code, handleTap) : null)}
          {...(hoverable(code)
            ? { onMouseEnter: () => setHoveredCode(code), onMouseLeave: () => setHoveredCode(null) }
            : null)}
        />
      ))}

      {/* The sphere's own shading, above land so it darkens continents and
          ocean together — the single thing that turns a flat disc into a ball.
          Above the countries but below every marker and label, which have to
          stay legible right out to the limb. */}
      <Circle cx={CENTER} cy={CENTER} r={radius} fill="url(#globeShade)" pointerEvents="none" />

      {/* Locator mode: a drawn ring around every candidate too small to see.
          Without it the round can ask for Djibouti — six pixels of coastline —
          and then reveal the answer by saying it is "in green", pointing at
          something invisible. The ring is the affordance and carries the same
          state colour as the country would; the hit circle below it is larger
          again, so the touch target exceeds its visual. */}
      {isLocator &&
        SMALL_COUNTRIES.map((code) =>
          centers[code] &&
          candidateCodes.has(code) &&
          needsMarker(SMALL_COUNTRY_DEGREES[code], zoom) ? (
            <Circle
              key={`marker-${code}`}
              cx={centers[code][0]}
              cy={centers[code][1]}
              r={Math.min(GLOBE_LOCATOR_MARKER_RADIUS, hitRadiusFor(code))}
              fill="none"
              stroke={LOCATOR_FILLS[locatorFillState(code, locator)] ?? map.landActive}
              strokeWidth={GLOBE_LOCATOR_MARKER_WIDTH}
              pointerEvents="none"
            />
          ) : null
        )}

      {/* Enlarged invisible tap targets for the countries too small to hit,
          placed on this frame's projected center and only while they face us.
          Locator mode uses a bigger radius: answering is mandatory there, so a
          missed tap is a wrong answer rather than a shrug. */}
      {SMALL_COUNTRIES.map((code) =>
        centers[code] && selectable(code) ? (
          <Circle
            key={`hit-${code}`}
            cx={centers[code][0]}
            cy={centers[code][1]}
            r={hitRadiusFor(code)}
            fill="transparent"
            {...pickHandler(code, handleTap)}
            {...(HOVER_HANDLERS_SUPPORTED
              ? {
                  onMouseEnter: () => setHoveredCode(code),
                  onMouseLeave: () => setHoveredCode(null),
                }
              : null)}
          />
        ) : null
      )}

      {/* A crisp rim highlight traced right at the sphere's true edge, on top
          of land and water alike — the thin bright line a lit atmosphere
          leaves right at the limb, distinct from the softer glow bleeding
          past it. */}
      <Circle
        cx={CENTER}
        cy={CENTER}
        r={radius}
        fill="none"
        stroke={map.related}
        strokeOpacity={GLOBE_ATMOSPHERE_RIM_OPACITY}
        strokeWidth={GLOBE_ATMOSPHERE_RIM_WIDTH}
        pointerEvents="none"
      />

      {/* Tap confirmation, drawn last so it sits above every shape. Skipped if
          the country has spun out of view mid-delay, which would otherwise
          strand its name over open ocean. */}
      {!isLocator && tapped && centers[tapped] && (
        <SvgText
          x={centers[tapped][0]}
          y={centers[tapped][1]}
          textAnchor="middle"
          fontSize={MAP_TAP_LABEL_FONT_SIZE}
          fontFamily={fonts.monoMedium}
          fill={map.onMap}
          stroke={map.ocean}
          strokeWidth={0.9}
          paintOrder="stroke"
        >
          {countryName(tapped)}
        </SvgText>
      )}

      {/* Hover tooltip, drawn above everything including the tap label — it
          follows the pointer, so anything it slipped under would flicker.
          pointerEvents none throughout: a chip that intercepted the pointer
          would un-hover the country the moment it appeared, then re-hover it,
          forever. */}
      {tooltip && (
        <>
          <Rect
            x={tooltip.x}
            y={tooltip.y}
            width={tooltip.width}
            height={tooltip.height}
            rx={tooltip.height / 2}
            fill={map.ocean}
            fillOpacity={0.92}
            stroke={map.border}
            strokeWidth={0.5}
            pointerEvents="none"
          />
          <SvgText
            x={tooltip.textX}
            y={tooltip.textY}
            textAnchor="middle"
            fontSize={GLOBE_TOOLTIP_FONT_SIZE}
            fontFamily={fonts.monoMedium}
            fill={map.onMap}
            pointerEvents="none"
          >
            {tooltip.name}
          </SvgText>
        </>
      )}
    </Svg>
  );
}
