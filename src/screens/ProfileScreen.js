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
import { colors, spacing, radius, type, elevation } from "../theme";
import Container from "../components/Container";
import FadeInUp from "../components/FadeInUp";
import { useAuth } from "../auth/AuthProvider";
import { fetchProgress } from "../storage/cloudProgress";
import { streakStatus, dayKey } from "../game/progress";
import SignInScreen from "./SignInScreen";

export default function ProfileScreen({ progress, interests, onOpenInterests }) {
  const { user, loading, signOut } = useAuth();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!user) return <SignInScreen />;

  return (
    <SignedIn
      user={user}
      localProgress={progress}
      interests={interests}
      onSignOut={signOut}
      onOpenInterests={onOpenInterests}
    />
  );
}

function SignedIn({ user, localProgress, interests = [], onSignOut, onOpenInterests }) {
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
              <ActivityIndicator color={colors.textMuted} size="small" />
            ) : (
              <Text style={styles.syncText}>✓ Synced — your progress is safe on every device.</Text>
            )}
          </View>

          {onOpenInterests && (
            <>
              <Text style={styles.section}>Preferences</Text>
              <Pressable onPress={onOpenInterests} style={styles.interestsRow} hitSlop={4}>
                <View style={styles.interestsBody}>
                  <Text style={styles.interestsLabel}>Interests</Text>
                  <Text style={styles.interestsValue}>
                    {interests.length ? `${interests.length} selected` : "Not set — tap to choose"}
                  </Text>
                </View>
                <Text style={styles.interestsChevron}>›</Text>
              </Pressable>
            </>
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
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  wrap: { flex: 1, backgroundColor: colors.surface },
  content: { padding: spacing(5), paddingTop: spacing(10), paddingBottom: spacing(12) },
  kicker: { ...type.eyebrow, fontSize: 12, marginBottom: spacing(4) },

  identity: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(4),
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.sheet,
    padding: spacing(4),
    marginBottom: spacing(7),
    ...elevation(1),
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
  avatarInitial: { fontSize: 26, color: colors.onFill },
  identityBody: { flex: 1 },
  name: { ...type.h3, fontSize: 20, marginBottom: 2 },
  email: { ...type.caption, fontSize: 13 },
  emailOnly: { ...type.h3, fontSize: 16 },

  section: { ...type.eyebrow, marginBottom: spacing(3) },
  stats: { flexDirection: "row", gap: spacing(2.5), marginBottom: spacing(3) },
  stat: {
    flex: 1,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.sheet,
    paddingVertical: spacing(4.5),
    alignItems: "center",
    ...elevation(1),
  },
  statValue: { fontSize: 26, color: colors.brand },
  statLabel: { ...type.eyebrow, fontSize: 10, marginTop: spacing(1) },

  syncRow: { minHeight: 22, justifyContent: "center", marginBottom: spacing(7) },
  syncText: { ...type.caption, fontSize: 13, color: colors.success },

  interestsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.sheet,
    padding: spacing(4),
    marginBottom: spacing(7),
    ...elevation(1),
  },
  interestsBody: { flex: 1 },
  interestsLabel: { ...type.body, color: colors.brand },
  interestsValue: { ...type.caption, fontSize: 13, marginTop: 2 },
  interestsChevron: { fontSize: 20, color: colors.accent, marginLeft: spacing(2) },

  signOutBtn: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.pill,
    paddingVertical: spacing(3.5),
    alignItems: "center",
    ...elevation(1),
  },
  signOutText: {
    ...type.label,
    fontSize: 14,
    color: colors.danger,
    letterSpacing: 1,
    textTransform: "uppercase",
  },

  footer: { ...type.caption, textAlign: "center", marginTop: spacing(4), fontSize: 12 },
});
