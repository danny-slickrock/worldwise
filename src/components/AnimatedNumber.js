// A number that counts to its new value instead of jumping to it.
//
// This exists for one moment in particular: XP landing after a round. "+55 XP"
// as a static swap is a fact; the same number rolling up is the reward, and it
// costs one component. The same applies to a streak advancing and to a
// collection filling.
//
// Two things make it behave rather than merely animate:
//
//   1. **The first value never animates.** A screen that mounts showing 1,240
//      XP should show 1,240 XP, not count there from zero every time you open
//      Profile. Only a CHANGE is worth watching. `from` is the deliberate
//      exception, for the one place where arriving at the number IS the event:
//      the round's XP award, which should roll up from nothing.
//   2. **It is announced as its final value throughout.** The intermediate
//      numbers are decoration; a screen reader hearing "1, 4, 19, 84, 212…" is
//      being given noise. The accessibility label is the destination.
//
// Driven by a listener rather than by interpolating into a Text: RN can only
// animate style properties natively, and text CONTENT is not one — so this runs
// on the JS thread by necessity. That is fine for one short roll of one label,
// and is why the duration is capped rather than scaled to the distance.
import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Text } from "react-native";
import { motion } from "../theme";
import useReducedMotion from "../hooks/useReducedMotion";

const DURATION = motion.duration.sheet * 2;

export default function AnimatedNumber({
  value = 0,
  // Seed the counter somewhere other than `value`, which makes the first render
  // animate. Use it only where the count itself is the moment — a round's XP
  // award — never for a total that merely happens to be on screen.
  from = null,
  // Renders around the number — "+", " XP", a separator.
  format = (n) => String(n),
  duration = DURATION,
  style,
  ...rest
}) {
  const reduceMotion = useReducedMotion();
  const seed = from ?? value;
  const anim = useRef(new Animated.Value(seed)).current;
  const [shown, setShown] = useState(seed);
  const previous = useRef(seed);

  useEffect(() => {
    const from = previous.current;
    previous.current = value;

    if (reduceMotion || from === value) {
      anim.setValue(value);
      setShown(value);
      return undefined;
    }

    const sub = anim.addListener(({ value: v }) => setShown(Math.round(v)));
    const run = Animated.timing(anim, {
      toValue: value,
      duration,
      // Decelerating: fast off the mark, easing into the total. The kit's own
      // curve, so a rolling number and a sliding sheet share a feel.
      easing: Easing.bezier(...motion.easing),
      useNativeDriver: false,
    });
    run.start(({ finished }) => {
      // Land exactly. Rounding a stopped-short value would leave the label one
      // off the truth, which for XP is worse than any animation is worth.
      if (finished) setShown(value);
    });

    return () => {
      run.stop();
      anim.removeListener(sub);
    };
  }, [anim, duration, reduceMotion, value]);

  return (
    <Text style={style} accessibilityLabel={format(value)} {...rest}>
      {format(shown)}
    </Text>
  );
}
