# Handoff: Worldwise — brand identity + UI foundations

## Overview
Worldwise is a premium geography learning app by Slickrock Studio: map-first, curiosity-led,
free to play with a subscription "Dive Deeper" tier. This bundle contains the brand identity
(logo suite, colour, type, iconography, voice) and the UI foundations needed to start building
the product: tokens, component specs with states, key screen patterns, and the accessibility
and content contracts.

## About the design files
The `.dc.html` files in this bundle are **design references authored in HTML** — prototypes
that show intended look, structure and behaviour. They are **not production code to copy**.
The task is to **recreate these designs in the target codebase's own environment** (React,
React Native, SwiftUI, Vue, etc.) using its established patterns, component library and
routing. If no environment exists yet, choose the framework that fits the product (a map-heavy
mobile-first app: React Native + MapLibre, or React + MapLibre/Mapbox GL for web) and build the
token layer first from `tokens.css` / `tokens.json` / `tailwind.config.js`.

## Fidelity
**High fidelity.** Colours, type, spacing, radii, shadows and motion values are final and
tokenised. Recreate them exactly. Two caveats:

1. **Logo artwork is raster-traced.** `assets/worldwise-icon*.png` were extracted from
   supplied artwork; edges soften above ~150px. Commission or produce a true SVG before
   shipping app icons and marketing. Until then use the PNGs at or below 150px.
2. **Striped placeholders** in the guides mark where real map renders and photography go.
   They are intentional gaps, not designs.

## Files in this bundle
| File | What it is |
| --- | --- |
| `Worldwise Brand Guide.dc.html` | Brand guide: logo suite, app icon, colour, type, iconography, voice, brand-in-use mockups |
| `Worldwise UI Kit.dc.html` | Implementation reference: tokens, buttons/inputs/badges, cards, map screen, five screen states, a11y + content contracts |
| `tokens.css` | CSS custom properties — the source of truth for values |
| `tokens.json` | Same values, machine-readable (for RN / Swift / codegen) |
| `tailwind.config.js` | Tailwind theme extension |
| `assets/worldwise-icon-pine.png` | Mark, one-colour pine — the primary positive mark |
| `assets/worldwise-icon-cream.png` | Mark, parchment knockout — for pine/nightwood grounds and the app icon |
| `assets/worldwise-icon-brass.png` | Mark, brass — for nightwood grounds where the mark should read as gilt |
| `assets/worldwise-icon.png` `-light.png` `-navy.png` | Superseded cool-palette versions, kept for reference |
| `assets/worldwise-logo-supplied.png` | Original supplied lockup (reference for a future vector redraw) |

Open either `.dc.html` directly in a browser.

## Palette intent
The identity reads as a cartography room after dark: deep pine walls, brass instrument
fittings, lantern light on aged paper. Everything is warm-biased — even the shadows use
`rgba(42,35,32,…)`, never neutral grey. Cool colour appears only as lakewater, and only where
something is live: water, routes, links, interactive state.

## Materials
Three composite backgrounds carry the cozy, and they are tokens like any other — see
`--ww-dusk`, `--ww-walnut`, `--ww-paper` (plus `--ww-dusk-deep`, `--ww-pine-grain`,
`--ww-lantern`) in `tokens.css`. Apply as a `background` shorthand; the layers already end
in their own base colour where one is needed.

- **Dusk wash** (`--ww-dusk`) — brass 30% and ember 26% falling from the top-right over a
  pine-to-nightwood ramp. The only sanctioned gradient in the system. Light enters from **one**
  corner; never two, never centred. Use on the cover, marketing hero, feature graphic, and dark
  panels. `--ww-dusk-deep` is the same wash on a darker ramp, for panels inside a lit page.
- **Walnut desk** (`--ww-walnut`) — horizontal grain built from five non-multiple stripe periods
  (9 / 17 / 29 / 43 / 97px, the last supplying figure) beaten against each other, so it reads as figure rather than corduroy
  and never tiles visibly, with a lantern glow from the upper left. Only ever the ground
  *beneath* a device, card or artefact. Never behind type.
- **Paper fibre** (`--ww-paper`) — a 3–4px weave at ~3% ink plus a brass wash from the top edge.
  The default page ground. Cards sit on it in flat cream (`--ww-surface-raised`) so the texture
  reads as paper rather than noise.
- **Pine grain** (`--ww-pine-grain`) — the wall equivalent: vertical-stripe grain in nightwood
  with a 4.5% brass fleck. Layer *over* a dark base or over `--ww-dusk-deep`.

Rules: at most two materials visible in one composition (a lit page + one desk, or a dusk panel +
paper page). Texture never sits behind body copy — it belongs to grounds, panels and mockup
surfaces. **Type on materials never carries alpha.** An alpha tint over a gradient-plus-grain composite has
no knowable contrast ratio — inside the dusk wash's lit corner the ground reaches L≈0.12, where a
0.65-alpha parchment label lands at ≈3.3:1. So there are exactly two inks on dark:
`--ww-on-brand` (#F4EBD9, ≈4.7:1 even on the lit corner, ≈12:1 on nightwood) at any size, and
`--ww-on-brand-quiet` (#C9BFA8), whose floor depends on the ground beneath it:

| Lichen on | Measures | Minimum size |
| --- | --- | --- |
| solid nightwood `#16292A` | 8.3:1 | 14px |
| solid pine `#21403C` | 6.2:1 | 14px |
| dusk wash / pine grain | 3.4:1 worst case (lit corner) | 16px |

Over any material, treat lichen as large-text-only; on the two flat brand colours it is safe for
secondary body copy. Hierarchy on dark comes from size, case
and the mono/serif switch — never from opacity. The same applies to dark-on-light labels: use
solid `--ww-brand`, not a brand alpha, on brass and other accent grounds.

## Brand rules an engineer must not break
- **Wordmark** is set in Newsreader 600, tracking -0.01em, two-tone: `World` in `--ww-brand`,
  `wise` in `--ww-accent` (on dark: `--ww-on-brand` + `--ww-accent-light`). Never one flat colour,
  never another typeface, never stretched. The serif wants air — never tighten past -0.012em.
- **Clear space** around the lockup: 0.5x the mark height, measured from the star points.
- **Minimum sizes**: lockup 28px mark height; icon 16px. Below 32px use the simplified
  compass (star + ring + centre dot) — do not downscale the detailed artwork.
- **App icon**: parchment knockout mark on `--ww-brand`, artwork at 74% of canvas, platform
  squircle, no badges, no gradients, no seasonal variants.
- **Colour proportion**: ~70% parchment, ~25% pine, ~5% firelight. Materials do not change the
  ratio — the dusk wash counts as pine, the desk as an accent surface. One warm accent per screen.
  Ember and brass appear as line, rule and texture far more often than as fill.
  Brass is decorative only — never a text colour on light backgrounds.

## Typography
| Role | Family | Size / weight | Tracking | Line-height |
| --- | --- | --- | --- | --- |
| Display | Newsreader | 60 / 500 | -1.2% | 1.06 |
| H1 | Newsreader | 40 / 500 | -0.6% | 1.14 |
| H2 | Newsreader | 28 / 600 | -0.4% | 1.22 |
| H3 | Newsreader | 21 / 600 | — | 1.25 |
| Body L | Instrument Sans | 18 / 400 | — | 1.65 |
| Body | Instrument Sans | 15 / 400 | — | 1.6 |
| Label | Instrument Sans | 13 / 600 | — | 1.4 |
| Eyebrow / data | IBM Plex Mono | 11 / 500 uppercase | 12% | 1.4 |

On dark grounds every one of these rows is set solid — see Materials for the two permitted inks.

Display and H1 are weight **500**; H2 and below are 600. The wordmark is the single exception —
Newsreader **600** — because a logotype needs presence the headline scale does not.

Body measure caps at 68 characters. Sentence case everywhere except mono eyebrows.
Newsreader is never used below 17px — below that the serif detail muddies; drop to Instrument Sans.

## Components — specs
All values reference tokens. Heights are fixed; padding adjusts with size.

### Button
- Sizes: `sm` 32h / 13px / 8x14 padding / radius 6 · `md` 44h / 14px / 12x20 / radius 8 ·
  `lg` 56h / 16px / 16x28 / radius 8. Icon-only: square at the same height, always `aria-label`.
- Variants: **primary** `--ww-brand` fill, `--ww-on-brand` text · **secondary** 1.5px
  `--ww-brand` outline, transparent fill · **tertiary** text-only in `--ww-accent` ·
  **premium** `--ww-brass` fill with `--ww-brand-deep` text (subscription actions only).
- States: hover primary → `--ww-brand-deep` + `--ww-e2`; secondary → 6% brand tint;
  tertiary → brand text + 1.5px underline; premium → `--ww-ember` fill, `--ww-on-brand` text.
  Focus → 2px `--ww-accent` ring at 2px offset (all variants). Disabled → 28% opacity fill,
  no shadow, `cursor:not-allowed`, still focusable for screen readers.
- Transition: `background-color`, `box-shadow` at `--ww-dur-ui` `--ww-ease`. No scale bounce.

### Input / search
- Search: pill (`--ww-radius-pill`), 44h, 1.5px `--ww-border-strong`, leading 18px magnifier
  in `--ww-text-muted`; focus → 1.5px `--ww-accent` + 3px `rgba(46,110,126,.15)` glow.
- Text field: radius 8, 44h, label 13/600 in `--ww-brand` above the field, 7px gap.
  Error → 1.5px `--ww-danger` border and 13px `--ww-danger` helper text below; error copy
  always says what to do next, never just "invalid".
- Placeholder `--ww-text-faint`. Never placeholder-as-label.

### Toggle / chip
- Toggle 44x26 pill, knob 20px white, on = `--ww-success`, off = `rgba(31,58,95,.2)`, 120ms.
- Chip 32h pill, 13/600; selected = `--ww-brand` fill + `--ww-on-brand`; unselected = white +
  1px `--ww-border-strong`. Selected chips sort to the front of the row.

### Badge
Mono 10.5px uppercase, 12% tracking, radius 4, 6x10 padding.
`Correct` = success fill · `Not quite` = danger fill · `Premium` = brass fill with nightwood text ·
`Free` = 9% brand tint with brand text · `New` = accent outline.

### Card
Radius 8, `--ww-surface-raised`, 1px `--ww-border`, `--ww-e1`; hover `--ww-e2` and a 1px
`--ww-accent` border. Padding 20 mobile / 24 desktop. Three types:
- **Place card** — 16:10 image, mono eyebrow (type · country), H3 title, 2-line body, footer with
  `Explore` link and Free/Premium badge.
- **Question card** — mono eyebrow + countdown, H3 question, answer rows (radius 8, 1.5px border);
  correct = success border + 8% success fill; wrong = danger border at 50% + 6% fill; unpicked stay
  neutral. Footer link "Why does that matter?".
- **Dive Deeper card** — `--ww-brand-deep` fill with the brass graticule at 18% opacity, brass
  eyebrow, parchment title, premium button.

### Progress / streak
8px pill track `rgba(31,58,95,.12)`, fill `--ww-success`, animate width at `--ww-dur-ui`.
Streak uses the four-point compass star glyph in `--ww-ember`. Always pair a number with a word
("9-day streak") — never a bare icon count.

### Toast
Radius 10, `--ww-brand-deep` fill, `--ww-e3`, 14.5px parchment text, optional brass action word.
Bottom-centre, 4s, slide+fade 200ms. Errors use a white surface with a danger-tinted border.
One toast at a time; a second replaces the first.

## Screen patterns

### Map screen (the product's home)
- **Layers**: ocean `--ww-brand-deep`; land `--ww-brand` at 88%; borders 1px `--ww-brass` at 35%,
  dashed for disputed; labels IBM Plex Mono 11px, 12% tracking, parchment on a 72% nightwood plate.
- **Markers**: selected place = 15px `--ww-ember` dot with a 7px halo at 22%; related places =
  13px `--ww-accent` diamond (45deg square) with a 6px halo. No teardrop pins, no drop shadows.
- **Chrome** (z 10): floating search pill top-left with a 42px circular action button top-right,
  both on a 96%-opacity `--ww-surface` with `--ww-e2`, 16px inset.
- **Bottom sheet** (z 20): radius 14 top corners, three stops — peek 132px, half 50vh, full 92vh;
  drag handle 44x4 pill. Content: mono coordinates, H2 place name, body summary, primary
  `Explore` + premium `Dive deeper`. At half, at least 40% of the map stays visible.
- **Camera**: fly-to 600ms `--ww-ease`; no bounce; reduced-motion → instant cut.

### Bottom navigation
4 tabs max (Explore · Games · Atlas · You), 56h + safe area, labels always visible at 10/600,
active tab `--ww-brand` with a filled icon, inactive `--ww-text-faint` outline icon.

### Five states — required on every screen
1. **Loading** — skeleton blocks at 10% brand tint; no spinners under 1s.
2. **Empty** — simplified mark, one warm sentence, one action.
3. **Error** — plain-language cause, `Try again` secondary button, never a code.
4. **Offline** — inline banner (not a blocking modal); downloaded regions stay usable.
5. **Paywalled** — states the free promise first ("Games stay free, always"), then the upgrade.

## Interactions & motion
- Durations: 120ms micro (toggles, hover), 200ms UI (buttons, progress, toasts),
  320ms sheets, 600ms map fly-to. Easing `cubic-bezier(.2,.7,.2,1)` throughout.
- Hover only on pointer devices (`@media (hover:hover)`); touch uses a 120ms pressed tint.
- Answer feedback: colour + icon + copy simultaneously, 200ms; no confetti, no shake.
- Honour `prefers-reduced-motion`: fly-to becomes a cut, sheets fade instead of sliding,
  progress jumps instead of animating.

## State management (suggested shape)
- `session`: auth user, subscription tier (`free` | `premium`), locale, units, reduced-motion.
- `map`: viewport (centre, zoom, bearing), selectedPlaceId, relatedPlaceIds, sheetStop.
- `game`: questionId, options, chosenId, result, streakCount, dailyCompletedAt.
- `atlas`: savedPlaceIds, downloadedRegionIds, syncQueue (for offline writes).
- `diveDeeper`: threadId, messages, streaming flag, citations, quota state for free users.
Data: place metadata and geometry are cacheable and offline-first; Dive Deeper answers are
streamed and always carry citations. Never block the map render on network.

## Accessibility contract
- Body text ≥ 4.5:1, large text and UI ≥ 3:1. **Check both light grounds** — cream #FBF6EA and
  parchment #F4EBD9 differ by roughly half a stop, and small type sits on both.

| Ink | on cream | on parchment | Use |
| --- | --- | --- | --- |
| pine `#21403C` | 10.2 | 9.3 | anything |
| bark ink `#2A2320` | 13.6 | 12.5 | body |
| secondary `#4A4038` | 8.1 | 7.4 | body |
| muted `#635547` | 6.6 | 6.0 | labels, captions |
| faint `#756654` | 5.2 | 4.7 | data, hex values, hints |
| ember-ink `#9A5225` | 5.3 | 4.9 | eyebrows, all warm type |
| lakewater `#2E7A72` | 4.8 | 4.4 | links on cream; large only on parchment |
| ember `#B0602C` | 4.3 | 3.9 | **fills, rules, terrain — not type** |
| success `#4A8C4A` | 3.7 | 3.4 | fills, icons; `-ink` #35703A when it carries type |
| brass `#D8A44A` | 2.0 | 1.9 | decorative only |

Disabled controls are the one exemption (WCAG 1.4.3 excludes inactive components) — the kit's
disabled button samples measure ~1.5:1 by design, because that is what disabled looks like.
- Never colour alone — pair with icon and copy.
- Focus visible everywhere: 2px `--ww-accent` ring, 2px offset.
- The map has a list equivalent; every marker is keyboard-reachable and labelled.
- Dynamic type to 200% without clipping; no fixed-height text containers.
- Touch targets ≥ 44x44.

## Content rules
- Place names in the local endonym plus an English gloss when they differ.
- Metric first; imperial in parentheses where the locale expects it.
- Coordinates: mono, 4 decimals, degree symbol, N/S/E/W.
- Every Dive Deeper answer cites a source; no unsourced claims in UI copy.
- Disputed borders render dashed and are never labelled with a verdict.
- Truncate at word boundaries with an ellipsis, never mid-word.

## Voice for UI copy
Curious, warm, clear, grounded. Open with the question, answer plainly, cite the source.
Yes: "Why does one river feed four countries?" · "Not quite — it's Malta. Small island, very
busy sea lane. Here's why." · "Games stay free, always."
No: "Master all 195 countries today!!" · "Oops! You got that wrong, buddy." · "Everyone should
care about this crisis." · "Leverage geospatial literacy outcomes."

## Fonts
Newsreader, Instrument Sans and IBM Plex Mono are all open-licence (SIL OFL) and available on
Google Fonts. Self-host the woff2 subsets in production; load weights 400/500/600 only.
Newsreader is a variable optical-size font — bind `opsz` to the rendered size (`font-optical-sizing:auto`)
so display sizes get the finer, more engraved cut.
