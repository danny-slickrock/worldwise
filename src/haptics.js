// Haptic feedback on answer, mobile only. expo-haptics throws on web (no
// native module there), and any failure must never interrupt gameplay.
import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

export function correctHaptic() {
  if (Platform.OS === "web") return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

export function wrongHaptic() {
  if (Platform.OS === "web") return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
}
