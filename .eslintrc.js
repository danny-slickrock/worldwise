// ESLint (Expo preset). Run: npm run lint
module.exports = {
  root: true,
  extends: "expo",
  ignorePatterns: [
    "node_modules/",
    "dist/",
    "web-build/",
    ".expo/",
    // Supabase Edge Functions are Deno, not Expo. They import through `npm:`
    // and `jsr:` specifiers that this resolver cannot follow and that are not
    // part of the app bundle, so linting them here only produces false
    // "unresolved module" errors. They are type-checked by `supabase functions
    // deploy`, which bundles them for real.
    "supabase/functions/",
  ],
  overrides: [
    {
      // Node scripts, not React Native. They legitimately use process, fetch,
      // setTimeout and friends, which the Expo browser/RN globals omit.
      files: ["scripts/**/*.js", "scripts/**/*.mjs"],
      env: { node: true, es2022: true },
    },
  ],
};
