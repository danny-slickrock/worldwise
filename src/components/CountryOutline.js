import React, { useEffect, useState } from "react";
import { Platform, View, Text, Image, StyleSheet } from "react-native";
import { SvgUri } from "react-native-svg";
import { outlineUrl } from "../data/countries";
import { colors, radius, spacing } from "../theme";

// Renders a country's map outline as a solid navy silhouette.
//
// Why this is platform-split: react-native-svg's <SvgUri> (its remote-SVG
// loader) is NOT exported by the library's WEB build — only the shape
// primitives are. On web it resolves to `undefined`, so <SvgUri> renders
// nothing, which is why the Shape game showed a blank box. On web we instead
// paint the navy token *through* the outline by using the SVG as a CSS mask —
// browsers render SVG reliably, and alpha-masking recolors mapsicon's black
// silhouette to our brand navy. On native, <SvgUri> works and recolors via fill.
//
// Both loaders hit a remote CDN (mapsicon), so both can fail offline or if a
// path 404s — falls back to a self-contained placeholder rather than a blank
// or broken box.
export default function CountryOutline({ code }) {
  const uri = outlineUrl(code);
  const [failed, setFailed] = useState(false);

  // A code change means a new URL worth retrying, even if the last one failed.
  useEffect(() => {
    setFailed(false);
  }, [uri]);

  if (failed) {
    return <Fallback />;
  }

  if (Platform.OS === "web") {
    return (
      <View style={styles.webWrap}>
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
        {/* A CSS mask has no load-failure signal of its own, so probe the same
            URL with a plain <Image> purely to detect a failed/missing SVG. */}
        <Image
          source={{ uri }}
          style={styles.probe}
          onError={() => setFailed(true)}
        />
      </View>
    );
  }

  return (
    <SvgUri uri={uri} width="100%" height="100%" fill={colors.navy} onError={() => setFailed(true)} />
  );
}

function Fallback() {
  return (
    <View style={styles.fallback}>
      <Text style={styles.fallbackGlyph}>◇</Text>
      <Text style={styles.fallbackText}>Outline unavailable</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  webWrap: { width: "100%", height: "100%" },
  probe: { position: "absolute", width: "100%", height: "100%", opacity: 0 },
  fallback: {
    flex: 1,
    backgroundColor: colors.navy,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  fallbackGlyph: { fontSize: 40, color: "rgba(255,255,255,0.35)" },
  fallbackText: { fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: spacing(1) },
});
