// The globe's photographic basemap: NASA's Blue Marble, reprojected onto the
// sphere every frame.
//
// The countries stay SVG — that is what keeps taps, borders and theme fills
// working — and this sits UNDERNEATH them as a raster layer. The two are
// registered by construction: both are drawn into the same centred square, and
// the sphere occupies the same fraction of it in each (GLOBE_BASE_RADIUS over
// GLOBE_VIEW_SIZE, which is 0.475).
//
// WEB ONLY, and deliberately so rather than by omission. Reprojecting a
// photograph means computing an inverse projection per pixel, which needs a
// writable pixel buffer; React Native has no canvas. On iOS and Android the
// "terrain" basemap therefore falls back to the per-country classified fills,
// which is a real map rather than a broken one. Doing better on native means a
// GL surface, and that is a bigger change than this is worth until the globe
// has been checked on a device at all.
/* global document, setTimeout, clearTimeout */
import React, { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { Asset } from "expo-asset";
import { renderGlobeRaster } from "../game/globeRaster";
import { GLOBE_BASE_RADIUS, GLOBE_VIEW_SIZE } from "../constants";

// While the globe is moving, redraw small and let the browser scale it up; once
// it settles, redraw at full size.
//
// Measured on the pure renderer (2048x1024 source): a 256-long-edge frame is
// ~2ms, a 900-long-edge frame ~23ms, and 1280 is ~46ms. So a draft frame holds
// 60fps through a drag while a settled frame is a single barely-perceptible
// hitch — and FULL_SIZE is a CAP rather than a target, because without one a
// desktop-sized container would put a 46ms frame on every wheel tick.
//
// Nobody can see the detail on a spinning globe anyway, which is why this
// trade is free rather than a compromise.
const DRAFT_SIZE = 256;
const FULL_SIZE = 900;
const SETTLE_MS = 160;

// The longest edge the settled frame is rendered at. The canvas is stretched to
// the layout box, so this is a resolution, not a size.
const FRAME_CAP = FULL_SIZE;

// One decode for the whole app, shared by every globe on screen. Resolves to
// null if the asset can't be read, which is a clean fall back to flat fills.
let texturePromise = null;

// The basemap failing is not fatal — the globe falls back to classified fills —
// but it must not be SILENT. A swallowed failure here looks exactly like "the
// terrain toggle does nothing", which is the bug this line exists to name.
function warn(what, err) {
  // eslint-disable-next-line no-console
  console.warn(`[worldwise:globe] basemap unavailable — ${what}`, err?.message ?? err ?? "");
}

function loadTexture() {
  if (texturePromise) return texturePromise;
  texturePromise = new Promise((resolve) => {
    try {
      // expo-asset rather than Image.resolveAssetSource: what require() of an
      // image returns differs by platform, and react-native-web's Image has no
      // resolveAssetSource at all — which is exactly how the first version of
      // this shipped a terrain toggle that did nothing. Asset.fromModule is the
      // one accessor that works on web and native alike.
      const asset = Asset.fromModule(require("../../assets/globe/earth-relief.jpg"));
      const img = new window.Image();
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          // willReadFrequently is the difference between a getImageData that
          // takes a millisecond and one that stalls on a GPU readback.
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          ctx.drawImage(img, 0, 0);
          const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
          resolve({ data, width: canvas.width, height: canvas.height });
        } catch (err) {
          warn("could not read the texture's pixels", err);
          resolve(null);
        }
      };
      img.onerror = (err) => {
        warn(`could not load ${asset?.uri}`, err);
        resolve(null);
      };
      img.src = asset.uri ?? asset.localUri;
    } catch (err) {
      warn("could not resolve the texture asset", err);
      resolve(null);
    }
  });
  return texturePromise;
}

// `box` is the container's real size in layout points. The raster covers ALL of
// it rather than the fitted square, because the SVG above does too — see
// renderGlobeRaster's note on the seams a square frame leaves once zoomed.
export default function GlobeTexture({ spin, zoom = 1, box, style, onReady }) {
  const web = Platform.OS === "web";
  const canvasRef = useRef(null);
  const buffers = useRef({});
  const settleTimer = useRef(null);
  const [texture, setTexture] = useState(null);

  useEffect(() => {
    if (!web) return undefined;
    let cancelled = false;
    loadTexture().then((tex) => {
      if (cancelled) return;
      setTexture(tex);
      onReady?.(Boolean(tex));
    });
    return () => {
      cancelled = true;
    };
    // onReady is intentionally not a dep: callers pass an inline function, and
    // re-running this would re-resolve the (memoised) texture on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [web]);

  useEffect(() => {
    if (!web || !texture) return undefined;

    const draw = (longEdge) => {
      const canvas = canvasRef.current;
      if (!canvas || !box?.width || !box?.height) return;

      // Render at `longEdge` across the container's longest side, keeping its
      // aspect ratio, then let CSS stretch it back up.
      const k = longEdge / Math.max(box.width, box.height);
      const w = Math.max(1, Math.round(box.width * k));
      const h = Math.max(1, Math.round(box.height * k));

      const key = `${w}x${h}`;
      if (!buffers.current[key]) buffers.current[key] = new Uint8ClampedArray(w * h * 4);
      const bytes = buffers.current[key];

      renderGlobeRaster({
        dest: bytes,
        width: w,
        height: h,
        src: texture.data,
        srcWidth: texture.width,
        srcHeight: texture.height,
        spin,
        // Exactly what preserveAspectRatio="xMidYMid meet" does with a square
        // viewBox: centre the viewBox in the box, scale by the shorter side.
        centerX: w / 2,
        centerY: h / 2,
        radius: (GLOBE_BASE_RADIUS * zoom * Math.min(w, h)) / GLOBE_VIEW_SIZE,
      });

      // Assigning width resets the backing store, which is also how the
      // previous frame gets cleared — the disc's transparent surround would
      // otherwise let an older, larger frame show through around the edge.
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.putImageData(new window.ImageData(bytes, w, h), 0, 0);
    };

    draw(DRAFT_SIZE);
    clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => draw(FRAME_CAP), SETTLE_MS);
    return () => clearTimeout(settleTimer.current);
    // Depending on spin's FIELDS rather than the object: callers rebuild
    // `spin` every render, so an object dep would redraw the globe on every
    // unrelated state change — and each redraw schedules a full-size frame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [web, texture, spin.lng, spin.lat, zoom, box?.width, box?.height]);

  if (!web || !texture) return null;

  return React.createElement("canvas", {
    ref: canvasRef,
    style: {
      position: "absolute",
      ...style,
      // The canvas is drawn at DRAFT_SIZE or FULL_SIZE and stretched to the
      // layout box; the browser's own filtering is what makes a 256px draft
      // frame look like motion blur rather than like pixels.
      width: "100%",
      height: "100%",
      display: "block",
    },
  });
}
