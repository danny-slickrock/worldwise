// The hero photograph on a country page (see docs/adr/0002-country-photos.md).
//
// Three things this has to get right, in order of how badly they hurt:
//
//   1. NO GAP WHEN THERE IS NO PHOTO. Most countries won't have an approved
//      hero for a while. `hero` being null renders nothing at all — not an
//      empty box, not a broken image — because the country page worked without
//      a photo before this existed and must keep working.
//   2. NO LAYOUT SHIFT. The frame reserves its aspect ratio immediately and
//      holds a theme-toned block until the image decodes, so text below never
//      jumps. (A blurhash would look nicer; the block already solves the actual
//      problem, so it stays out of scope — see the ADR.)
//
//      This deliberately does NOT fade the image in on `onLoad`. That was the
//      first shape of this component and it shipped a photo that had loaded and
//      was permanently invisible: react-native-web's Image never fired onLoad
//      here, so the animated opacity stayed at 0 while the browser happily
//      painted the bitmap underneath it. Caught by screenshotting the real page
//      (DOM said `opacity: 0` over a 200 OK image), which is exactly the class
//      of bug the browser pass exists to find. The image is now simply drawn
//      over the placeholder — a pop-in is a far better failure than a photo
//      that is there and cannot be seen.
//   3. THE CREDIT IS NOT OPTIONAL. Commons images are CC/public-domain, and CC
//      BY / BY-SA require attribution. The caption is composed by
//      mediaPolicy.formatPhotoCredit() so its wording lives in one place, and
//      it links to the Commons file page so the claim is checkable.
//
// Sizing goes through Supabase Storage's transform endpoint, which is a Pro-
// plan feature — so it is an optimisation with a fallback, never a dependency:
// if the variant 404s, onError swaps in the plain object URL, which is itself
// already a 1600px rendition rather than a full-resolution original.
import React, { useEffect, useState } from "react";
import { View, Text, Image, Pressable, Linking, StyleSheet, PixelRatio } from "react-native";
import { colors, spacing, radius, type, elevation } from "../theme";
import { imageVariantUrl, heroImageWidth } from "../game/mediaPolicy";

// A wide, shallow crop — a landscape photograph read as a banner, not a
// portrait. Matches resize=cover in the transform URL so the server and the
// layout can't disagree about aspect ratio.
const ASPECT = 16 / 9;

export default function CountryPhoto({ hero, name }) {
  // Measured rather than assumed: the same page is a phone column and a 680px
  // constrained column, and asking for a 1600px variant on a phone is the
  // whole cost this component exists to avoid.
  const [boxWidth, setBoxWidth] = useState(0);
  // Flips to true once a transform request has failed, after which the plain
  // object URL is used for the rest of the session.
  const [useOriginal, setUseOriginal] = useState(false);
  const [failed, setFailed] = useState(false);

  // A new country is a new photo: forget the previous one's fallback state, so
  // one country's missing object doesn't blank the next one's.
  useEffect(() => {
    setUseOriginal(false);
    setFailed(false);
  }, [hero?.url]);

  if (!hero?.url || failed) return null;

  const width = heroImageWidth(boxWidth, PixelRatio.get());
  const uri = useOriginal ? hero.url : imageVariantUrl(hero.url, { width });

  // First failure means "no transforms on this plan" — retry the original.
  // A second failure means the object itself is gone, so the block is removed
  // entirely rather than left as a permanent grey rectangle.
  function handleError() {
    if (!useOriginal) setUseOriginal(true);
    else setFailed(true);
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.frame} onLayout={(e) => setBoxWidth(e.nativeEvent.layout.width)}>
        {/* The placeholder is the frame's own background and the image is
            drawn straight over it, so there is never a flash of empty page —
            and never a loaded image held invisible by a callback that didn't
            fire. Rendering waits only for the measurement that decides which
            variant to request. */}
        {boxWidth > 0 && (
          <Image
            // Keyed by URI so switching to the fallback URL remounts rather
            // than re-rendering: react-native-web's Image keeps its own load
            // state, and a component that has already errored is not reliably
            // willing to load a replacement source in place.
            key={uri}
            source={{ uri }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            onError={handleError}
            accessible
            accessibilityLabel={`Photograph of ${name}`}
          />
        )}
      </View>
      {hero.credit ? <Credit hero={hero} /> : null}
    </View>
  );
}

// The licence obligation, made checkable. Tapping opens the Commons file page,
// which carries the full licence text and the author's own page — more than a
// caption can hold and exactly what a "where did this come from?" question
// wants.
function Credit({ hero }) {
  const target = hero.sourceUrl || hero.licenseUrl;
  if (!target) return <Text style={styles.credit}>{hero.credit}</Text>;
  return (
    <Pressable onPress={() => Linking.openURL(target)} hitSlop={8}>
      <Text style={[styles.credit, styles.creditLink]}>{hero.credit}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing(5) },
  frame: {
    width: "100%",
    aspectRatio: ASPECT,
    borderRadius: radius.sheet,
    overflow: "hidden",
    // The placeholder tone. `surfaceSunken` is the app's recessed-well colour,
    // so an image still loading reads as part of the page rather than as a
    // missing asset.
    backgroundColor: colors.surfaceSunken,
    ...elevation(2),
  },
  credit: {
    ...type.caption,
    fontSize: 12,
    marginTop: spacing(2),
    paddingHorizontal: spacing(0.5),
  },
  // Teal is the one accent safe at body size (5.8:1 on white), which is why the
  // link colour is `accent` and not `earth`.
  creditLink: { color: colors.accent },
});
