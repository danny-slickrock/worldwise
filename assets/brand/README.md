# Brand artwork — reference only

These are the supplied files from **Worldwise Brand Identity Kit v3**. Nothing in
`src/` imports them, and nothing should.

The kit's own handoff note is why:

> Logo artwork is raster-traced. `assets/worldwise-icon*.png` were extracted from
> supplied artwork; edges soften above ~150px. Commission or produce a true SVG
> before shipping app icons and marketing. Until then use the PNGs at or below 150px.

That vector redraw is `src/game/brandMark.js` — the mark expressed as geometry,
rendered live by `src/components/CompassMark.js` and rasterized into the platform
icons by `scripts/build-brand-assets.js` (`npm run build:brand`). One source, so
the icon on a home screen and the mark spinning in a loader are provably the same
shape.

Keep these here as the visual reference the redraw is checked against, and as the
record of what was supplied:

| File | What it is |
| --- | --- |
| `worldwise-icon-pine.png` | Mark, one-colour pine — the primary positive mark |
| `worldwise-icon-cream.png` | Mark, parchment knockout — pine/nightwood grounds and the app icon |
| `worldwise-icon-brass.png` | Mark, brass — nightwood grounds where the mark should read as gilt |
| `worldwise-logo-supplied.png` | The original supplied lockup, in the superseded cool palette |

The supplied lockup is v1-era navy-and-teal. The live lockup is
`src/components/Wordmark.js`, which follows the v3 rule: "World" in pine, "wise"
in lakewater, Newsreader 600.
