// Auth state for the whole app: who's signed in, and the three ways that changes.
//
// Supabase is the source of truth — this provider only mirrors it into React.
// Every sign-in path ends at onAuthStateChange, so the UI has one place to
// react to and can't drift from the real session.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { supabase } from "../lib/supabase";
import { getRedirectUrl } from "./redirect";

// Lets the web popup hand its result back and close itself. No-op on native.
WebBrowser.maybeCompleteAuthSession();

const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be called inside <AuthProvider>");
  return ctx;
}

// Pull the PKCE `code` out of a redirect URL, whichever platform delivered it.
function codeFromUrl(url) {
  if (!url) return null;
  try {
    const { queryParams } = Linking.parse(url);
    return queryParams?.code ? String(queryParams.code) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  // Starts true so the UI can hold its shape until we know whether a stored
  // session exists — without it, a returning player sees the sign-in screen
  // flash before their profile appears.
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (active) setSession(data?.session ?? null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    // Fires for sign-in, sign-out, and silent token refreshes.
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession ?? null);
      setLoading(false);
    });

    return () => {
      active = false;
      data?.subscription?.unsubscribe();
    };
  }, []);

  // Native only: the deep link back from a magic link (or a Google sign-in that
  // resumed in the system browser) arrives as a URL, not a page load. Web needs
  // none of this — supabase-js consumes ?code itself via detectSessionInUrl.
  useEffect(() => {
    if (Platform.OS === "web") return undefined;

    const handleUrl = async (url) => {
      const code = codeFromUrl(url);
      if (code) await supabase.auth.exchangeCodeForSession(code);
    };

    // Cold start: the link launched the app.
    Linking.getInitialURL().then(handleUrl);
    // Warm: the app was already open.
    const sub = Linking.addEventListener("url", ({ url }) => handleUrl(url));
    return () => sub.remove();
  }, []);

  // Magic link: Supabase emails a link; the session lands when they follow it,
  // so there's nothing to await here beyond "did the send succeed".
  const signInWithEmail = useCallback(async (email) => {
    const address = String(email || "").trim();
    if (!address) return { error: new Error("Enter your email address.") };
    const { error } = await supabase.auth.signInWithOtp({
      email: address,
      options: { emailRedirectTo: getRedirectUrl() },
    });
    return { error };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const redirectTo = getRedirectUrl();

    // Web: hand the tab to Google. This call navigates away and never resolves
    // into a signed-in state here — the session is picked up on the way back.
    if (Platform.OS === "web") {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
      return { error };
    }

    // Native: we drive the browser ourselves, so ask Supabase for the URL
    // instead of letting it redirect, then exchange the code it sends back.
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error) return { error };

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    // Backing out of the browser isn't a failure — don't shout about it.
    if (result.type !== "success") return { error: null, cancelled: true };

    const code = codeFromUrl(result.url);
    if (!code) return { error: new Error("Google sign-in didn't return a code. Try again.") };

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    return { error: exchangeError };
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  }, []);

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      signInWithEmail,
      signInWithGoogle,
      signOut,
    }),
    [session, loading, signInWithEmail, signInWithGoogle, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
