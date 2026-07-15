// Profile tab. Signed out it pitches an account; signed in it shows who you are
// and what the cloud has for you.
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, Image, ActivityIndicator, ScrollView } from "react-native";
import { colors, spacing, radius, type, shadow } from "../theme";
import { useAuth } from "../auth/AuthProvider";
import { fetchProgress } from "../storage/cloudProgress";
import { streakStatus, dayKey } from "../game/progress";
import SignInScreen from "./SignInScreen";

export default function ProfileScreen({ progress }) {
  const { user, loading, signOut } = useAuth();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.navy} />
      </View>
    );
  }

  if (!user) return <SignInScreen />;

  return <SignedIn user={user} localProgress={progress} onSignOut={signOut} />;
}

function SignedIn({ user, localProgress, onSignOut }) {
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
    <ScrollView style={styles.wrap} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.kicker}>YOUR PROFILE</Text>

      <View style={styles.identity}>
        {avatar ? (
          <Image source={{ uri: avatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarInitial}>{initial}</Text>
          </View>
        )}
        <View style={styles.identityBody}>
          {!!name && <Text style={styles.name}>{name}</Text>}
          <Text style={[styles.email, !name && styles.emailOnly]} numberOfLines={1}>
            {user.email}
          </Text>
        </View>
      </View>

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

      <Pressable onPress={onSignOut} style={styles.signOutBtn}>
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>

      <Text style={styles.footer}>Signing out keeps this device's progress — it stays saved locally.</Text>
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
  content: { padding: spacing(3), paddingTop: spacing(7), paddingBottom: spacing(6) },
  kicker: { color: colors.earth, fontWeight: "800", letterSpacing: 2, fontSize: 12, marginBottom: spacing(2) },

  identity: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(2),
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing(2),
    marginBottom: spacing(2),
    ...shadow,
  },
  avatar: { width: 56, height: 56, borderRadius: radius.pill, backgroundColor: colors.surfaceAlt },
  avatarFallback: { alignItems: "center", justifyContent: "center", backgroundColor: colors.navy },
  avatarInitial: { fontSize: 24, fontWeight: "900", color: colors.white },
  identityBody: { flex: 1 },
  name: { ...type.h2, marginBottom: 2 },
  email: { ...type.muted, fontSize: 13 },
  emailOnly: { ...type.h2, fontSize: 16, color: colors.ink },

  stats: { flexDirection: "row", gap: spacing(1.5), marginBottom: spacing(1.5) },
  stat: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing(2),
    alignItems: "center",
    ...shadow,
  },
  statValue: { fontSize: 24, fontWeight: "900", color: colors.navy },
  statLabel: { ...type.muted, fontSize: 12, marginTop: 2 },

  syncRow: { minHeight: 22, justifyContent: "center", marginBottom: spacing(3) },
  syncText: { ...type.muted, fontSize: 13 },

  signOutBtn: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingVertical: spacing(1.75),
    alignItems: "center",
  },
  signOutText: { ...type.body, fontWeight: "800", color: colors.error },

  footer: { ...type.muted, textAlign: "center", marginTop: spacing(2), fontSize: 12 },
});
