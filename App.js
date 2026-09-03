import React, { useCallback, useEffect, useRef, useState } from "react";
import { SafeAreaView, View, StyleSheet, Platform, StatusBar as RNStatusBar } from "react-native";
import { StatusBar } from "expo-status-bar";
import { colors } from "./src/theme";
import HomeScreen from "./src/screens/HomeScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import CountryPageScreen from "./src/screens/CountryPageScreen";
import CountryIndexScreen from "./src/screens/CountryIndexScreen";
import WorldMapScreen from "./src/screens/WorldMapScreen";
import InterestsScreen from "./src/screens/InterestsScreen";
import LearningPathScreen from "./src/screens/LearningPathScreen";
import QuizScreen from "./src/components/QuizScreen";
import AppChrome from "./src/components/AppChrome";
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
import { LEARNING_PATH_REGIONS } from "./src/data/learningPaths";
import {
  TABS,
  navFromPath,
  navToPath,
  currentRoute,
  canGoBack,
  showsChrome,
  navigate,
  replace,
  back,
  switchTab,
  syncToPath,
} from "./src/game/navigation";
import { currentPath, pushPath, replacePath, subscribe } from "./src/lib/history";

// The tab shell is the app's deepest layer; screens sit on `bg` above it, so the
// safe-area inset reads as part of the chrome rather than a gap.

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}

function AppShell() {
  const { user } = useAuth();
  // One nav object replaces the old `tab` + `screen` pair. They used to be two
  // independent states that had to be kept consistent by hand — which is how
  // `returnTo`/`returnPathId` grew — and now the tab is just a field on the
  // stack that owns it. See src/game/navigation.js for the model.
  const [nav, setNav] = useState(() => navFromPath(currentPath()));
  const [progress, setProgress] = useState(DEFAULT_PROGRESS);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [interests, setInterests] = useState([]);
  // Gate saving until the stored value has loaded, so we never overwrite real
  // progress with defaults during the initial async read.
  const [hydrated, setHydrated] = useState(false);

  const route = currentRoute(nav);
  const path = navToPath(nav);

  const go = useCallback((next) => setNav((n) => navigate(n, next)), []);
  const swap = useCallback((next) => setNav((n) => replace(n, next)), []);
  const goBack = useCallback(() => setNav((n) => back(n)), []);
  const selectTab = useCallback((tab) => setNav((n) => switchTab(n, tab)), []);

  // Screens that are now tab roots must not draw a Back button — there is
  // nothing under them to go back to. Passing null rather than a no-op lets
  // each screen omit the affordance entirely instead of rendering a dead one.
  const backHandler = canGoBack(nav) ? goBack : null;

  // --- Web history -------------------------------------------------------
  // The URL is derived from the stack, never the other way round: the stack
  // changes, then this mirrors it. The first pass replaces rather than pushes,
  // because on load we are *adopting* the URL we were given — pushing would
  // put a duplicate entry behind us and make the first browser Back a no-op.
  const adoptedInitialPath = useRef(false);
  useEffect(() => {
    if (!adoptedInitialPath.current) {
      adoptedInitialPath.current = true;
      replacePath(path);
      return;
    }
    pushPath(path);
  }, [path]);

  // ...and the return leg: Back/Forward hand us a path, syncToPath folds it
  // into the stack we already have (see its comment for why it isn't a rebuild).
  useEffect(() => subscribe((nextPath) => setNav((n) => syncToPath(n, nextPath))), []);

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

  // Same sink rule as a finished round (roundSinks): local always gets the
  // write, cloud only when there's a signed-in owner for the row.
  function handleInterestsContinue(slugs) {
    setInterests(slugs);
    if (roundSinks(user).cloud) pushInterests(user, slugs);
    goBack();
  }
  function handleInterestsSkip() {
    setInterests([]);
    if (roundSinks(user).cloud) pushInterests(user, []);
    goBack();
  }

  function handleFinish(round) {
    const next = applyRoundResult(progress, { score: round.score, xp: round.xp }, dayKey(new Date()));
    setProgress(next);

    // Computed out here rather than inside the setProgress updater: React can
    // invoke an updater more than once, which would double-write the round.
    if (roundSinks(user).cloud) saveRoundResult(user, round, next);
  }

  const openCountry = (code) => go({ name: "country", code });
  const openQuiz = (mode, difficulty, timed) =>
    go({ name: "quiz", mode, difficulty, timed, attempt: 0 });

  // "Play again" replaces the quiz route instead of stacking a second one, so
  // three rounds in a row still leave a single Back between you and where you
  // started. `attempt` is what makes it a *different* route object — it feeds
  // QuizScreen's key below, remounting it with a fresh round.
  const playAgain = () =>
    swap({ ...route, attempt: (route.attempt ?? 0) + 1 });

  function renderScreen() {
    switch (route.name) {
      case "quiz":
        return (
          <QuizScreen
            key={`${route.mode}-${route.difficulty}-${route.timed}-${route.attempt ?? 0}`}
            mode={route.mode}
            difficulty={route.difficulty}
            timed={route.timed}
            soundEnabled={settings.soundEnabled}
            onToggleSound={toggleSound}
            onExit={goBack}
            onPlayAgain={playAgain}
            onFinish={handleFinish}
            onOpenCountry={openCountry}
          />
        );

      case "country":
        return (
          <CountryPageScreen
            // Keyed so country → neighbour → country remounts rather than
            // swapping a prop under a screen that fetches on mount.
            key={route.code}
            code={route.code}
            onExit={goBack}
            onPlay={(mode) => openQuiz(mode, DEFAULT_DIFFICULTY, false)}
            // Aims the Explore tab at this country. Because "explore" is a tab
            // root, `go` routes it through switchTab, so this lands on the
            // globe already spun to the country rather than stacking a second
            // map on top of the page you're reading.
            onViewMap={() => go({ name: "explore", focusCountry: route.code })}
          />
        );

      case "countryIndex":
        return <CountryIndexScreen onExit={backHandler} onOpenCountry={openCountry} />;

      case "explore":
        return (
          <WorldMapScreen
            // WorldMapScreen resolves `focusCountry` once on mount (its spin
            // target is a one-shot, not a reactive effect), so a new focus has
            // to be a new mount. Keying on it preserves that contract instead
            // of quietly breaking it now that the screen is reconciled in place
            // rather than swapped out wholesale.
            key={`explore-${route.focusCountry ?? "world"}`}
            onExit={backHandler}
            // Leaves a breadcrumb before opening the page: the explore route
            // beneath is re-aimed at the country you tapped, so Back returns to
            // the globe looking at where you were rather than snapping home to
            // the default orientation.
            onOpenCountry={(code) =>
              setNav((n) =>
                navigate(replace(n, { name: "explore", focusCountry: code }), {
                  name: "country",
                  code,
                })
              )
            }
            onOpenLearningPath={(pathId) => go({ name: "learn", pathId })}
            onBrowseIndex={() => go({ name: "countryIndex" })}
            focusCountry={route.focusCountry}
          />
        );

      case "learn":
        return (
          <LearningPathScreen
            // `/learn` with no region is a legitimate route; navigation.js
            // deliberately leaves the default to the surface that owns the data.
            pathId={route.pathId || LEARNING_PATH_REGIONS[0].toLowerCase()}
            onExit={backHandler}
            onOpenCountry={openCountry}
            // Switching region re-aims this screen rather than opening a new
            // one, so Back still means "leave the path", not "undo a pill tap".
            onSwitchPath={(pathId) => swap({ name: "learn", pathId })}
          />
        );

      // M2.3.6 — opened from the "Interests" row on Profile (step 5), seeded
      // with whatever's already selected so it doubles as the edit surface for
      // a returning player, not just a first-visit prompt. Both Skip and
      // Continue persist (step 4): locally always, cloud when signed in.
      case "interests":
        return (
          <InterestsScreen
            initialSelected={interests}
            onSkip={handleInterestsSkip}
            onContinue={handleInterestsContinue}
          />
        );

      case "profile":
        return (
          <ProfileScreen
            progress={progress}
            interests={interests}
            onOpenInterests={() => go({ name: "interests" })}
          />
        );

      default:
        return <HomeScreen progress={progress} onPlay={openQuiz} />;
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <AppChrome tabs={TABS} active={nav.tab} onSelect={selectTab} chrome={showsChrome(nav)}>
        <View style={styles.body}>{renderScreen()}</View>
      </AppChrome>
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
