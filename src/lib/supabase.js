// Supabase client — the single connection to the backend (Postgres + Auth).
// URL polyfill must come first: supabase-js parses URLs internally, and React
// Native's URL implementation is incomplete without it.
import "react-native-url-polyfill/auto";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
// supabase-js imports @opentelemetry/api without declaring it, and Metro has no
// notion of an optional dependency — so it's pinned in package.json purely to
// keep the bundle resolvable. It looks unused; don't prune it.
import { createClient } from "@supabase/supabase-js";

// EXPO_PUBLIC_* vars are inlined into the bundle at build time, so these are
// safe to ship: the publishable key is a *public* client key, and RLS — not key
// secrecy — is what protects user rows. Never put a secret/service key here.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    "Supabase is not configured. Copy .env.example to .env and set " +
      "EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY " +
      "(Dashboard → Project Settings → API Keys → publishable key, sb_publishable_...), " +
      "then restart the dev server so Expo picks the values up."
  );
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    // AsyncStorage is localStorage on web and native storage on device, so one
    // config keeps the player signed in across every platform.
    storage: AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
    // PKCE keeps the token exchange off the URL on every platform: the callback
    // carries a short-lived `code`, and the verifier stays in AsyncStorage.
    // It's also the only flow that works for native deep links.
    flowType: "pkce",
    // Web lands back on a real URL carrying ?code=, so let supabase-js consume
    // it automatically. Native has no such URL — it hands the code to
    // exchangeCodeForSession() from the deep-link handler in AuthProvider — and
    // leaving this on there would make it hunt for tokens in URLs that never come.
    detectSessionInUrl: Platform.OS === "web",
  },
});
