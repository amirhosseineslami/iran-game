import { defineConfig } from "vitest/config";
import path from "node:path";
import { readFileSync } from "node:fs";

/**
 * Load .env.local so DATABASE_URL / TEST_DATABASE_URL are visible to every
 * test. Next.js loads .env.local automatically for the app, but Vitest (and
 * bare Node scripts) do not — which silently forced the in-memory fallback
 * (warn: "DATABASE_URL not set — using IN-MEMORY store"). We read the file
 * here and inject only keys that aren't already in the environment so real
 * env vars always win.
 *
 * No new dependency: this mirrors what `dotenv` would do with the Node 20+
 * `--env-file` flag, which is not permitted inside NODE_OPTIONS.
 */
(function loadEnvLocal() {
  try {
    const envPath = path.resolve(__dirname, ".env.local");
    const raw = readFileSync(envPath, "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (!m) continue;
      const key = m[1];
      if (key in process.env) continue; // never override real env
      process.env[key] = m[2].trim().replace(/^"|"$/g, "");
    }
  } catch {
    /* no .env.local — tests simply use the in-memory fallback */
  }
})();

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts", "features/**/__tests__/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
