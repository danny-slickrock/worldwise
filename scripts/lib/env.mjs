// The tiny .env reader the seed and media scripts share.
//
// Deliberately not `dotenv`: these are the only consumers, Expo already loads
// .env for the app itself, and a zero-dependency reader is one less thing that
// can go wrong in a script whose whole job is to hold a service-role key
// correctly.
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function readDotEnv() {
  const path = join(repoRoot, ".env");
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    // Strip one layer of surrounding quotes, which .env files commonly carry.
    out[trimmed.slice(0, eq).trim()] = trimmed
      .slice(eq + 1)
      .trim()
      .replace(/^["'](.*)["']$/, "$1");
  }
  return out;
}

const fileEnv = readDotEnv();

// Real environment wins over .env, so a one-off override doesn't need an edit.
export const env = (key) => process.env[key] || fileEnv[key];

// Resolve the two things every service-role script needs, or explain what's
// missing and stop. The warning is repeated at every call site on purpose: an
// EXPO_PUBLIC_-prefixed service key ships full database access to every visitor
// of the website, and that is not a mistake anyone gets to make twice.
export function requireServiceConfig(command) {
  const url = env("SUPABASE_URL") || env("EXPO_PUBLIC_SUPABASE_URL");
  const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !serviceKey) {
    console.error(
      "Missing config.\n\n" +
        "  SUPABASE_URL                (or EXPO_PUBLIC_SUPABASE_URL — already in .env)\n" +
        "  SUPABASE_SERVICE_ROLE_KEY   Dashboard → Project Settings → API Keys → secret key\n\n" +
        "The service-role key bypasses RLS. Keep it out of .env.example, out of\n" +
        "version control, and never behind an EXPO_PUBLIC_ prefix.\n\n" +
        `  SUPABASE_SERVICE_ROLE_KEY=sb_secret_... ${command}`
    );
    process.exit(1);
  }

  return { url: url.replace(/\/$/, ""), serviceKey };
}
