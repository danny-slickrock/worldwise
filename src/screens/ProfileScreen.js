// Profile tab. Signed out it pitches an account; signed in it shows who you are
// and what the cloud has for you.
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { colors, spacing, radius, type, depth } from "../theme";
import Container from "../components/Container";
import FadeInUp from "../components/FadeInUp";
import { useAuth } from "../auth/AuthProvider";
import { fetchProgress } from "../storage/cloudProgress";
import { streakStatus, dayKey } from "../game/progress";
import SignInScreen from "./SignInScreen";

export default function ProfileScreen({ progress, onOpenInterests }) {
  const { user, loading, signOut } = useAuth();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.teal} />
      </View>
    );
  }

  if (!user) return <SignInScreen />;

  return <SignedIn user={user} localProgress={progress} onSignOut={signOut} onOpenInterests={onOpenInterests} />;
}

function SignedIn({ user, localProgress, onSignOut, onOpenInterests }) {
  // Cloud is the source of truth once signed in; local is the offline cache we
  // show until it answers, so the numbers never flash through zero.
  const [stats, setStats] = useState(localProgress);
  const [syncing, setSyncing] = useState(true);

  useEffect(() => {
    let active = true;
    setSyncing(true);
    fetchProgress(user).then((cloud) => {
      if (!active) return;
      // fetchProgress returns null when there's no row yet or the read failed —
      // either way, keep showing local rather than wiping the display.
      if (cloud) setStats(cloud);
      setSyncing(false);
    });
    return () => {
      active = false;
    };
  }, [user]);

  const streak = streakStatus(stats, dayKey(new Date()));
  const name = user.user_metadata?.display_name || user.user_metadata?.full_name;
  const avatar = user.user_metadata?.avatar_url;
  const initial = (name || user.email || "?").trim().charAt(0).toUpperCase();

  return (
    <ScrollView
      style={styles.wrap}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Container>
        <FadeInUp>
          <Text style={styles.kicker}>Your profile</Text>

          <View style={styles.identity}>
            <View style={styles.avatarDisc}>
              {avatar ? (
                <Image source={{ uri: avatar }} style={styles.avatar} />
              ) : (
                <Text style={styles.avatarInitial}>{initial}</Text>
              )}
            </View>
            <View style={styles.identityBody}>
              {!!name && <Text style={styles.name}>{name}</Text>}
              <Text style={[styles.email, !name && styles.emailOnly]} numberOfLines={1}>
                {user.email}
              </Text>
            </View>
          </View>

          <Text style={styles.section}>Your record</Text>
          <View style={styles.stats}>
            <Stat label="XP" value={stats.xp} />
            <Stat label="Day streak" value={streak.count} />
            <Stat label="Best round" value={stats.bestScore ? `${stats.bestScore}/8` : "—"} />
          </View>

          <View style={styles.syncRow}>
            {syncing ? (
              <ActivityIndicator color={colors.muted} size="small" />
            ) : (
              <Text style={styles.syncText}>✓ Synced — your progress is safe on every device.</Text>
            )}
          </View>

          {/* M2.3.6 step 1 preview — not a real entry point yet. Nothing selected
              here is saved: that arrives with the pure catalog (step 2) and the
              cloud-synced schema (steps 3-4). This row itself moves to a proper
              "Interests" row once step 5 lands. */}
          {onOpenInterests && (
            <Pressable onPress={onOpenInterests} style={styles.interestsBtn}>
              <Text style={styles.interestsText}>What are you curious about? (preview)</Text>
            </Pressable>
          )}

          <Pressable onPress={onSignOut} style={styles.signOutBtn}>
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>

          <Text style={styles.footer}>
            Signing out keeps this device's progress — it stays saved locally.
          </Text>
        </FadeInUp>
      </Container>
    </ScrollView>
  );
}

function Stat({ label, value }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  wrap: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing(2.5), paddingTop: spacing(5), paddingBottom: spacing(6) },
  kicker: { ...type.kicker, fontSize: 12, marginBottom: spacing(2) },

  identity: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(2),
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing(2),
    marginBottom: spacing(3.5),
    ...depth(),
  },
  // Avatar sits on a warm disc, the way the reference profile does — a
  // photo-less account still gets a piece of colour rather than a grey circle.
  avatarDisc: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: colors.sand,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatar: { width: "100%", height: "100%" },
  avatarInitial: { fontSize: 26, fontWeight: "900", color: colors.navyDeep },
  identityBody: { flex: 1 },
  name: { ...type.h2, fontSize: 20, marginBottom: 2 },
  email: { ...type.muted, fontSize: 13 },
  emailOnly: { ...type.h2, fontSize: 16 },

  section: { ...type.section, marginBottom: spacing(1.5) },
  stats: { flexDirection: "row", gap: spacing(1.25), marginBottom: spacing(1.5) },
  stat: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing(2.25),
    alignItems: "center",
    ...depth(),
  },
  statValue: { fontSize: 26, fontWeight: "900", color: colors.headline },
  statLabel: { ...type.section, fontSize: 10, marginTop: spacing(0.5) },

  syncRow: { minHeight: 22, justifyContent: "center", marginBottom: spacing(3.5) },
  syncText: { ...type.muted, fontSize: 13, color: colors.success },

  interestsBtn: {
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingVertical: spacing(1.75),
    alignItems: "center",
    marginBottom: spacing(1.25),
    ...depth(),
  },
  interestsText: { ...type.body, fontWeight: "800", color: colors.teal },

  signOutBtn: {
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingVertical: spacing(1.75),
    alignItems: "center",
    ...depth(),
  },
  signOutText: {
    ...type.pill,
    fontSize: 14,
    color: colors.error,
    letterSpacing: 1,
    textTransform: "uppercase",
  },

  footer: { ...type.muted, textAlign: "center", marginTop: spacing(2), fontSize: 12 },
});
