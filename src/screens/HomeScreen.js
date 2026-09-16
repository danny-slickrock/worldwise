import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import {
  colors,
  spacing,
  radius,
  type,
  elevation,
  hairline,
  buttonHeight,
  motion,
  onFill,
} from "../theme";
import Container from "../components/Container";
import FadeInUp, { staggerDelay } from "../components/FadeInUp";
import GlobeCard from "../components/GlobeCard";
import Wordmark from "../components/Wordmark";
import CompassMark from "../components/CompassMark";
import Material from "../components/Material";
import PressableTint from "../components/PressableTint";
import AnimatedNumber from "../components/AnimatedNumber";
import { MODES } from "../game/questions";
import { isProMode } from "../game/entitlements";
import { DEFAULT_DIFFICULTY } from "../constants";
import { streakStatus, dayKey } from "../game/progress";

// Daily leads as a full-width hero; the rest tile two-up underneath.
const FEATURED = "daily";
const GAME_GRID = [
  "flag",
  "capital",
  "capitalReverse",
  "shape",
  "locator",
  "higherLower",
  // The two pro marathons. They sit in the same grid rather than in a separate
  // "Pro" shelf: every account is pro today (see game/entitlements.js), so a
  // roped-off section would be selling something the player already has.
  "nameEveryCountry",
  "identifyAllFlags",
];

// The tiles cascade among themselves, but only after the header and hero above
// them have landed — otherwise the page assembles bottom-up, which reads as a
// glitch rather than as a sequence.
const TILE_BASE_DELAY = motion.stagger * 2;

// Home is now purely about playing. Explore, the World Map and Learning Paths
// used to sit in the grid below as tiles — one doorway each, two taps deep and
// reachable only from here. They are top-level tabs as of the navigation
// rework (see src/game/navigation.js), so keeping tiles for them would be a
// second, competing route to the same place.
export default function HomeScreen({
  progress,
  onPlay,
  onOpenCountry,
  onOpenExplore,
  basemap,
  onChangeBasemap,
}) {
  // The pool filter defaults to "all" under the tier menu and is no longer
  // player-facing here; it stays a named constant rather than an inline "all"
  // so the two axes remain legible at the call site.
  const difficulty = DEFAULT_DIFFICULTY;
  const [timed, setTimed] = useState(false);

  const streak = streakStatus(progress, dayKey(new Date()));
  const streakMsg = !progress.lastPlayedOn
    ? "Play a round to start your streak."
    : streak.playedToday
      ? `${streak.count}-day streak — see you tomorrow!`
      : streak.atRisk
        ? `${streak.count}-day streak — play today to keep it going.`
        : "Your streak lapsed — start a new one today.";

  const featured = MODES[FEATURED];

  return (
    // The page ground is AppChrome's now — the kit's paper fibre, under every
    // screen rather than under this one. See its Page().
    <ScrollView
      style={styles.wrap}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Container>
        {/* Status strip — the numbers worth glancing at, above everything else.
            Freezes only earn a pill when you actually have one. */}
        <FadeInUp>
          <View style={styles.statusRow}>
            <View style={styles.statusPill}>
              <Text style={styles.statusGlyph}>{streak.alive ? "🔥" : "🌙"}</Text>
              {/* Both numbers roll rather than snap. Coming back to Home after
                  a round is the moment the totals change, and a number that
                  counts to its new value is the whole reward — it costs one
                  component and it is the difference between a receipt and a
                  result. AnimatedNumber never animates its FIRST value, so
                  opening Home cold still just shows the totals. */}
              <AnimatedNumber value={streak.count} style={styles.statusValue} />
            </View>
            <View style={styles.statusPill}>
              {/* The mark itself, not a ✦ standing in for it. At 15px it is
                  under the kit's 16px icon floor, so it renders at micro
                  detail — star and pivot, no ring — which is exactly what that
                  rule is for. */}
              <CompassMark size={16} tone={colors.brass} />
              <AnimatedNumber value={progress.xp} style={styles.statusValue} />
              <Text style={styles.statusUnit}>XP</Text>
            </View>
            {streak.freezes > 0 && (
              <View style={styles.statusPill}>
                <Text style={styles.statusGlyph}>❄️</Text>
                <Text style={styles.statusValue}>{streak.freezes}</Text>
              </View>
            )}
          </View>
        </FadeInUp>

        {/* Wordmark + streak nudge — one group: they're the page's identity and
            its call-back, and splitting them would stagger two lines of text. */}
        <FadeInUp index={1}>
          <View style={styles.brandRow}>
            {/* The real lockup — mark plus two-tone name — rather than the
                name alone. Every brand rule it has to keep (Newsreader 600,
                "World" in pine and "wise" in lakewater, tracking, clear space
                at 0.5x the mark, the 28px floor) now lives in one component
                instead of being retyped here and in the rail. */}
            <Wordmark size={34} />
            <Text style={styles.brandTag}>geography</Text>
          </View>
          <Text style={styles.tagline}>Learn the world through curiosity.</Text>

          <View style={styles.streakBanner}>
            <Text style={styles.streakMsg}>{streakMsg}</Text>
            <Text style={styles.streakBest}>
              Best round {progress.bestScore ? `${progress.bestScore}/8` : "—"}
            </Text>
          </View>
        </FadeInUp>

        {/* The world, before the games.
            Home used to open on a grid of buttons, which is a fine games menu
            and a poor front door for a product whose premise is that maps are
            the hero. This is the same globe as the Explore tab — same gestures,
            same terrain, same tap-to-open — not a picture of one. */}
        {onOpenCountry && (
          <FadeInUp index={2}>
            <Text style={styles.section}>The world</Text>
            <GlobeCard
              onOpenCountry={onOpenCountry}
              onOpenExplore={onOpenExplore}
              basemap={basemap}
              onChangeBasemap={onChangeBasemap}
            />
          </FadeInUp>
        )}

        {/* Today */}
        <FadeInUp index={3}>
          <Text style={styles.section}>Today</Text>
          {/* The kit's dusk wash — brass and ember falling from the top right
              over a pine-to-nightwood ramp, and "the only sanctioned gradient
              in the system". The Daily card is the one hero on Home, so it is
              the one place on this screen that earns it: a lit panel on a paper
              page is exactly the two-material composition the kit permits.

              The flat pine fill it replaces was correct and inert. This is the
              same colour with a light source. */}
          <PressableTint
            tone="dark"
            radius={radius.sheet}
            onPress={() => onPlay(FEATURED, difficulty, timed)}
            style={styles.heroCard}
            accessibilityRole="button"
            accessibilityLabel={`Daily challenge — ${featured.title}`}
          >
            <Material name="dusk" />
            {/* The instrument, oversized and bleeding off the corner the light
                comes from. Brass on nightwood, well under the "5% firelight"
                budget, and the reason the card reads as an artefact rather than
                as a coloured rectangle. */}
            <CompassMark size={190} tone="brass" style={styles.heroMark} />

            {/* Brass, not parchment-at-70%. The old kicker carried an alpha,
                which over a gradient has no knowable contrast ratio at all —
                the one rule the kit repeats twice. A brass eyebrow on a dark
                ground is its own sanctioned pattern (kit §DIVE DEEPER CARD). */}
            <Text style={styles.heroKicker}>Daily challenge</Text>
            <Text style={styles.heroTitle}>
              {featured.icon} A mixed round,{"\n"}every day
            </Text>
            <View style={styles.heroCta}>
              <Text style={styles.heroCtaText}>PLAY</Text>
            </View>
          </PressableTint>
        </FadeInUp>

        {/* Games */}
        <Text style={styles.section}>All games</Text>
        <View style={styles.grid}>
          {GAME_GRID.map((key, i) => {
            const m = MODES[key];
            // Kept as a seam rather than deleted: the next unbuilt game gets a
            // badged, honest tile for free instead of a tile that launches a
            // round with no answer surface. No mode sets it today.
            const soon = Boolean(m.comingSoon);
            return (
              <FadeInUp key={key} style={styles.tileCell} delay={TILE_BASE_DELAY + staggerDelay(i)}>
                {/* PressableTint, not Pressable: the kit gives touch a 120ms
                    pressed tint and pointer devices a hover lift, and forbids a
                    scale bounce outright. These tiles previously had no press
                    feedback at all. */}
                <PressableTint
                  onPress={soon ? undefined : () => onPlay(key, difficulty, timed)}
                  disabled={soon}
                  radius={radius.sheet}
                  style={[styles.tile, soon && styles.tileSoon]}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: soon }}
                  accessibilityLabel={soon ? `${m.title} — coming soon` : m.title}
                >
                  <View style={styles.tileTop}>
                    <View style={[styles.tileIcon, { backgroundColor: m.accent }]}>
                      <Text style={[styles.tileGlyph, { color: onFill(m.accent) }]}>{m.icon}</Text>
                    </View>
                    {/* Cosmetic this pass: every account is pro, so the badge
                        marks what WILL cost rather than what is locked, and the
                        tile stays fully playable. */}
                    {isProMode(key) && (
                      <View style={styles.proBadge}>
                        <Text style={styles.proBadgeText}>PRO</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.tileTitle}>{m.title}</Text>
                  <Text style={styles.tileBlurb}>{soon ? "Coming soon" : m.blurb}</Text>
                </PressableTint>
              </FadeInUp>
            );
          })}
        </View>

        {/* M2.12 step 2: the pool-difficulty segmented control used to live
            here. It is retired from the primary flow rather than deleted —
            each game now asks for its INTERACTION tier on its own menu, and
            two "Difficulty" controls meaning different things on one screen is
            exactly the confusion the two axes were separated to avoid. The
            pool filter still exists (constants.js) and is still what the Daily
            and the learning paths lean on; buildRound still accepts it. */}

        {/* Timed mode */}
        <Text style={styles.section}>Options</Text>
        <Pressable
          onPress={() => setTimed((t) => !t)}
          style={[styles.toggle, timed && styles.toggleActive]}
        >
          <Text style={[styles.toggleText, timed && styles.toggleTextActive]}>⏱ Timed mode</Text>
          <View style={[styles.toggleState, timed && styles.toggleStateActive]}>
            <Text style={[styles.toggleStateText, timed && styles.toggleStateTextActive]}>
              {timed ? "ON" : "OFF"}
            </Text>
          </View>
        </Pressable>
        <Text style={styles.hint}>10s per question — not applied to Daily.</Text>

        <Text style={styles.footer}>Slickrock Studio · Phase 1 prototype</Text>
      </Container>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Transparent: AppChrome owns the page ground (the kit's paper fibre).
  wrap: { flex: 1, backgroundColor: "transparent" },
  content: { padding: spacing(5), paddingTop: spacing(6), paddingBottom: spacing(12) },

  statusRow: { flexDirection: "row", gap: spacing(2), marginBottom: spacing(6) },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(1.5),
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.pill,
    paddingVertical: spacing(1.5),
    paddingHorizontal: spacing(3),
    ...elevation(1),
  },
  statusGlyph: { fontSize: 15 },
  statusValue: { ...type.h3, fontSize: 16 },
  statusUnit: { ...type.label, fontSize: 10, color: colors.textMuted, letterSpacing: 1 },

  brandRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  // emberInk, not lakewater: this sits on parchment, where lakewater is
  // large-text-only (4.28:1) and this is 15px.
  brandTag: { ...type.label, fontSize: 15, color: colors.emberInk, letterSpacing: -0.2 },
  tagline: { ...type.caption, fontSize: 15, marginTop: spacing(1), marginBottom: spacing(5) },

  streakBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing(3),
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.sheet,
    paddingVertical: spacing(3.5),
    paddingHorizontal: spacing(4),
    marginBottom: spacing(7),
    ...hairline,
    ...elevation(1),
  },
  streakMsg: { ...type.body, flexShrink: 1, color: colors.text },
  streakBest: {
    ...type.label,
    fontSize: 11,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },

  section: { ...type.eyebrow, marginBottom: spacing(3) },
  hint: { ...type.caption, fontSize: 12, marginTop: spacing(2.5), marginBottom: spacing(6) },

  heroCard: {
    borderRadius: radius.sheet,
    padding: spacing(5),
    marginBottom: spacing(7),
    // Clips the wash, the oversized mark and the press tint to the card.
    overflow: "hidden",
    backgroundColor: colors.brand,
    ...elevation(2),
  },
  heroMark: {
    position: "absolute",
    top: -46,
    right: -52,
    opacity: 0.16,
  },
  heroKicker: {
    ...type.eyebrow,
    color: colors.brass,
  },
  heroTitle: {
    ...type.h2,
    fontSize: 26,
    color: colors.onFill,
    lineHeight: 32,
    marginTop: spacing(1.5),
    marginBottom: spacing(4),
  },
  heroCta: {
    alignSelf: "flex-start",
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.pill,
    height: buttonHeight.md,
    justifyContent: "center",
    paddingHorizontal: spacing(7),
  },
  heroCtaText: { ...type.label, fontSize: 14, color: colors.brand, letterSpacing: 1.2 },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: spacing(4),
  },
  // The FadeInUp wrapper is the flex item now, so the cell owns the grid
  // geometry and the Pressable just fills it. Keeping width on the Pressable
  // would size it against the wrapper instead of the grid and break the row.
  tileCell: { width: "48.5%", marginBottom: spacing(4) },
  tile: {
    width: "100%",
    height: "100%",
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.sheet,
    padding: spacing(5),
    minHeight: 132,
    overflow: "hidden",
    ...hairline,
    ...elevation(1),
  },
  // The icon row. The badge is pinned opposite the glyph rather than beside
  // it, so a two-line title underneath can never push it around.
  tileTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: spacing(3),
  },
  tileIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.card,
    alignItems: "center",
    justifyContent: "center",
  },
  // PRO badge. Two kit rules decide every value here:
  //   · Brass is DECORATIVE ONLY — 1.9:1 on parchment — so the word cannot be
  //     brass type, and a parchment label on a brass fill is no better. The
  //     badge is emberInk type on a tinted ground, the same pairing every
  //     warm label in this app uses.
  //   · `type.eyebrow` is already the structural voice for a small mono
  //     all-caps marker, so this borrows it wholesale instead of inventing an
  //     11px mono style beside it. Tracking comes down slightly: eyebrow
  //     tracking is tuned for a word in open space, not inside a pill.
  proBadge: {
    backgroundColor: colors.emberSurface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing(2),
    paddingVertical: 3,
  },
  proBadgeText: { ...type.eyebrow, fontSize: 10, letterSpacing: 0.9, lineHeight: 13 },
  // Quieted, not greyed: the kit has no disabled grey, and the tile still has
  // to read as a real game that is on its way rather than as broken chrome.
  tileSoon: { opacity: 0.68 },
  tileGlyph: { fontSize: 20 },
  tileTitle: { ...type.h3, fontSize: 16 },
  tileBlurb: { ...type.caption, fontSize: 12, marginTop: 2, lineHeight: 16 },

  toggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.sheet,
    paddingVertical: spacing(3.5),
    paddingHorizontal: spacing(4),
    ...elevation(1),
  },
  toggleActive: { backgroundColor: colors.brand },
  toggleText: { ...type.body, color: colors.text },
  toggleTextActive: { color: colors.onFill },
  toggleState: {
    backgroundColor: colors.surfaceSunken,
    borderRadius: radius.pill,
    paddingVertical: spacing(1),
    paddingHorizontal: spacing(2.5),
  },
  toggleStateActive: { backgroundColor: colors.brandDeep },
  toggleStateText: { ...type.label, fontSize: 11, color: colors.textMuted, letterSpacing: 1 },
  toggleStateTextActive: { color: colors.brand },

  footer: {
    ...type.label,
    fontSize: 11,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing(2),
    letterSpacing: 1,
    textTransform: "uppercase",
  },
});
