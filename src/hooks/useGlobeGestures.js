// Drag-to-spin, pinch/wheel-to-zoom, and flick momentum for a GlobeMap.
//
// This used to live inside WorldMapScreen, which is why the Country Locator's
// globe was a still photograph: GlobeMap is purely presentational — it renders
// whatever `spin`/`zoom` it is handed and owns no gestures at all — and
// QuizScreen handed it two constants. The interaction wasn't broken, it had
// simply never been wired to a second caller. Extracting it here is what makes
// "a globe" mean the same thing on every screen that shows one.
//
// Deliberately a hook and not a component: the gesture layer has to attach to
// the SAME view that lays the globe out (the web path binds real DOM listeners
// to that node, and the drag-to-screen-pixels conversion needs its measured
// size), while the surrounding screen keeps owning what else lives in that box
// — region pills, a reset chip, a locator's answer state. A wrapper component
// would have had to take all of that as children and props anyway.
//
// The math is all pure and already tested: globeMotion.js for spin/wrap/clamp
// and momentum, mapZoom.js for the zoom scalars. Nothing here decides anything;
// it wires input events into those functions and holds the result as state.
import { useEffect, useRef, useState } from "react";
import { PanResponder, Platform, Animated } from "react-native";
import {
  MAP_ZOOM_MIN,
  MAP_ZOOM_MAX,
  MAP_WHEEL_ZOOM_SPEED,
  MAP_DRAG_THRESHOLD,
  GLOBE_VIEW_SIZE,
  GLOBE_BASE_RADIUS,
  GLOBE_SPIN_ANIMATION_MS,
} from "../constants";
import { pinchScale, touchDistance, wheelZoom } from "../game/mapZoom";
import {
  DEFAULT_SPIN,
  spinFromDrag,
  lerpSpin,
  spinVelocityFromDrag,
  decayVelocity,
  isMomentumDone,
  stepMomentum,
} from "../game/globeMotion";

// Give a globe a spin/zoom of its own, plus the props to make it draggable.
//
//   initialSpin / initialZoom  where the globe starts. Read once, on mount —
//                              use snapTo/animateTo to move it afterwards, so a
//                              re-render can't yank the view out from under a
//                              player mid-drag.
//   enabled                    false freezes the globe (still tappable). The
//                              listeners stay bound and simply do nothing, so
//                              toggling it can't leak or double-bind.
//   wheelZoomEnabled           false leaves the wheel to the page. The handler
//                              calls preventDefault to zoom, so a globe embedded
//                              in a scrolling page would otherwise trap the
//                              scroll whenever the pointer crossed it — the
//                              country page's inset is exactly that case.
//   onManualChange             fired whenever the PLAYER moves the globe, not
//                              when animateTo does. Lets a caller drop UI that
//                              claims a framing the view no longer has.
export default function useGlobeGestures({
  initialSpin = DEFAULT_SPIN,
  initialZoom = 1,
  minZoom = MAP_ZOOM_MIN,
  maxZoom = MAP_ZOOM_MAX,
  enabled = true,
  wheelZoomEnabled = true,
  onManualChange = null,
} = {}) {
  const [zoom, setZoom] = useState(initialZoom);
  const [spin, setSpin] = useState(initialSpin);

  const gesture = useRef({
    mode: null,
    startDistance: 0,
    startZoom: initialZoom,
    startSpin: initialSpin,
  });
  const nodeRef = useRef(null);
  const zoomRef = useRef(initialZoom);
  const spinRef = useRef(initialSpin);
  const boxSizeRef = useRef({ width: 0, height: 0 });
  const animationRef = useRef(null);
  const momentumRef = useRef(null);

  // The panResponder and the web listener effect are both created once, on
  // mount, so they close over the FIRST value of everything. Anything that can
  // change between renders is read through a ref instead.
  const enabledRef = useRef(enabled);
  const wheelRef = useRef(wheelZoomEnabled);
  const onManualChangeRef = useRef(onManualChange);
  const boundsRef = useRef({ minZoom, maxZoom });
  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);
  useEffect(() => {
    wheelRef.current = wheelZoomEnabled;
  }, [wheelZoomEnabled]);
  useEffect(() => {
    onManualChangeRef.current = onManualChange;
  }, [onManualChange]);
  useEffect(() => {
    boundsRef.current = { minZoom, maxZoom };
  }, [minZoom, maxZoom]);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);
  useEffect(() => {
    spinRef.current = spin;
  }, [spin]);
  useEffect(
    () => () => {
      animationRef.current?.stop();
      momentumRef.current?.stop();
    },
    []
  );

  const stopMomentum = () => {
    momentumRef.current?.stop();
    momentumRef.current = null;
  };

  // Kicks off the coasting spin a drag/flick release leaves behind. Runs its
  // own requestAnimationFrame loop rather than reusing animateTo's
  // Animated.timing: momentum has no fixed destination or duration, just a
  // velocity that decays every frame until it's imperceptible.
  const startMomentum = (velocity) => {
    stopMomentum();
    let v = velocity;
    let stopped = false;
    let lastTs = null;
    const step = (ts) => {
      if (stopped) return;
      if (lastTs == null) lastTs = ts;
      const dt = ts - lastTs;
      lastTs = ts;
      if (isMomentumDone(v)) {
        momentumRef.current = null;
        return;
      }
      applySpin(stepMomentum(spinRef.current, v, dt));
      v = decayVelocity(v, dt);
      requestAnimationFrame(step);
    };
    momentumRef.current = { stop: () => (stopped = true) };
    requestAnimationFrame(step);
  };

  // The globe's radius in SCREEN pixels — what a drag has to be measured
  // against for the surface to track the finger. The SVG is a fixed square
  // viewBox fitted into the box with preserveAspectRatio, so the conversion is
  // the fit ratio times the radius the globe is drawn at inside that viewBox.
  const screenRadius = () => {
    const { width, height } = boxSizeRef.current;
    const fit = Math.min(width || GLOBE_VIEW_SIZE, height || GLOBE_VIEW_SIZE) / GLOBE_VIEW_SIZE;
    return GLOBE_BASE_RADIUS * zoomRef.current * fit;
  };

  // Manual zoom/spin. Refs are written synchronously so back-to-back wheel
  // events in one tick compound correctly instead of all reading last render's
  // value. onManualChange fires unconditionally (a caller's setState bails when
  // the value is unchanged) because these handlers are bound once and would
  // otherwise be comparing against a stale copy of the caller's state.
  const applyZoom = (nextZoom) => {
    zoomRef.current = nextZoom;
    setZoom(nextZoom);
    onManualChangeRef.current?.();
  };

  const applySpin = (nextSpin) => {
    spinRef.current = nextSpin;
    setSpin(nextSpin);
    onManualChangeRef.current?.();
  };

  // Jump straight to a view, no animation and no onManualChange — this is the
  // caller repositioning the globe, not the player moving it.
  const snapTo = (targetZoom, targetSpin) => {
    animationRef.current?.stop();
    stopMomentum();
    zoomRef.current = targetZoom;
    spinRef.current = targetSpin;
    setZoom(targetZoom);
    setSpin(targetSpin);
  };

  // Tweens zoom and orientation to a target, so a preset reads as the globe
  // turning rather than teleporting. lerpSpin takes the short way around the
  // antimeridian; a naive lerp would spin the long way home from the Pacific.
  const animateTo = (targetZoom, targetSpin) => {
    animationRef.current?.stop();
    stopMomentum();
    const startZoom = zoomRef.current;
    const startSpin = spinRef.current;
    const progress = new Animated.Value(0);
    const id = progress.addListener(({ value }) => {
      const nextZoom = startZoom + (targetZoom - startZoom) * value;
      const nextSpin = lerpSpin(startSpin, targetSpin, value);
      zoomRef.current = nextZoom;
      spinRef.current = nextSpin;
      setZoom(nextZoom);
      setSpin(nextSpin);
    });
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: GLOBE_SPIN_ANIMATION_MS,
      useNativeDriver: false,
    });
    animationRef.current = { stop: () => progress.stopAnimation() };
    anim.start(({ finished }) => {
      progress.removeListener(id);
      // Snap to the exact target rather than trusting the last interpolated
      // frame — callers compare the result against a preset to decide whether
      // it is "active", and float drift could otherwise leave it just short.
      if (finished) {
        zoomRef.current = targetZoom;
        spinRef.current = targetSpin;
        setZoom(targetZoom);
        setSpin(targetSpin);
      }
    });
  };

  const onLayout = (e) => {
    const { width, height } = e.nativeEvent.layout;
    boxSizeRef.current = { width, height };
  };

  // Two-finger pinch zooms; a single touch only starts spinning once it moves
  // past the drag threshold, so a stationary tap still falls through to
  // GlobeMap's tap-to-select <Path>s untouched.
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt) =>
        enabledRef.current && evt.nativeEvent.touches.length === 2,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        if (!enabledRef.current) return false;
        const touches = evt.nativeEvent.touches;
        if (touches.length === 2) return true;
        if (touches.length === 1) {
          return (
            Math.abs(gestureState.dx) > MAP_DRAG_THRESHOLD ||
            Math.abs(gestureState.dy) > MAP_DRAG_THRESHOLD
          );
        }
        return false;
      },
      onPanResponderGrant: (evt) => {
        stopMomentum();
        const touches = evt.nativeEvent.touches;
        gesture.current = {
          mode: touches.length === 2 ? "pinch" : "spin",
          startDistance: touches.length === 2 ? touchDistance(touches[0], touches[1]) : 0,
          startZoom: zoomRef.current,
          startSpin: spinRef.current,
        };
      },
      onPanResponderMove: (evt, gestureState) => {
        const touches = evt.nativeEvent.touches;
        const g = gesture.current;
        const { minZoom: lo, maxZoom: hi } = boundsRef.current;
        if (touches.length === 2 && g.mode === "pinch") {
          applyZoom(
            pinchScale(g.startDistance, touchDistance(touches[0], touches[1]), g.startZoom, lo, hi)
          );
        } else if (g.mode === "spin") {
          applySpin(spinFromDrag(g.startSpin, gestureState.dx, gestureState.dy, screenRadius()));
        }
      },
      // gestureState.vx/vy is RN's own smoothed release velocity (px/ms) —
      // exactly what a flick's momentum needs, with no extra tracking here.
      // onPanResponderTerminate covers a gesture another responder steals
      // (e.g. a system back-swipe) the same way a normal release does.
      onPanResponderRelease: (evt, gestureState) => {
        if (gesture.current.mode === "spin") {
          startMomentum(spinVelocityFromDrag(gestureState.vx, gestureState.vy, screenRadius()));
        }
      },
      onPanResponderTerminate: (evt, gestureState) => {
        if (gesture.current.mode === "spin") {
          startMomentum(spinVelocityFromDrag(gestureState.vx, gestureState.vy, screenRadius()));
        }
      },
    })
  ).current;

  // Web has no pinch/drag gesture in RN's responder system, so zoom follows the
  // wheel/trackpad and spin follows a mouse drag — both bound straight to the
  // DOM node react-native-web renders under the view this is spread onto.
  useEffect(() => {
    if (Platform.OS !== "web" || !nodeRef.current) return;
    const node = nodeRef.current;

    const handleWheel = (e) => {
      if (!enabledRef.current || !wheelRef.current) return;
      e.preventDefault();
      const { minZoom: lo, maxZoom: hi } = boundsRef.current;
      applyZoom(wheelZoom(zoomRef.current, e.deltaY, MAP_WHEEL_ZOOM_SPEED, lo, hi));
    };
    node.addEventListener("wheel", handleWheel, { passive: false });

    const drag = {
      active: false,
      startX: 0,
      startY: 0,
      startSpin: DEFAULT_SPIN,
      dragged: false,
      // Release velocity, in px/ms: an exponential moving average over each
      // move's instantaneous speed, same smoothing RN's own gestureState.vx
      // does natively for the PanResponder path above — a raw last-frame
      // delta is too noisy (mice report irregularly) to flick well from.
      vx: 0,
      vy: 0,
      lastX: 0,
      lastY: 0,
      lastT: 0,
    };
    // Bound to window, not the globe node: a drag can end with the cursor
    // outside the box, and the click a mouseup fires lands wherever the cursor
    // is — a listener on the node alone would never see that click, leaving it
    // attached to wrongly swallow the next real click inside the box.
    const swallowNextClick = (e) => {
      e.stopPropagation();
      window.removeEventListener("click", swallowNextClick, true);
    };
    const handleMouseMove = (e) => {
      if (!drag.active) return;
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      if (
        !drag.dragged &&
        (Math.abs(dx) > MAP_DRAG_THRESHOLD || Math.abs(dy) > MAP_DRAG_THRESHOLD)
      ) {
        drag.dragged = true;
      }
      if (drag.dragged) applySpin(spinFromDrag(drag.startSpin, dx, dy, screenRadius()));
      const now = e.timeStamp;
      const dt = now - drag.lastT;
      if (dt > 0) {
        const instVx = (e.clientX - drag.lastX) / dt;
        const instVy = (e.clientY - drag.lastY) / dt;
        drag.vx = drag.vx * 0.7 + instVx * 0.3;
        drag.vy = drag.vy * 0.7 + instVy * 0.3;
      }
      drag.lastX = e.clientX;
      drag.lastY = e.clientY;
      drag.lastT = now;
    };
    const handleMouseUp = () => {
      drag.active = false;
      if (drag.dragged) {
        window.addEventListener("click", swallowNextClick, true);
        startMomentum(spinVelocityFromDrag(drag.vx, drag.vy, screenRadius()));
      }
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
    const handleMouseDown = (e) => {
      if (!enabledRef.current) return;
      stopMomentum();
      drag.active = true;
      drag.dragged = false;
      drag.startX = e.clientX;
      drag.startY = e.clientY;
      drag.startSpin = spinRef.current;
      drag.vx = 0;
      drag.vy = 0;
      drag.lastX = e.clientX;
      drag.lastY = e.clientY;
      drag.lastT = e.timeStamp;
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    };
    node.addEventListener("mousedown", handleMouseDown);

    return () => {
      node.removeEventListener("wheel", handleWheel);
      node.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("click", swallowNextClick, true);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The returned functions must keep a STABLE identity across renders, and this
  // is not a tidiness point — it is a bug that has already happened. A caller
  // that re-frames the globe from an effect (QuizScreen, on each new locator
  // question) has to list the function in that effect's deps. With a fresh
  // identity every render the effect re-ran on every render, and since every
  // drag frame is a setState, each frame immediately snapped the globe back to
  // its framing: the globe looked completely inert while the gestures were in
  // fact firing perfectly.
  //
  // Held in a ref rather than wrapped in useCallback because the bodies close
  // over other per-render helpers (applySpin, screenRadius); those only ever
  // touch refs and setState, so calling last render's copy is correct, but
  // spelling that out as a useCallback dep list would be a lie.
  const latest = useRef(null);
  latest.current = { animateTo, snapTo, stopMomentum };
  const stable = useRef({
    animateTo: (...args) => latest.current.animateTo(...args),
    snapTo: (...args) => latest.current.snapTo(...args),
    stopMomentum: (...args) => latest.current.stopMomentum(...args),
  }).current;

  return {
    spin,
    zoom,
    animateTo: stable.animateTo,
    snapTo: stable.snapTo,
    stopMomentum: stable.stopMomentum,
    // Spread onto the View that wraps <GlobeMap>. It must be the view that
    // actually sizes the globe: the ref binds the web listeners and onLayout
    // feeds the drag-to-pixels conversion.
    surfaceProps: {
      ref: nodeRef,
      onLayout,
      ...(Platform.OS === "web" ? {} : panResponder.panHandlers),
    },
  };
}
