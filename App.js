import React, { useEffect, useState } from "react";
import { SafeAreaView, View, StyleSheet, Platform, StatusBar as RNStatusBar } from "react-native";
import { StatusBar } from "expo-status-bar";
import { colors } from "./src/theme";
import HomeScreen from "./src/screens/HomeScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import CountryPageScreen from "./src/screens/CountryPageScreen";
import CountryIndexScreen from "./src/screens/CountryIndexScreen";
import WorldMapScreen from "./src/screens/WorldMapScreen";
import InterestsScreen from "./src/screens/InterestsScreen";
import QuizScreen from "./src/components/QuizScreen";
import TabBar from "./src/components/TabBar";
import { AuthProvider, useAuth } from "./src/auth/AuthProvider";
import { DEFAULT_PROGRESS, applyRoundResult, dayKey } from "./src/game/progress";
import { roundSinks } from "./src/game/syncPolicy";
import { loadProgress, saveProgress } from "./src/storage/progress";
import { saveRoundResult, migrateLocalToCloud } from "./src/storage/cloudProgress";
import { loadInterests, saveInterests } from "./src/storage/interests";
import { pushInterests, migrateLocalInterestsToCloud } from "./src/storage/cloudInterests";
import { DEFAULT_SETTINGS } from "./src/game/settings";
import { loadSettings, saveSettings } from "./src/storage/settings";
import { DEFAULT_DIFFICULTY } from "./src/constants";

const TABS = [
  { key: "home", label: "Home", icon: "⌂" },
  { key: "profile", label: "Profile", icon: "◍" },
];

// The tab shell is the app's deepest layer; screens sit on `bg` above it, so the
// safe-area inset reads as part of the chrome rather than a gap.

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
  const [interests, setInterests] = useState([]);
  // Gate saving until the stored value has loaded, so we never overwrite real
  // progress with defaults during the initial async read.
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([loadProgress(), loadSettings(), loadInterests()]).then(
      ([savedProgress, savedSettings, savedInterests]) => {
        if (active) {
          setProgress(savedProgress);
          setSettings(savedSettings);
          setInterests(savedInterests);
          setHydrated(true);
        }
      }
    );
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

  // Same offline-first rule as progress: local is the cache, signed in or
  // out, so a pick made before sign-up survives it.
  useEffect(() => {
    if (hydrated) saveInterests(interests);
  }, [hydrated, interests]);

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

  // Same merge-once-on-sign-in seam for interests, via its own migrated flag
  // (cloudInterests.js's INTERESTS_MIGRATED_KEY) so it runs independently of
  // the progress migration — a player can sign in long before ever touching
  // the interests screen.
  useEffect(() => {
    if (!user || !hydrated) return undefined;
    let active = true;
    migrateLocalInterestsToCloud(user).then((result) => {
      if (active && result?.interests) setInterests(result.interests);
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
  //
  // `returnTo` lets a country page opened from the browsable index (step 5b)
  // or the World Map (M2.3 step 1) hand its Back button back to where it was
  // opened from instead of Home, without a real nav stack — just one extra
  // field on the overlay's own screen state.
  function openCountry(code, returnTo = "home") {
    setScreen({ name: "country", code, returnTo });
  }
  function openCountryIndex() {
    setScreen({ name: "countryIndex" });
  }
  // `focusCountry` (M2.3.7 step 4) lets a caller — the country page's "View on
  // map" link — open the map with the globe already spun to that country,
  // instead of always resetting to the default orientation.
  function openWorldMap(focusCountry = null) {
    setScreen({ name: "worldMap", focusCountry });
  }
  function openInterests() {
    setScreen({ name: "interests" });
  }
  function leaveOverlay() {
    setScreen({ name: "home", mode: null, difficulty: null, timed: false });
  }
  function exitCountry() {
    if (screen.name === "country" && screen.returnTo === "countryIndex") {
      openCountryIndex();
    } else if (screen.name === "country" && screen.returnTo === "worldMap") {
      openWorldMap();
    } else {
      leaveOverlay();
    }
  }

  // Same sink rule as a finished round (roundSinks): local always gets the
  // write, cloud only when there's a signed-in owner for the row.
  function handleInterestsContinue(slugs) {
    setInterests(slugs);
    if (roundSinks(user).cloud) pushInterests(user, slugs);
    leaveOverlay();
  }
  function handleInterestsSkip() {
    setInterests([]);
    if (roundSinks(user).cloud) pushInterests(user, []);
    leaveOverlay();
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
        <StatusBar style="light" />
        <QuizScreen
          mode={screen.mode}
          difficulty={screen.difficulty}
          timed={screen.timed}
          soundEnabled={settings.soundEnabled}
          onToggleSound={toggleSound}
          onExit={leaveOverlay}
          onFinish={handleFinish}
          onOpenCountry={openCountry}
        />
      </SafeAreaView>
    );
  }

  if (screen.name === "country") {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar style="light" />
        <CountryPageScreen
          code={screen.code}
          onExit={exitCountry}
          onPlay={(mode) => setScreen({ name: "quiz", mode, difficulty: DEFAULT_DIFFICULTY, timed: false })}
          onViewMap={() => openWorldMap(screen.code)}
        />
      </SafeAreaView>
    );
  }

  if (screen.name === "countryIndex") {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar style="light" />
        <CountryIndexScreen onExit={leaveOverlay} onOpenCountry={(code) => openCountry(code, "countryIndex")} />
      </SafeAreaView>
    );
  }

  if (screen.name === "worldMap") {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar style="light" />
        <WorldMapScreen
          onExit={leaveOverlay}
          onOpenCountry={(code) => openCountry(code, "worldMap")}
          focusCountry={screen.focusCountry}
        />
      </SafeAreaView>
    );
  }

  // M2.3.6 — opened from the "Interests" row on Profile (step 5), seeded with
  // whatever's already selected so it doubles as the edit surface for a
  // returning player, not just a first-visit prompt. Both Skip and Continue
  // persist (step 4): locally always, and to the cloud when signed in.
  if (screen.name === "interests") {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar style="light" />
        <InterestsScreen
          initialSelected={interests}
          onSkip={handleInterestsSkip}
          onContinue={handleInterestsContinue}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <View style={styles.body}>
        {tab === "home" ? (
          <HomeScreen
            progress={progress}
            onPlay={(mode, difficulty, timed) => setScreen({ name: "quiz", mode, difficulty, timed })}
            onOpenCountryIndex={openCountryIndex}
            onOpenWorldMap={openWorldMap}
          />
        ) : (
          <ProfileScreen progress={progress} interests={interests} onOpenInterests={openInterests} />
        )}
      </View>
      <TabBar tabs={TABS} active={tab} onSelect={setTab} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.navy,
    paddingTop: Platform.OS === "android" ? RNStatusBar.currentHeight : 0,
  },
  body: { flex: 1 },
});
