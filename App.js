import React, { useEffect, useState } from "react";
import { SafeAreaView, View, StyleSheet, Platform, StatusBar as RNStatusBar } from "react-native";
import { StatusBar } from "expo-status-bar";
import { colors } from "./src/theme";
import HomeScreen from "./src/screens/HomeScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import CountryPageScreen from "./src/screens/CountryPageScreen";
import QuizScreen from "./src/components/QuizScreen";
import TabBar from "./src/components/TabBar";
import { AuthProvider, useAuth } from "./src/auth/AuthProvider";
import { DEFAULT_PROGRESS, applyRoundResult, dayKey } from "./src/game/progress";
import { roundSinks } from "./src/game/syncPolicy";
import { loadProgress, saveProgress } from "./src/storage/progress";
import { saveRoundResult, migrateLocalToCloud } from "./src/storage/cloudProgress";
import { DEFAULT_SETTINGS } from "./src/game/settings";
import { loadSettings, saveSettings } from "./src/storage/settings";

const TABS = [
  { key: "home", label: "Home", icon: "⌂" },
  { key: "profile", label: "Profile", icon: "◍" },
];

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}

// Lightweight state-based navigation keeps the prototype dependency-light.
function AppShell() {
  const { user } = useAuth();
  const [tab, setTab] = useState("home");
  const [screen, setScreen] = useState({ name: "home", mode: null, difficulty: null, timed: false });
  const [progress, setProgress] = useState(DEFAULT_PROGRESS);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  // Gate saving until the stored value has loaded, so we never overwrite real
  // progress with defaults during the initial async read.
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([loadProgress(), loadSettings()]).then(([savedProgress, savedSettings]) => {
      if (active) {
        setProgress(savedProgress);
        setSettings(savedSettings);
        setHydrated(true);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  // Local is written on every progress change — offline cache when signed in,
  // the only record when signed out. This is roundSinks().local in practice.
  useEffect(() => {
    if (hydrated) saveProgress(progress);
  }, [hydrated, progress]);

  useEffect(() => {
    if (hydrated) saveSettings(settings);
  }, [hydrated, settings]);

  // On sign-in, fold this device's progress into the cloud once (max-merge, so
  // a returning player can't lose their higher totals), then adopt what comes
  // back — from here cloud is the source of truth. Waits for hydration, or the
  // merge would read defaults instead of real local progress and under-count.
  useEffect(() => {
    if (!user || !hydrated) return undefined;
    let active = true;
    migrateLocalToCloud(user).then((result) => {
      if (active && result?.progress) setProgress(result.progress);
    });
    return () => {
      active = false;
    };
  }, [user, hydrated]);

  function toggleSound() {
    setSettings((s) => ({ ...s, soundEnabled: !s.soundEnabled }));
  }

  // Navigation seam for M2.2 country pages. Country pages open as a full-screen
  // overlay over the tab shell — same pattern as a quiz round — so no navigation
  // library is needed yet. leaveOverlay() returns to the tab you came from
  // (tab state is held separately from screen state, so it's preserved).
  function openCountry(code) {
    setScreen({ name: "country", code });
  }
  function leaveOverlay() {
    setScreen({ name: "home", mode: null, difficulty: null, timed: false });
  }

  function handleFinish(round) {
    const next = applyRoundResult(progress, { score: round.score, xp: round.xp }, dayKey(new Date()));
    setProgress(next);

    // Computed out here rather than inside the setProgress updater: React can
    // invoke an updater more than once, which would double-write the round.
    if (roundSinks(user).cloud) saveRoundResult(user, round, next);
  }

  if (screen.name === "quiz") {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar style="dark" />
        <QuizScreen
          mode={screen.mode}
          difficulty={screen.difficulty}
          timed={screen.timed}
          soundEnabled={settings.soundEnabled}
          onToggleSound={toggleSound}
          onExit={leaveOverlay}
          onFinish={handleFinish}
        />
      </SafeAreaView>
    );
  }

  if (screen.name === "country") {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar style="dark" />
        <CountryPageScreen code={screen.code} onExit={leaveOverlay} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <View style={styles.body}>
        {tab === "home" ? (
          <HomeScreen
            progress={progress}
            onPlay={(mode, difficulty, timed) => setScreen({ name: "quiz", mode, difficulty, timed })}
            onOpenCountry={openCountry}
          />
        ) : (
          <ProfileScreen progress={progress} />
        )}
      </View>
      <TabBar tabs={TABS} active={tab} onSelect={setTab} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingTop: Platform.OS === "android" ? RNStatusBar.currentHeight : 0,
  },
  body: { flex: 1 },
});
