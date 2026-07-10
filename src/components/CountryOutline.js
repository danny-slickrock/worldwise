import React from "react";
import { Platform, View } from "react-native";
import { SvgUri } from "react-native-svg";
import { outlineUrl } from "../data/countries";
import { colors } from "../theme";

// Renders a country's map outline as a solid navy silhouette.
//
// Why this is platform-split: react-native-svg's <SvgUri> (its remote-SVG
// loader) is NOT exported by the library's WEB build — only the shape
// primitives are. On web it resolves to `undefined`, so <SvgUri> renders
// nothing, which is why the Shape game showed a blank box. On web we instead
// paint the navy token *through* the outline by using the SVG as a CSS mask —
// browsers render SVG reliably, and alpha-masking recolors mapsicon's black
// silhouette to our brand navy. On native, <SvgUri> works and recolors via fill.
export default function CountryOutline({ code }) {
  const uri = outlineUrl(code);

  if (Platform.OS === "web") {
    return (
      <View
        style={{
          width: "100%",
          height: "100%",
          backgroundColor: colors.navy,
          // Web-only mask props (ignored by native; RN types don't know them).
          maskImage: `url(${uri})`,
          maskRepeat: "no-repeat",
          maskPosition: "center",
          maskSize: "contain",
          WebkitMaskImage: `url(${uri})`,
          WebkitMaskRepeat: "no-repeat",
          WebkitMaskPosition: "center",
          WebkitMaskSize: "contain",
        }}
      />
    );
  }

  return <SvgUri uri={uri} width="100%" height="100%" fill={colors.navy} />;
}
