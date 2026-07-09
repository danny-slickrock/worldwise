import React, { useState } from "react";
import { SafeAreaView, StyleSheet, Platform, StatusBar as RNStatusBar } from "react-native";
import { StatusBar } from "expo-status-bar";
import { colors } from "./src/theme";
import HomeScreen from "./src/screens/HomeScreen";
import QuizScreen from "./src/components/QuizScreen";

// Lightweight state-based navigation keeps the prototype dependency-light.
export default function App() {
  const [screen, setScreen] = useState({ name: "home", mode: null });
  const [progress, setProgress] = useState({ xp: 0, streak: 0, bestScore: 0 });

  function handleFinish({ score, xp }) {
    setProgress((p) => ({
      xp: p.xp + xp,
      streak: p.streak + 1,
      bestScore: Math.max(p.bestScore, score),
    }));
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
