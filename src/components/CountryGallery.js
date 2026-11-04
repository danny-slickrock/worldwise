// The country page's photo gallery: approved landmark images (ADR 0006), as a
// horizontal strip of cards under the hero — mobile-first, swipeable, and the
// same CountryPhoto under each card, so every guarantee the hero has (reserved
// aspect ratio, theme-toned placeholder, transform-URL fallback, credit line)
// holds here without a second implementation.
//
// LAZY: a card's image is only requested once it is within one card of the
// visible window (scrolling right pulls the next ones in). The frames are
// reserved up front, so nothing moves when a photo lands.
//
// NEVER gated on onLoad. CountryPhoto draws the image straight over its
// placeholder; a photo that pops in late is fine, a photo held invisible by a
// callback react-native-web didn't fire is the bug that shipped once.
import React, { useState } from "react";
import { View, Text, ScrollView, StyleSheet, useWindowDimensions } from "react-native";
import CountryPhoto from "./CountryPhoto";
import { spacing, type, themed } from "../theme";

const CARD_ASPECT = 4 / 3;
const GAP = spacing(3);

export default function CountryGallery({ gallery, name }) {
  const { width } = useWindowDimensions();
  // ~78% of a phone column so the next card peeks in (the swipe affordance),
  // capped on a wide screen.
  const cardWidth = Math.min(320, Math.max(220, Math.round(width * 0.72)));
  const [loadedUpTo, setLoadedUpTo] = useState(1); // the first two cards load at once
  if (!Array.isArray(gallery) || !gallery.length) return null;

  const onScroll = (e) => {
    const x = e.nativeEvent.contentOffset.x;
    const viewport = e.nativeEvent.layoutMeasurement.width;
    const lastVisible = Math.floor((x + viewport) / (cardWidth + GAP));
    if (lastVisible + 1 > loadedUpTo) setLoadedUpTo(lastVisible + 1);
  };

  return (
    <View style={styles.wrap} accessibilityLabel={`Photos of ${name}`}>
      <Text style={styles.kicker}>Places to see · {gallery.length}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={64}
        snapToInterval={cardWidth + GAP}
        decelerationRate="fast"
        contentContainerStyle={styles.strip}
      >
        {gallery.map((item, i) => (
          <CountryPhoto
            key={item.url}
            hero={item}
            name={name}
            title={item.title}
            aspect={CARD_ASPECT}
            deferImage={i > loadedUpTo}
            style={[styles.card, { width: cardWidth }]}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    wrap: { marginBottom: spacing(6) },
    kicker: { ...type.eyebrow, marginBottom: spacing(3) },
    strip: { gap: GAP, paddingRight: spacing(5) },
    card: { marginBottom: 0 },
  })
);
