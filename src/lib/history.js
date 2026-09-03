// Web-history IO. The thin, untestable half of the navigation split — every
// decision lives in the pure src/game/navigation.js; this file only touches
// `window`.
//
// Native is a deliberate no-op rather than an error: App.js calls these
// unconditionally, and a Platform check at each of the four call sites would be
// four chances to forget one. `subscribe` returns a no-op unsubscribe on
// native for the same reason — the caller's useEffect cleanup stays uniform.
import { Platform } from "react-native";

const isWeb = Platform.OS === "web" && typeof window !== "undefined" && !!window.history;

export function currentPath() {
  if (!isWeb) return "/";
  return `${window.location.pathname}${window.location.search}`;
}

// Guarded against pushing the path we are already on. Without this, adopting a
// URL on load (or any render that re-derives the same path) would stack a
// duplicate entry, and the user would have to press browser Back twice to move
// once — the exact papercut this feature exists to remove.
export function pushPath(path) {
  if (!isWeb || path === currentPath()) return;
  window.history.pushState({ worldwise: true }, "", path);
}

export function replacePath(path) {
  if (!isWeb || path === currentPath()) return;
  window.history.replaceState({ worldwise: true }, "", path);
}

export function subscribe(onPath) {
  if (!isWeb) return () => {};
  const handler = () => onPath(currentPath());
  window.addEventListener("popstate", handler);
  return () => window.removeEventListener("popstate", handler);
}
