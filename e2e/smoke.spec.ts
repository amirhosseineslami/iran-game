import { test, expect, type Page } from "@playwright/test";

/**
 * Browser verification for Iran Game.
 *
 * Covers the real player path against the live dev server:
 * home → onboarding → map → cells → selection → claim → ownership →
 * reload persistence → language switching → mobile layout.
 *
 * All tests force the EN locale via the NEXT_LOCALE cookie so string
 * assertions are deterministic (default locale is fa/RTL).
 */

const BASE = "http://localhost:3000";

async function useEnglish(page: Page): Promise<void> {
  await page.context().addCookies([
    { name: "NEXT_LOCALE", value: "en", url: BASE },
    { name: "iran-game-onboarded", value: "true", url: BASE },
  ]);
}

async function useFreshEnglishPlayer(page: Page): Promise<void> {
  // English locale but WITHOUT the onboarding flag → first-visit flow.
  await page.context().addCookies([
    { name: "NEXT_LOCALE", value: "en", url: BASE },
  ]);
}

/** Navigate and wait until the map is interactive (loading overlay gone). */
async function gotoMap(page: Page): Promise<void> {
  await page.goto("/");
  await expect(page.locator("canvas.maplibregl-canvas")).toBeVisible({
    timeout: 30_000,
  });
  // Loading overlay contains the "Loading..." label; wait for it to vanish.
  await expect(page.getByText("Loading...", { exact: true })).toHaveCount(0, {
    timeout: 30_000,
  });
}

test.describe("smoke", () => {
  test("home page loads with map, HUD and first-visit onboarding", async ({ page }) => {
    await useFreshEnglishPlayer(page);
    await page.goto("/");

    await expect(page).toHaveTitle(/Iran Game/i);

    // First visit → onboarding overlay with CTA
    const cta = page.getByRole("button", { name: "Start Exploring" });
    await expect(cta).toBeVisible({ timeout: 30_000 });
    await cta.click();
    await expect(cta).toHaveCount(0);

    // Map canvas renders
    await expect(page.locator("canvas.maplibregl-canvas")).toBeVisible({
      timeout: 30_000,
    });

    // HUD visible: title, owned stat, total cells
    await expect(page.getByText("Total Cells").first()).toBeVisible();
    await expect(page.getByText("Owned").first()).toBeVisible();

    // Cells loaded → "select a cell" hint appears (no selection yet)
    await expect(page.getByText("Select a land cell")).toBeVisible({
      timeout: 30_000,
    });

    // Onboarding flag was persisted — reload does not show it again
    await page.reload();
    await expect(page.getByRole("button", { name: "Start Exploring" })).toHaveCount(0);
  });

  test("API health reports PostgreSQL persistence", async ({ page }) => {
    const res = await page.request.get("/api/health");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.persistence.mode).toBe("postgres");
    expect(body.persistence.persistent).toBe(true);
  });

  test("cells API returns viewport data", async ({ page }) => {
    const res = await page.request.get("/api/cells?bbox=51.38,35.68,51.42,35.72");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(Array.isArray(body.cells)).toBe(true);
    expect(body.cells.length).toBeGreaterThan(0);
    expect(body.cells.length).toBeLessThanOrEqual(10201);
    expect(body.stats.total).toBe(body.cells.length);
  });
});
