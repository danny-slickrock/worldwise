// Signed-out half of the Profile tab. Sign-in is a means, not the destination —
// so the pitch is what an account gets you, not a wall in front of the games.
import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, TextInput, ActivityIndicator, ScrollView } from "react-native";
import { colors, spacing, radius, type, shadow } from "../theme";
import { useAuth } from "../auth/AuthProvider";

export default function SignInScreen() {
  const { signInWithEmail, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  // 'idle' | 'sending' | 'sent' | 'error' — one state, so the button, the
  // message, and the disabled flags can never disagree.
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  const sending = status === "sending";

  async function handleMagicLink() {
    setStatus("sending");
    setMessage("");
    const { error } = await signInWithEmail(email);
    if (error) {
      setStatus("error");
      setMessage(error.message || "Couldn't send the link. Try again.");
      return;
    }
    setStatus("sent");
    setMessage(`Check ${email.trim()} for a sign-in link.`);
  }

  async function handleGoogle() {
    setStatus("sending");
    setMessage("");
    const { error, cancelled } = await signInWithGoogle();
    // On web this line is usually never reached — the tab has already left for
    // Google. It matters on native, and if the redirect is ever blocked.
    if (cancelled) {
      setStatus("idle");
      return;
    }
    if (error) {
      setStatus("error");
      setMessage(error.message || "Google sign-in failed. Try again.");
      return;
    }
    setStatus("idle");
  }

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.kicker}>YOUR PROFILE</Text>
      <Text style={styles.title}>Take your progress with you</Text>
      <Text style={styles.tagline}>
        Sign in to keep your XP, streak, and best round safe — on every device you play from.
      </Text>

      <View style={styles.card}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={(t) => {
            setEmail(t);
            // Clear a stale "sent"/"error" note the moment they retype.
            if (status !== "idle") setStatus("idle");
            setMessage("");
          }}
          placeholder="you@example.com"
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          inputMode="email"
          editable={!sending}
          onSubmitEditing={handleMagicLink}
          returnKeyType="go"
        />

        <Pressable
          onPress={handleMagicLink}
          disabled={sending || !email.trim()}
          style={[styles.primaryBtn, (sending || !email.trim()) && styles.btnDisabled]}
        >
          {sending ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.primaryBtnText}>Email me a magic link</Text>
          )}
        </Pressable>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <Pressable
          onPress={handleGoogle}
          disabled={sending}
          style={[styles.googleBtn, sending && styles.btnDisabled]}
        >
          <Text style={styles.googleMark}>G</Text>
          <Text style={styles.googleBtnText}>Continue with Google</Text>
        </Pressable>

        {status === "sent" && (
          <View style={[styles.note, styles.noteOk]}>
            <Text style={styles.noteOkText}>✓ {message}</Text>
          </View>
        )}
        {status === "error" && (
          <View style={[styles.note, styles.noteBad]}>
            <Text style={styles.noteBadText}>{message}</Text>
          </View>
        )}
      </View>

      <Text style={styles.footer}>
        No password to forget. We only use your email to sign you in.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing(3), paddingTop: spacing(7), paddingBottom: spacing(6) },
  kicker: { color: colors.earth, fontWeight: "800", letterSpacing: 2, fontSize: 12 },
  title: { ...type.hero, fontSize: 30, marginTop: spacing(0.5) },
  tagline: { ...type.muted, fontSize: 15, marginTop: spacing(0.75), marginBottom: spacing(3) },

  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing(2.5), ...shadow },
  label: { ...type.pill, color: colors.muted, marginBottom: spacing(0.75) },
  input: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    paddingHorizontal: spacing(1.75),
    paddingVertical: spacing(1.5),
    ...type.body,
    marginBottom: spacing(2),
  },

  primaryBtn: {
    backgroundColor: colors.navy,
    borderRadius: radius.pill,
    paddingVertical: spacing(1.75),
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
  },
  primaryBtnText: { ...type.body, color: colors.white, fontWeight: "800" },
  btnDisabled: { opacity: 0.5 },

  dividerRow: { flexDirection: "row", alignItems: "center", gap: spacing(1.5), marginVertical: spacing(2) },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.line },
  dividerText: { ...type.muted, fontSize: 13 },

  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing(1),
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.pill,
    paddingVertical: spacing(1.75),
    minHeight: 52,
  },
  googleMark: { fontSize: 17, fontWeight: "900", color: colors.teal },
  googleBtnText: { ...type.body, fontWeight: "800", color: colors.ink },

  note: { marginTop: spacing(2), borderRadius: radius.sm, padding: spacing(1.5) },
  noteOk: { backgroundColor: colors.successBg },
  noteOkText: { ...type.body, color: colors.success, fontWeight: "700" },
  noteBad: { backgroundColor: colors.errorBg },
  noteBadText: { ...type.body, color: colors.error, fontWeight: "700" },

  footer: { ...type.muted, textAlign: "center", marginTop: spacing(3), fontSize: 12 },
});
