// The one place a max content width is expressed.
//
// Wrap a screen's scroll children in <Container> and they become a centered
// column on desktop while staying full-bleed on a phone — no screen needs to
// know a pixel value, and changing the column width is a one-line edit in
// theme.js rather than a sweep through eight files.
//
// Usage:
//   <ScrollView contentContainerStyle={styles.content}>
//     <Container>...</Container>          // reading column
//     <Container max="media">...</Container>  // maps + hero imagery
//   </ScrollView>
//
// For a single element that shouldn't stretch (a primary button, one answer
// option), skip the wrapper view and spread the style instead:
//   style={[styles.btn, constrain.action]}
// Same source of truth, one less node in the tree.
import React from "react";
import { View } from "react-native";
import { constrain } from "../theme";

export default function Container({ max = "content", style, children, ...rest }) {
  // Unknown key falls back to the reading column rather than rendering an
  // unconstrained full-bleed block, which is the failure that's hard to spot.
  const width = constrain[max] ?? constrain.content;
  return (
    <View style={[width, style]} {...rest}>
      {children}
    </View>
  );
}
