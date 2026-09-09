// The kit's composite grounds, drawn.
//
// `theme.js`'s `materials` holds the stops; this turns them into pixels. Every
// material is the same three-layer recipe, in this order and never another:
//
//   1. a flat BASE colour        — so a platform that renders nothing else
//                                  still gets the right brand colour
//   2. a RAMP                    — one linear gradient, the body of the wash
//   3. GRAIN or WEAVE            — repeating stripe patterns, the texture
//   4. GLOW                      — radial light, from ONE corner
//
// Glow last, on top of the grain, because that is what light does: it falls
// across the surface rather than under it. Putting the wash over the grain is
// the difference between a lit wooden desk and a photograph of wood with a
// yellow circle stamped on it.
//
// WHY SVG AND NOT expo-linear-gradient. Three of the four materials need
// radial light and all four need it elliptical and off-centre, which a linear
// gradient package cannot express at all; two need repeating patterns, which
// nothing in the RN ecosystem does outside SVG. react-native-svg is already a
// dependency (it draws every country outline and the globe), supports
// `Pattern`, `RadialGradient` and `LinearGradient` on web, iOS and Android, and
// costs no new package.
//
// USAGE
//   <MaterialSurface name="paper" style={styles.page}>…</MaterialSurface>
//   <MaterialSurface name="dusk" radius={radius.sheet}>…</MaterialSurface>
//   <Material name="walnut" />                    // a bare fill layer
//
// The kit's rules this component cannot enforce, and you must:
//   · at most TWO materials visible in one composition;
//   · texture never behind body copy — a card on a material stays flat
//     `surfaceRaised`;
//   · type on a material never carries alpha (see materialInk()).
import React, { useMemo, useRef } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Defs, LinearGradient, Pattern, RadialGradient, Rect, Stop } from "react-native-svg";
import { materials, materialBase, gradientVector } from "../theme";

// SVG ids are document-global on web, so two materials on one screen would
// otherwise both resolve `#ramp` to whichever mounted last — a real bug that
// shows up only when a second panel appears.
let seq = 0;
function useIdPrefix() {
  const ref = useRef(null);
  if (ref.current === null) {
    seq += 1;
    ref.current = `ww-m${seq}`;
  }
  return ref.current;
}

// One stripe set → a Pattern plus the Rect that pours it over the surface.
// `axis` is the direction the LINES RUN, so a "vertical" grain repeats along x.
function grainPattern(id, layer) {
  const { axis, period, thickness, color, opacity } = layer;
  const vertical = axis === "vertical";
  return {
    def: (
      <Pattern
        key={`${id}-def`}
        id={id}
        patternUnits="userSpaceOnUse"
        width={period}
        height={period}
        x={0}
        y={0}
      >
        <Rect
          x={0}
          y={0}
          width={vertical ? thickness : period}
          height={vertical ? period : thickness}
          fill={color}
          fillOpacity={opacity}
        />
      </Pattern>
    ),
    fill: <Rect key={`${id}-fill`} x={0} y={0} width="100%" height="100%" fill={`url(#${id})`} />,
  };
}

export function Material({ name = "paper", style, ...rest }) {
  const prefix = useIdPrefix();
  const spec = materials[name];

  const layers = useMemo(() => {
    if (!spec) return null;
    const defs = [];
    const fills = [];

    if (spec.ramp) {
      const id = `${prefix}-ramp`;
      const v = gradientVector(spec.ramp.angle);
      defs.push(
        <LinearGradient key={id} id={id} x1={v.x1} y1={v.y1} x2={v.x2} y2={v.y2}>
          {spec.ramp.stops.map((s) => (
            <Stop key={s.offset} offset={s.offset} stopColor={s.color} />
          ))}
        </LinearGradient>
      );
      fills.push(<Rect key={id} x={0} y={0} width="100%" height="100%" fill={`url(#${id})`} />);
    }

    // Weave and grain are the same mechanism under two names — the kit calls
    // paper's a weave (two crossed axes) and wood's a grain (five parallel
    // periods). Rendered identically.
    const stripes = [...(spec.weave ?? []), ...(spec.grain ?? [])];
    stripes.forEach((layer, i) => {
      const { def, fill } = grainPattern(`${prefix}-g${i}`, layer);
      defs.push(def);
      fills.push(fill);
    });

    (spec.glow ?? []).forEach((g, i) => {
      const id = `${prefix}-l${i}`;
      defs.push(
        <RadialGradient key={id} id={id} cx={g.cx} cy={g.cy} rx={g.rx} ry={g.ry}>
          <Stop offset={0} stopColor={g.color} stopOpacity={g.opacity} />
          {/* The kit's `transparent NN%` — the light is gone by `fade`, and the
              last stop extends outward, so there is no second edge. */}
          <Stop offset={g.fade} stopColor={g.color} stopOpacity={0} />
        </RadialGradient>
      );
      fills.push(<Rect key={id} x={0} y={0} width="100%" height="100%" fill={`url(#${id})`} />);
    });

    return { defs, fills };
  }, [prefix, spec]);

  if (!layers) return null;

  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { backgroundColor: materialBase(name) }, style]}
      {...rest}
    >
      {/* No viewBox: user units are CSS pixels, which is what makes a 9px
          grain period actually 9px rather than 9 units of a scaled box. A
          grain that scales with its container is a stretched photograph. */}
      <Svg width="100%" height="100%">
        <Defs>{layers.defs}</Defs>
        {layers.fills}
      </Svg>
    </View>
  );
}

// The common case: a material as the ground, content on top of it.
//
// `radius` clips the material to a rounded panel. It has to be set on this
// wrapper rather than on the Material inside it — an absolutely-filled child
// ignores its parent's border radius on Android unless the parent clips.
export function MaterialSurface({
  name = "paper",
  radius = 0,
  // A second material laid over the first, for the one composition the kit
  // sanctions: a lit panel over a grain (pine grain over duskDeep).
  over = null,
  style,
  children,
  ...rest
}) {
  return (
    <View
      style={[
        { backgroundColor: materialBase(name), borderRadius: radius, overflow: "hidden" },
        style,
      ]}
      {...rest}
    >
      <Material name={name} />
      {over && <Material name={over} />}
      {children}
    </View>
  );
}

export default Material;
