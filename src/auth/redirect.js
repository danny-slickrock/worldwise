// Platform lookups for the auth redirect. The decision itself is pure and lives
// in redirectPolicy.js; this file only reads the platform, the window origin,
// and the native deep link, then hands them over.
import { Platform } from "react-native";
import { makeRedirectUri } from "expo-auth-session";
import { pickRedirectUrl } from "./redirectPolicy";

export { pickRedirectUrl };

// Resolve the redirect URL for whatever platform we're running on.
export function getRedirectUrl() {
  const isWeb = Platform.OS === "web";
  return pickRedirectUrl({
    platform: Platform.OS,
    origin: typeof window !== "undefined" ? (window.location?.origin ?? null) : null,
    // worldwise://auth/callback in a build; inside Expo Go this becomes the
    // exp://…/--/auth/callback form the dev client can actually receive.
    nativeUrl: isWeb ? null : makeRedirectUri({ scheme: "worldwise", path: "auth/callback" }),
  });
}
