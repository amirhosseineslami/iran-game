import { test, expect, type Page } from "@playwright/test";

/**
 * Quest UI journey (TASK 02 acceptance):
 * - HUD quest button opens the panel with active/available/completed quests
 * - inspecting cells advances the Explorer quest (progress bar moves)
 * - claiming the first territory completes "First Steps", shows a toast,
 *   and the reward can be claimed for XP
 * - the completion badge appears on the HUD quest button
 */

const BASE = "http://localhost:3000";

async function prep(page: Page): Promise<void> {
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

async function openQuests(page: Page): Promise<void> {
  const btn = page.getByRole("button", { name: "Quests", exact: true });
  await btn.click();
  await expect(page.getByRole("dialog", { name: "Missions" })).toBeVisible({
    timeout: 10_000,
  });
}

async function claimOpenSheetOrNearCenter(page: Page): Promise<string> {
  // If a cell sheet is already open from exploration, claim straight away.
  const openDialog = page.getByRole("dialog");
  const openClaim = page.getByRole("button", { name: "Claim Territory" });
  if ((await openDialog.count()) > 0 && (await openClaim.count()) > 0) {
    await openClaim.click();
    const toast = page.getByText("Territory claimed!");
    const errBox = openDialog.locator("div.text-red-300");
    await expect(toast.or(errBox).first()).toBeVisible({ timeout: 10_000 });
    if (await toast.isVisible()) {
      const aria = await openDialog.getAttribute("aria-label");
      return aria?.replace(/^Game Cell\s+/, "") ?? "";
    }
    // Rejected (e.g. non-buildable) — close it and try fresh spots.
    await page.getByRole("button", { name: "Close" }).click();
    await openDialog.waitFor({ state: "hidden", timeout: 5000 }).catch(() => undefined);
  }

  const canvas = page.locator("canvas.maplibregl-canvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("map canvas has no bounding box");
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;

  const offsets: Array<[number, number]> = [
    [0, 0], [-70, -30], [70, 30], [0, -90], [0, 90],
    [-110, 70], [110, -70], [-150, 0], [150, 0],
  ];

  for (const [dx, dy] of offsets) {
    await page.mouse.click(cx + dx, cy + dy);
    const dialog = page.getByRole("dialog");
    try {
      await dialog.waitFor({ state: "visible", timeout: 3000 });
    } catch {
      continue;
    }
    const claimBtn = page.getByRole("button", { name: "Claim Territory" });
    if ((await claimBtn.count()) === 0) {
      await page.getByRole("button", { name: "Close" }).click();
      continue;
    }
    await claimBtn.click();
    const toast = page.getByText("Territory claimed!");
    const errBox = dialog.locator("div.text-red-300");
    await expect(toast.or(errBox).first()).toBeVisible({ timeout: 10_000 });
    if (await toast.isVisible()) {
      const aria = await dialog.getAttribute("aria-label");
      return aria?.replace(/^Game Cell\s+/, "") ?? "";
    }
    await page.getByRole("button", { name: "Close" }).click();
    await dialog.waitFor({ state: "hidden", timeout: 5000 }).catch(() => undefined);
  }
  throw new Error("no claimable cell near map center");
}

test.describe("quests", () => {
  test("panel opens, explorer progress advances, first claim completes + rewards", async ({
    page,
  }) => {
    await prep(page);
    await gotoMap(page);

    // Panel opens from the HUD quest button and lists real quest content.
    await openQuests(page);
    const panel = page.getByRole("dialog", { name: "Missions" });
    await expect(panel.getByText("Missions")).toBeVisible();
    const dialog = page.getByRole("dialog", { name: "Missions" });
    await expect(dialog.getByText("First Steps")).toBeVisible();
    await expect(dialog.getByText("Territory Collector")).toBeVisible();
    await expect(dialog.getByText("Explorer")).toBeVisible();
    // Explorer starts at 0 / 20.
    await expect(dialog.getByText("0 / 20")).toBeVisible();
    await dialog.getByRole("button", { name: "Close" }).click();
    await expect(page.getByRole("dialog", { name: "Missions" })).toHaveCount(0);

    // Inspecting cells = exploration. Select one via the map center.
    const panelExplore = page;
    void panelExplore;

    // Inspecting cells = exploration. Select one via the map center.
    const canvas = page.locator("canvas.maplibregl-canvas");
    const box = await canvas.boundingBox();
    if (!box) throw new Error("map canvas has no bounding box");
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 10_000 });

    // Explorer progress is now 1 / 20 in the panel.
    await openQuests(page);
    const dialog2 = page.getByRole("dialog", { name: "Missions" });
    await expect(dialog2.getByText("1 / 20")).toBeVisible();
    await dialog2.getByRole("button", { name: "Close" }).click();
    await expect(page.getByRole("dialog", { name: "Missions" })).toHaveCount(0);
    // Claim a territory (the cell sheet is already open from exploration).
    const cellId = await claimOpenSheetOrNearCenter(page);

    // Quest completion toast appears (in addition to the claim toast).
    await expect(page.getByText(/Quest complete!/)).toBeVisible({ timeout: 10_000 });

    // HUD quest button now carries a completion badge. First dismiss any
    // open sheets so they cannot intercept the quest button click.
    const straySheet = page.getByRole("dialog", { name: /^Game Cell/ });
    if ((await straySheet.count()) > 0) {
      await straySheet.getByRole("button", { name: "Close" }).click();
    }

    // HUD quest button now carries a completion badge.
    const questBtn = page.getByRole("button", { name: "Quests", exact: true });
    await expect(questBtn.getByText("1", { exact: true })).toBeVisible();

    // Open the panel: "First Steps" is completed with a reward to claim.
    await openQuests(page);
    const rewardPanel = page.getByRole("dialog", { name: "Missions" });
    await expect(rewardPanel.getByText("First Steps")).toBeVisible();
    const claimReward = rewardPanel.getByRole("button", { name: /Claim Reward/ }).first();
    await expect(claimReward).toBeVisible();
    await claimReward.click();
    await expect(rewardPanel.getByText("Reward claimed")).toBeVisible();

    // Close the panel, clean up the claimed cell.
    await rewardPanel.getByRole("button", { name: "Close" }).click();
    const playerId = await page.evaluate(() =>
      localStorage.getItem("iran-game-player-id")
    );
    const del = await page.request.delete("/api/claims", {
      data: { cellId, playerId },
    });
    expect((await del.json()).success).toBe(true);
  });
});
