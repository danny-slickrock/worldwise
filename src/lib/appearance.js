// IO for game/colorScheme.js: read the OS appearance, make it the active
// scheme, and tell the browser about it.
//
// RN's useColorScheme() is the OS read on both platforms — Appearance on
// native, and react-native-web backs it with a prefers-color-scheme media
// query, listening for changes. (iOS only reports "dark" because app.json's
// userInterfaceStyle is "automatic"; under "light" it is pinned.)
import { useEffect } from "react";
import { Platform, useColorScheme } from "react-native";
import { resolveColorScheme } from "../game/colorScheme";
import { setActiveScheme, colors } from "../theme";

// The OS appearance: "light" | "dark" | null. Call once, at the root.
export function useOsColorScheme() {
  return useColorScheme() ?? null;
}

// Resolve the preference against the OS and make it the active scheme.
//
// setActiveScheme runs DURING render, deliberately: the tokens are live views,
// and every child that renders after this line must already read the new
// scheme. Doing it in an effect would paint one frame of the old palette. It
// is idempotent, so a repeated or double-invoked render is harmless.
//
// `enabled: false` makes it a pure read (no apply), for the font-loading
// splash in App.js: once the shell mounts, the shell owns the scheme, and an
// outer owner applying "system" after it would undo a manual override.
//
// `os` is passed in rather than read here: read it ONCE, at the root, with
// useOsColorScheme(). Two useColorScheme() subscribers re-subscribe on every
// render, and when the outer one's update re-rendered the inner one mid-
// dispatch, the inner listener was dropped and a live OS flip never arrived.
export function useAppliedColorScheme(pref, os, enabled = true) {
  const resolved = resolveColorScheme(pref, os);
  const scheme = enabled ? setActiveScheme(resolved) : resolved;

  useEffect(() => {
    if (!enabled) return;
    const doc = globalThis.document;
    if (Platform.OS !== "web" || !doc) return;
    // The browser's own chrome (scrollbars, form controls, overscroll) and the
    // page behind the app follow too, so a rubber-band scroll never flashes
    // parchment under a dark app.
    const root = doc.documentElement;
    root.style.colorScheme = scheme;
    root.style.backgroundColor = colors.surface;
    if (doc.body) doc.body.style.backgroundColor = colors.surface;
    let meta = doc.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = doc.createElement("meta");
      meta.setAttribute("name", "theme-color");
      doc.head.appendChild(meta);
    }
    meta.setAttribute("content", colors.surface);
  }, [scheme, enabled]);

  return scheme;
}
