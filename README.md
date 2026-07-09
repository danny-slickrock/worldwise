# Worldwise — Phase 1 Prototype

Geography learning games for web, iOS, and Android — the flagship product of **Slickrock Studio**.
Built with **Expo** (React Native + React Native Web) so a single codebase runs everywhere.

> Phase 1 goal: the best geography *games*. Structured learning, classrooms, and AI come in later phases.

## What's in this prototype

- **Home hub** with XP, day streak, and best-round stats
- **Flag Guesser** — identify the country from its flag
- **Capital Quiz** — name the capital of a given country
- **Shape Guesser** — identify the country from its outline
- **Daily Challenge** — a mixed, deterministic round that's the same for everyone each day
- A curated 40-country dataset and a reusable multiple-choice quiz engine
- Premium, map-first visual design (deep navy, teal, warm off-white)

Flag images come from [flagcdn.com](https://flagcdn.com) and country outlines from the
[mapsicon](https://github.com/djaiss/mapsicon) project, both loaded at runtime — so the app stays light.

## Run it

Requires Node 18+.

```bash
cd worldwise
npm install

# Web (opens in your browser)
npm run web

# iOS / Android via Expo Go (scan the QR code)
npm start
```

If Expo prompts to install a matching `react-native-svg`, run `npx expo install react-native-svg`.

## Project structure

```
worldwise/
├─ App.js                     # App shell + lightweight navigation + progress state
├─ app.json                   # Expo config
├─ src/
│  ├─ theme.js                # Design tokens (colors, spacing, type)
│  ├─ data/countries.js       # Country dataset + flag/outline URL helpers
│  ├─ game/questions.js       # Quiz engine: buildRound() + buildDaily()
│  ├─ components/QuizScreen.js# Reusable quiz surface for every game mode
│  └─ screens/HomeScreen.js   # Game hub
└─ ROADMAP.md                 # The two-week build plan
```

## Pushing to GitHub

Once you've created an empty repo on GitHub (e.g. `worldwise`):

```bash
cd worldwise
git init
git add .
git commit -m "Phase 1 prototype: home + flag, capital, shape games + daily challenge"
git branch -M main
git remote add origin https://github.com/<your-username>/worldwise.git
git push -u origin main
```

After the GitHub connector is authorized in Cowork, the daily build task can commit and push
each morning automatically — see `ROADMAP.md`.

## Roadmap

See [ROADMAP.md](./ROADMAP.md) for the 14-day plan.
