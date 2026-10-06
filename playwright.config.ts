import { defineConfig } from "@playwright/test";

/**
 * Browser verification for Iran Game.
 *
 * Uses the system Google Chrome (channel: "chrome") because this environment
 * cannot download Playwright's own browser builds reliably. The dev server
 * is reused when already running; otherwise it is started with the Node 22
 * binary required by Next.js 16 (system Node is v18).
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  // The game world is shared state (claims) — keep runs deterministic.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    channel: "chrome",
    headless: true,
    navigationTimeout: 45_000,
    actionTimeout: 15_000,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: { viewport: { width: 1280, height: 720 } },
    },
    {
      name: "mobile",
      use: {
        viewport: { width: 393, height: 851 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000/api/health",
    reuseExistingServer: true,
    timeout: 90_000,
    env: {
      PATH: `${process.env.HOME}/.hermes/node/bin:${process.env.PATH}`,
    },
  },
});
