// Signed-out half of the Profile tab. Sign-in is a means, not the destination —
// so the pitch is what an account gets you, not a wall in front of the games.
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { colors, spacing, radius, type, elevation } from "../theme";
import Container from "../components/Container";
import FadeInUp from "../components/FadeInUp";
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
    <ScrollView
      style={styles.wrap}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Container>
        <FadeInUp>
          <Text style={styles.kicker}>Your profile</Text>
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
              placeholderTextColor={colors.textMuted}
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
                <ActivityIndicator color={colors.onFill} />
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
        </FadeInUp>
      </Container>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.surface },
  content: { padding: spacing(5), paddingTop: spacing(10), paddingBottom: spacing(12) },
  kicker: { ...type.eyebrow, fontSize: 12 },
  title: { ...type.h1, fontSize: 32, marginTop: spacing(1), lineHeight: 38 },
  tagline: { ...type.caption, fontSize: 15, marginTop: spacing(2), marginBottom: spacing(6) },

  card: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.sheet,
    padding: spacing(5),
    ...elevation(1),
  },
  label: { ...type.eyebrow, fontSize: 11, marginBottom: spacing(1.5) },
  // Kit §Text field: a white field with a hairline, not a recess. The border
  // is what reads as an editable box on paper.
  input: {
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    paddingHorizontal: spacing(3.5),
    paddingVertical: spacing(3.5),
    ...type.body,
    marginBottom: spacing(4),
  },

  primaryBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingVertical: spacing(3.5),
    alignItems: "center",
    justifyContent: "center",
    minHeight: 54,
    ...elevation(2),
  },
  primaryBtnText: { ...type.body, color: colors.onFill },
  btnDisabled: { opacity: 0.5 },

  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(3),
    marginVertical: spacing(4),
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { ...type.eyebrow, fontSize: 11 },

  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing(2),
    backgroundColor: colors.surfaceSunken,
    borderRadius: radius.pill,
    paddingVertical: spacing(3.5),
    minHeight: 54,
    ...elevation(1),
  },
  googleMark: { fontSize: 17, color: colors.accent },
  googleBtnText: { ...type.body, color: colors.brand },

  note: { marginTop: spacing(4), borderRadius: radius.card, padding: spacing(3.5) },
  noteOk: { backgroundColor: colors.successSurface },
  noteOkText: { ...type.body, color: colors.success },
  noteBad: { backgroundColor: colors.dangerSurface },
  noteBadText: { ...type.body, color: colors.danger },

  footer: { ...type.caption, textAlign: "center", marginTop: spacing(6), fontSize: 12 },
});
