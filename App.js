import React, { useEffect, useState } from "react";
import { SafeAreaView, StyleSheet, Platform, StatusBar as RNStatusBar } from "react-native";
import { StatusBar } from "expo-status-bar";
import { colors } from "./src/theme";
import HomeScreen from "./src/screens/HomeScreen";
import QuizScreen from "./src/components/QuizScreen";
import { DEFAULT_PROGRESS, applyRoundResult } from "./src/game/progress";
import { loadProgress, saveProgress } from "./src/storage/progress";

// Lightweight state-based navigation keeps the prototype dependency-light.
export default function App() {
  const [screen, setScreen] = useState({ name: "home", mode: null });
  const [progress, setProgress] = useState(DEFAULT_PROGRESS);
  // Gate saving until the stored value has loaded, so we never overwrite real
  // progress with defaults during the initial async read.
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    loadProgress().then((saved) => {
      if (active) {
        setProgress(saved);
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

  function handleFinish({ score, xp }) {
    setProgress((p) => applyRoundResult(p, { score, xp }));
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      {screen.name === "home" ? (
        <HomeScreen progress={progress} onPlay={(mode) => setScreen({ name: "quiz", mode })} />
      ) : (
        <QuizScreen
          mode={screen.mode}
          onExit={() => setScreen({ name: "home", mode: null })}
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
