// PURE navigation core — no React, no react-native, no browser APIs.
//
// This replaces the hand-rolled `returnTo` / `returnPathId` breadcrumb that
// App.js carried through M2.2–M2.4. That approach stored *one* step of history
// on the destination's own state, which meant it could only ever describe a
// single hop: Learning Path → Country → Play → exit dropped you on Home, and a
// country opened from a finished round's review had nowhere to go back to at
// all. A stack fixes the whole class of bug rather than one more hop of it.
//
// The model is the one Duolingo and every native tab app use, and it is worth
// stating because it explains every function below:
//
//   * There are four TABS. Each owns its OWN stack, and switching tabs
//     preserves the other stacks. Wander three screens deep into Explore, tap
//     Learn, tap Explore again — you are back where you left off, not at the
//     root. Tab state that survives a detour is most of what "not clunky"
//     means here.
//   * Everything else is a route PUSHED onto the active tab's stack.
//   * `back()` pops. At a tab root there is nothing to pop, which is exactly
//     when a Back affordance should not be drawn (see `canGoBack`).
//
// Kept pure so test/engine.test.js can drive whole journeys — push, switch,
// pop, deep-link — without a renderer. The React side (App.js) holds one
// `nav` object in state and calls these; the web-history IO lives apart in
// src/lib/history.js, same pure/IO split as cloudSync ⇄ cloudProgress.
import { DEFAULT_DIFFICULTY } from "../constants";

// The four destinations. Ordered as they render, left→right in the mobile bar
// and top→bottom in the desktop rail — one source of truth for both, so the
// two chrome variants can never drift apart.
//
// Home is play (daily + the game grid), Learn is the mastery paths, Explore is
// the globe and the country index. Before this, Learn and Explore were tiles
// buried inside Home's grid: two taps and a full-screen takeover away, with no
// way back except unwinding. Promoting them is the point of the change.
// Glyphs are monoline, matching the kit's iconography (graticule, compass
// point, plotted point) — never emoji, which arrive full-colour and drag a
// second, un-branded palette onto the screen.
export const TABS = [
  { key: "home", label: "Home", icon: "◈" },
  { key: "learn", label: "Learn", icon: "◎" },
  { key: "explore", label: "Explore", icon: "⊕" },
  { key: "profile", label: "Profile", icon: "◍" },
];

export const TAB_KEYS = TABS.map((t) => t.key);
export const DEFAULT_TAB = "home";

// Route table. `tab` is the owning tab — it only decides where a *deep link*
// lands (and therefore what sits underneath it in the stack); a route pushed
// during normal use goes onto whichever stack is active, so a country page
// opened from a learning path stays inside Learn.
//
// `chrome: false` is the focus mode: the quiz hides the tab bar/rail entirely,
// because a round in progress should have exactly one way out (its own ✕) and
// no invitation to wander off mid-question. Every other route keeps the
// persistent nav, which is the other half of the fix — a country page used to
// be a full takeover with no tabs at all.
export const ROUTES = {
  home: { tab: "home", root: true, chrome: true },
  learn: { tab: "learn", root: true, chrome: true },
  explore: { tab: "explore", root: true, chrome: true },
  profile: { tab: "profile", root: true, chrome: true },
  country: { tab: "explore", root: false, chrome: true },
  countryIndex: { tab: "explore", root: false, chrome: true },
  interests: { tab: "profile", root: false, chrome: true },
  quiz: { tab: "home", root: false, chrome: false },
};

// A stack can't grow forever. Bouncing country → map → country → map is a
// perfectly reasonable thing to do for a few minutes, and without a cap that
// is an unbounded array of live route objects. Oldest-above-root is dropped,
// so the root always survives and Back always terminates.
export const MAX_STACK_DEPTH = 16;

export function isTab(key) {
  return TAB_KEYS.includes(key);
}

// The bottom of each tab's stack. Params are null rather than filled in here:
// `/learn` with no path id is a legitimate URL, and letting the screen pick its
// own default keeps navigation.js from importing the learning-path dataset just
// to know which region comes first.
export function rootRoute(tab) {
  switch (tab) {
    case "learn":
      return { name: "learn", pathId: null };
    case "explore":
      return { name: "explore", focusCountry: null };
    case "profile":
      return { name: "profile" };
    default:
      return { name: "home" };
  }
}

export function initialNav(tab = DEFAULT_TAB) {
  const active = isTab(tab) ? tab : DEFAULT_TAB;
  const stacks = {};
  for (const key of TAB_KEYS) stacks[key] = [rootRoute(key)];
  return { tab: active, stacks };
}

export function currentStack(nav) {
  return nav.stacks[nav.tab] ?? [rootRoute(DEFAULT_TAB)];
}

export function currentRoute(nav) {
  const stack = currentStack(nav);
  return stack[stack.length - 1];
}

export function stackDepth(nav) {
  return currentStack(nav).length;
}

// Back is drawable only when there is something under you *in this tab*.
// Switching tabs is not "back" — it never pops, so a Back button on a tab root
// would be a button that does nothing.
export function canGoBack(nav) {
  return stackDepth(nav) > 1;
}

export function showsChrome(nav) {
  return ROUTES[currentRoute(nav).name]?.chrome !== false;
}

// Same route twice in a row is a no-op. Double-tapping a country in the index
// (or a fast double-click on web, where a Pressable can fire twice) should not
// stack two identical pages that then need two Backs to escape.
function sameRoute(a, b) {
  if (!a || !b || a.name !== b.name) return false;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    if ((a[k] ?? null) !== (b[k] ?? null)) return false;
  }
  return true;
}

function withStack(nav, tab, stack) {
  return { tab, stacks: { ...nav.stacks, [tab]: stack } };
}

// Trim from index 1 up, never index 0 — the root is what makes Back terminate.
function capped(stack) {
  if (stack.length <= MAX_STACK_DEPTH) return stack;
  return [stack[0], ...stack.slice(stack.length - (MAX_STACK_DEPTH - 1))];
}

// Pushing a tab ROOT is a tab switch, not a push. This matters because the
// same call sites are reached both ways: the World Map's region pills open a
// learning path (`navigate`), and so does the Learn tab (`switchTab`). Routing
// both through one rule means a "learn" route can never end up stacked on top
// of the Learn tab's own root, which would render the identical screen twice
// with a Back button between them.
export function navigate(nav, route) {
  if (!route || !ROUTES[route.name]) return nav;
  if (ROUTES[route.name].root) return switchTab(nav, ROUTES[route.name].tab, route);
  const stack = currentStack(nav);
  if (sameRoute(stack[stack.length - 1], route)) return nav;
  return withStack(nav, nav.tab, capped([...stack, route]));
}

// Swap the top of the stack without deepening it. Used where one surface
// re-aims itself rather than opening a new one — switching regions on the
// learning path, or spinning the globe to a country — so Back still means
// "leave this surface", not "undo my last pill tap".
export function replace(nav, route) {
  if (!route || !ROUTES[route.name]) return nav;
  const stack = currentStack(nav);
  return withStack(nav, nav.tab, [...stack.slice(0, -1), route]);
}

export function back(nav) {
  const stack = currentStack(nav);
  if (stack.length <= 1) return nav;
  return withStack(nav, nav.tab, stack.slice(0, -1));
}

// Re-selecting the tab you are already on resets it to its root. That is the
// standard native affordance for "get me out of here" and it's why the rail
// and bar don't need a separate Home button.
//
// `route` lets a caller switch *and* aim in one step (open Learn at Africa),
// which is how a deep link and the map's region pills both arrive.
export function switchTab(nav, tab, route = null) {
  if (!isTab(tab)) return nav;
  const aimed = route && !sameRoute(route, rootRoute(tab)) ? route : null;
  if (tab === nav.tab) {
    if (aimed) return withStack(nav, tab, [aimed]);
    return withStack(nav, tab, [rootRoute(tab)]);
  }
  if (aimed) return withStack(nav, tab, [aimed]);
  return { ...nav, tab };
}

// ---------------------------------------------------------------------------
// URL serialization (still pure — no `window` here; src/lib/history.js owns
// that). Kept beside the stack rather than in the IO module so the mapping is
// covered by the same tests that cover the stack, and so a route added above
// without a path below is a visible omission in one file.

export function routeToPath(route) {
  if (!route) return "/";
  switch (route.name) {
    case "home":
      return "/";
    case "learn":
      return route.pathId ? `/learn/${route.pathId}` : "/learn";
    case "explore":
      return route.focusCountry ? `/explore/${route.focusCountry}` : "/explore";
    case "profile":
      return "/profile";
    case "country":
      return `/country/${route.code}`;
    case "countryIndex":
      return "/countries";
    case "interests":
      return "/interests";
    case "quiz": {
      // Difficulty and timed ride as query params, and only when they differ
      // from the default — so the common link is a clean `/play/flag`, but a
      // hard timed round is still reproducible from its URL.
      const params = [];
      if (route.difficulty && route.difficulty !== DEFAULT_DIFFICULTY) {
        params.push(`difficulty=${route.difficulty}`);
      }
      if (route.timed) params.push("timed=1");
      return `/play/${route.mode}${params.length ? `?${params.join("&")}` : ""}`;
    }
    default:
      return "/";
  }
}

export function pathToRoute(path) {
  if (typeof path !== "string") return null;
  const [rawPath, rawQuery = ""] = path.split("?");
  const segments = rawPath.split("/").filter(Boolean);
  const query = {};
  for (const pair of rawQuery.split("&")) {
    if (!pair) continue;
    const [k, v = ""] = pair.split("=");
    query[decodeURIComponent(k)] = decodeURIComponent(v);
  }

  if (segments.length === 0) return { name: "home" };
  const [head, second] = segments;
  switch (head) {
    case "learn":
      return { name: "learn", pathId: second ?? null };
    case "explore":
      return { name: "explore", focusCountry: second ?? null };
    case "profile":
      return { name: "profile" };
    case "countries":
      return { name: "countryIndex" };
    case "interests":
      return { name: "interests" };
    case "country":
      return second ? { name: "country", code: second } : null;
    case "play":
      return second
        ? {
            name: "quiz",
            mode: second,
            difficulty: query.difficulty || DEFAULT_DIFFICULTY,
            timed: query.timed === "1",
          }
        : null;
    default:
      // Unknown path → null, not Home. The caller decides whether that's a
      // 404-to-Home or a "leave the URL alone"; swallowing it here would make
      // a typo silently look like a successful navigation.
      return null;
  }
}

// Build a whole nav from a URL. A deep-linked non-root route gets its owning
// tab's root underneath it, so arriving at /country/BRA from a shared link
// still leaves you somewhere sensible when you press Back.
export function navFromPath(path) {
  const route = pathToRoute(path);
  if (!route) return initialNav();
  const meta = ROUTES[route.name];
  if (!meta) return initialNav();
  const nav = initialNav(meta.tab);
  if (meta.root) return withStack(nav, meta.tab, [route]);
  return withStack(nav, meta.tab, [rootRoute(meta.tab), route]);
}

export function navToPath(nav) {
  return routeToPath(currentRoute(nav));
}

// Reconcile the stack with a path the browser handed us (a popstate from
// Back/Forward). Deliberately NOT `navFromPath`: rebuilding from scratch on
// every browser Back would throw away the other three tabs' stacks and flatten
// this one to two entries, so pressing Back on desktop would quietly cost you
// the state that pressing Back in-app preserves. Two different behaviours for
// the same intent is the definition of clunky.
//
// So: recognise the ordinary case — the browser went back exactly one step,
// which means the target path is the route sitting under the current top — and
// just pop. Anything else (Forward, an edited URL, a link from outside) is a
// normal navigation onto the stack we already have.
export function syncToPath(nav, path) {
  if (navToPath(nav) === path) return nav;
  const stack = currentStack(nav);
  if (stack.length > 1 && routeToPath(stack[stack.length - 2]) === path) return back(nav);
  const route = pathToRoute(path);
  if (!route) return nav;
  return navigate(nav, route);
}
