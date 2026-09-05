import React, { useCallback, useEffect, useRef, useState } from "react";
import { SafeAreaView, View, StyleSheet, Platform, StatusBar as RNStatusBar } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { Archivo_600SemiBold, Archivo_700Bold } from "@expo-google-fonts/archivo";
import {
  InstrumentSans_400Regular,
  InstrumentSans_500Medium,
  InstrumentSans_600SemiBold,
} from "@expo-google-fonts/instrument-sans";
import { IBMPlexMono_400Regular, IBMPlexMono_500Medium } from "@expo-google-fonts/ibm-plex-mono";
import { colors } from "./src/theme";
import HomeScreen from "./src/screens/HomeScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import CountryPageScreen from "./src/screens/CountryPageScreen";
import CountryIndexScreen from "./src/screens/CountryIndexScreen";
import WorldMapScreen from "./src/screens/WorldMapScreen";
import InterestsScreen from "./src/screens/InterestsScreen";
import LearningPathScreen from "./src/screens/LearningPathScreen";
import AchievementsScreen from "./src/screens/AchievementsScreen";
import QuizScreen from "./src/components/QuizScreen";
import AppChrome from "./src/components/AppChrome";
import { AuthProvider, useAuth } from "./src/auth/AuthProvider";
import { DEFAULT_PROGRESS, applyRoundResult, dayKey } from "./src/game/progress";
import { roundSinks } from "./src/game/syncPolicy";
import { loadProgress, saveProgress } from "./src/storage/progress";
import { saveRoundResult, migrateLocalToCloud } from "./src/storage/cloudProgress";
import {
  loadInterests,
  saveInterests,
  loadInterestsAskedAt,
  markInterestsAsked,
} from "./src/storage/interests";
import {
  resolveInterestPrompt,
  resolveSecondaryAction,
  ORIGIN_PROMPT,
  ORIGIN_EDIT,
} from "./src/game/interestPrompt";
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

// The safe-area inset takes `surface` — the page the world is printed on — so
// the notch area reads as more page rather than as a band of chrome.

// The three typefaces the brand kit specifies. Registered by the exact family
// names theme.js references; weight is part of the name, not a `fontWeight`
// (see the note on `fonts` there).
const FONTS = {
  Archivo_600SemiBold,
  Archivo_700Bold,
  InstrumentSans_400Regular,
  InstrumentSans_500Medium,
  InstrumentSans_600SemiBold,
  IBMPlexMono_400Regular,
  IBMPlexMono_500Medium,
};

export default function App() {
  const [fontsLoaded] = useFonts(FONTS);

  // Hold one plain painted frame rather than rendering the whole app in a
  // fallback face and reflowing it. It's `surface`, so the wait reads as the
  // page arriving early, not as a flash of a different app.
  if (!fontsLoaded) {
    return (
      <View style={styles.splash}>
        <StatusBar style="dark" />
      </View>
    );
  }

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
  // M2.3.6 prompt gate. `askedAt` is the persisted "we've asked once" flag;
  // `interestsSettled` says the cloud merge below has finished, so the gate
  // judges a real selection rather than the empty array it starts as.
  const [askedAt, setAskedAt] = useState(null);
  const [interestsSettled, setInterestsSettled] = useState(false);
  const interestPromptRef = useRef(false);
  // Which context opened InterestsScreen. Defaults to the non-destructive one,
  // so a reload straight onto /interests can only ever offer Cancel — the
  // origin is UI state, not something the URL carries.
  const [interestsOrigin, setInterestsOrigin] = useState(ORIGIN_EDIT);
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
    Promise.all([
      loadProgress(),
      loadSettings(),
      loadInterests(),
      loadInterestsAskedAt(),
    ]).then(
      ([savedProgress, savedSettings, savedInterests, savedAskedAt]) => {
        if (active) {
          setProgress(savedProgress);
          setSettings(savedSettings);
          setInterests(savedInterests);
          setAskedAt(savedAskedAt);
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
      if (!active) return;
      if (result?.interests) setInterests(result.interests);
      // Whether or not it returned anything, the selection is now as complete
      // as it's going to get — the prompt gate below can safely judge it.
      setInterestsSettled(true);
    });
    return () => {
      active = false;
    };
  }, [user, hydrated]);

  // M2.3.6 — the one prompt, at sign-up. Everything else in this milestone
  // built the screen and its plumbing; this is what actually asks.
  //
  // Waits on `interestsSettled` so a player who picked on another device is
  // never asked again here, and guards with a ref because `markInterestsAsked`
  // is async: without it, a re-render between the call and the state landing
  // could push the route twice.
  useEffect(() => {
    if (!hydrated || !user || !interestsSettled) return;
    if (interestPromptRef.current) return;

    const { prompt, markAsked } = resolveInterestPrompt({
      signedIn: true,
      hydrated: true,
      askedAt,
      selected: interests,
    });
    if (!markAsked) return;

    interestPromptRef.current = true;
    const now = new Date().toISOString();
    markInterestsAsked(now);
    setAskedAt(now);
    // Marked either way; only actually shown when there's nothing on file.
    if (prompt) {
      setInterestsOrigin(ORIGIN_PROMPT);
      go({ name: "interests" });
    }
  }, [hydrated, user, interestsSettled, askedAt, interests, go]);

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
  // "Skip" on the sign-up prompt commits an empty answer; "Cancel" on the edit
  // surface leaves existing picks alone. resolveSecondaryAction() owns that
  // call — and refuses to clear whenever there are picks, so a mis-threaded
  // origin degrades to a harmless Cancel rather than wiping someone's choices.
  function handleInterestsSecondary() {
    const { clears } = resolveSecondaryAction({
      origin: interestsOrigin,
      initialSelected: interests,
    });
    if (clears) {
      setInterests([]);
      if (roundSinks(user).cloud) pushInterests(user, []);
    }
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
            secondaryLabel={
              resolveSecondaryAction({ origin: interestsOrigin, initialSelected: interests }).label
            }
            onSecondary={handleInterestsSecondary}
            onContinue={handleInterestsContinue}
          />
        );

      // M2.5 step 3 — the hero screen: locked/unlocked state + progress bars
      // via achievementPolicy.js, fed by local progress (streak) and cloud
      // round history (rounds/perfect/modes), same as ProfileScreen/HomeScreen.
      case "achievements":
        return <AchievementsScreen onExit={backHandler} progress={progress} />;

      case "profile":
        return (
          <ProfileScreen
            progress={progress}
            interests={interests}
            onOpenInterests={() => {
              setInterestsOrigin(ORIGIN_EDIT);
              go({ name: "interests" });
            }}
            onOpenAchievements={() => go({ name: "achievements" })}
          />
        );

      default:
        return <HomeScreen progress={progress} onPlay={openQuiz} />;
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Dark glyphs: the chrome is white and the page off-white now. */}
      <StatusBar style="dark" />
      <AppChrome tabs={TABS} active={nav.tab} onSelect={selectTab} chrome={showsChrome(nav)}>
        <View style={styles.body}>{renderScreen()}</View>
      </AppChrome>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.surface,
    paddingTop: Platform.OS === "android" ? RNStatusBar.currentHeight : 0,
  },
  splash: { flex: 1, backgroundColor: colors.surface },
  body: { flex: 1 },
});
