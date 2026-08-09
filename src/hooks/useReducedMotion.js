// Whether the OS "reduce motion" setting is on.
//
// Honouring this isn't decoration: for people with vestibular disorders,
// movement on screen can cause real nausea and dizziness. The setting is an
// explicit request, so entrance transforms are dropped entirely rather than
// merely shortened.
//
// Returns false until the initial async read resolves. That's the right
// default: it's the common case, and a single frame of motion for someone who
// asked for none is a far smaller failure than permanently disabling motion for
// everyone if the query is slow or unsupported.
import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

export default function useReducedMotion() {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let active = true;

    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((enabled) => {
        if (active) setReduceMotion(Boolean(enabled));
      })
      // Not every platform implements the query — react-native-web's support
      // depends on the browser exposing prefers-reduced-motion. Falling back to
      // "no preference" keeps the app animating normally instead of throwing.
      .catch(() => {});

    // The setting can be toggled while the app is open, so track it live.
    const sub = AccessibilityInfo.addEventListener?.("reduceMotionChanged", (enabled) => {
      setReduceMotion(Boolean(enabled));
    });

    return () => {
      active = false;
      // RN ≥0.65 returns a subscription; older/web shims may return nothing.
      sub?.remove?.();
    };
  }, []);

  return reduceMotion;
}
