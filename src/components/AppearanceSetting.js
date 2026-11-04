// The colour-scheme setting: System · Light · Dark. A device setting rather
// than an account one — nobody should need an account to turn the lamp down —
// which is why it lives on Settings, reachable signed in or out.
import React from "react";
import SegmentedSetting from "./SegmentedSetting";
import { COLOR_SCHEME_PREFS, COLOR_SCHEME_LABELS } from "../game/colorScheme";

const OPTIONS = COLOR_SCHEME_PREFS.map((value) => ({ value, label: COLOR_SCHEME_LABELS[value] }));

export default function AppearanceSetting({ value, onChange, style }) {
  return (
    <SegmentedSetting
      label="Appearance"
      options={OPTIONS}
      value={value}
      onChange={onChange}
      hint={value === "system" ? "Follows your device’s light or dark setting." : " "}
      style={style}
    />
  );
}
