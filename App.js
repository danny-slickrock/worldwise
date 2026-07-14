import React, { useEffect, useState } from "react";
import { SafeAreaView, StyleSheet, Platform, StatusBar as RNStatusBar } from "react-native";
import { StatusBar } from "expo-status-bar";
import { colors } from "./src/theme";
import HomeScreen from "./src/screens/HomeScreen";
import QuizScreen from "./src/components/QuizScreen";
import { DEFAULT_PROGRESS, applyRoundResult, dayKey } from "./src/game/progress";
import { loadProgress, saveProgress } from "./src/storage/progress";
import { DEFAULT_SETTINGS } from "./src/game/settings";
import { loadSettings, saveSettings } from "./src/storage/settings";

// Lightweight state-based navigation keeps the prototype dependency-light.
export default function App() {
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

  useEffect(() => {
    if (hydrated) saveProgress(progress);
  }, [hydrated, progress]);

  useEffect(() => {
    if (hydrated) saveSettings(settings);
  }, [hydrated, settings]);

  function toggleSound() {
    setSettings((s) => ({ ...s, soundEnabled: !s.soundEnabled }));
  }

  function handleFinish({ score, xp }) {
    setProgress((p) => applyRoundResult(p, { score, xp }, dayKey(new Date())));
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      {screen.name === "home" ? (
        <HomeScreen
          progress={progress}
          onPlay={(mode, difficulty, timed) => setScreen({ name: "quiz", mode, difficulty, timed })}
        />
      ) : (
        <QuizScreen
          mode={screen.mode}
          difficulty={screen.difficulty}
          timed={screen.timed}
          soundEnabled={settings.soundEnabled}
          onToggleSound={toggleSound}
          onExit={() => setScreen({ name: "home", mode: null, difficulty: null, timed: false })}
          onFinish={handleFinish}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingTop: Platform.OS === "android" ? RNStatusBar.currentHeight : 0,
  },
});
