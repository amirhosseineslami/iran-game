import { test, expect, type Page } from "@playwright/test";

/**
 * The core player journey: select a land cell, claim it, see ownership in
 * the HUD and bottom sheet, then reload and confirm the claim persisted
 * (server-side via PostgreSQL). Cleans up after itself so runs are
 * repeatable against the shared dev world.
 */

const BASE = "http://localhost:3000";

async function prep(page: Page): Promise<void> {
  // Onboarding flag lives in localStorage (not a cookie) — set it before
  // the app scripts run so the first-visit overlay never appears.
  await page.addInitScript(() => {
    localStorage.setItem("iran-game-onboarded", "true");
  });
  await page.context().addCookies([
    { name: "NEXT_LOCALE", value: "en", url: BASE },
  ]);
}

async function gotoMap(page: Page): Promise<void> {
  await page.goto("/");
  await expect(page.locator("canvas.maplibregl-canvas")).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByText("Loading...", { exact: true })).toHaveCount(0, {
    timeout: 30_000,
  });
}

/**
 * Try to claim a cell near the center of the map. Clicks several offsets
 * because the exact center cell may be non-buildable (real geography).
 * Returns the claimed cell id, or null if no claimable cell was found.
 */
async function tryClaimNearCenter(page: Page): Promise<string | null> {
  const canvas = page.locator("canvas.maplibregl-canvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("map canvas has no bounding box");
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;

  const offsets: Array<[number, number]> = [
    [0, 0],
    [-70, -30],
    [70, 30],
    [0, -90],
    [0, 90],
    [-110, 70],
    [110, -70],
    [-150, 0],
    [150, 0],
  ];

  for (const [dx, dy] of offsets) {
    await page.mouse.click(cx + dx, cy + dy);

    const dialog = page.getByRole("dialog");
    try {
      await dialog.waitFor({ state: "visible", timeout: 3000 });
    } catch {
      continue; // clicked empty space (no cell feature) — try another spot
    }

    const claimBtn = page.getByRole("button", { name: "Claim Territory" });
    if ((await claimBtn.count()) === 0) {
      // Cell exists but is not claimable by us (owned by someone else).
      await page.getByRole("button", { name: "Close" }).click();
      continue;
    }

    await claimBtn.click();

    const toast = page.getByText("Territory claimed!");
    const errBox = dialog.locator("div.text-red-300");

    // Either the success toast or an in-dialog error will show up.
    await expect(toast.or(errBox).first()).toBeVisible({ timeout: 10_000 });

    if (await toast.isVisible()) {
      const aria = await dialog.getAttribute("aria-label"); // "Game Cell cell-X-Y"
      const cellId = aria?.replace(/^Game Cell\s+/, "") ?? "";
      expect(cellId).toMatch(/^cell-\d+-\d+$/);
      return cellId;
    }

    // Claim rejected (e.g. buildability) — dismiss and try another cell.
    await page.getByRole("button", { name: "Close" }).click();
    await dialog.waitFor({ state: "hidden", timeout: 5000 }).catch(() => undefined);
  }
  return null;
}

test.describe("claim journey", () => {
  test("select → claim → ownership → reload persistence", async ({ page }) => {
    await prep(page);
    await gotoMap(page);

    const cellId = await tryClaimNearCenter(page);
    expect(cellId, "expected a claimable cell near the map center").not.toBeNull();

    // Ownership is visible in the bottom sheet…
    await expect(page.getByText("Your Territory").first()).toBeVisible();

    // …and in the HUD (Owned: 1)
    const ownedStat = page.locator("span.text-game-stat.text-green-400").first();
    await expect(ownedStat).toHaveText("1");

    // XP was awarded (claim grants XP → HUD shows a positive value)
    await expect(page.getByText(/XP$/).first()).toBeVisible();

    // Reload the page: claim must survive (PostgreSQL persistence).
    await page.reload();
    await expect(page.locator("canvas.maplibregl-canvas")).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText("Loading...", { exact: true })).toHaveCount(0, {
      timeout: 30_000,
    });
    await expect(ownedStat).toHaveText("1", { timeout: 15_000 });

    // Cleanup — give the cell back so reruns stay deterministic.
    const del = await page.request.delete("/api/claims", {
      data: { cellId, playerId: await page.evaluate(() => localStorage.getItem("iran-game-player-id")) },
    });
    const delBody = await del.json();
    expect(delBody.success).toBe(true);
  });
});
