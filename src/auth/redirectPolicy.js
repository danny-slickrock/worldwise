// Pure redirect selection. No React Native or expo imports, so the rule is
// unit-testable in plain Node — same pure/IO split as cloudSync vs cloudProgress.
// The platform lookups live in redirect.js, which feeds this the values.

// Where Supabase should send the player back to after a magic link or Google.
//   web    → the page they're already on (localhost in dev, the Vercel origin
//            in prod), so a single build works in both without extra config.
//   native → the app's own deep link (worldwise:// or Expo Go's exp:// form).
//
// Every URL this can return must be in Supabase's redirect allowlist, or auth
// completes and then dumps the player at the Site URL instead.
export function pickRedirectUrl({ platform, origin, nativeUrl }) {
  if (platform === "web") {
    // No origin means there's no browser to return to. Returning null lets
    // Supabase fall back to its configured Site URL, which beats handing it a
    // redirect built out of a missing value.
    return origin || null;
  }
  return nativeUrl || null;
}
