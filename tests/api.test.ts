import { describe, it, expect, beforeEach } from "vitest";

/**
 * API integration tests for /api/cells and /api/claims.
 * These tests run against the in-memory store directly (no HTTP server needed).
 */

import {
  getAllCells,
  getCellById,
  attemptClaim,
  releaseClaim,
} from "@/features/world/server/store";

beforeEach(() => {
  (globalThis as { __iranGameStore?: unknown }).__iranGameStore = undefined;
});

async function findBuildableCell(): Promise<string> {
  const cells = await getAllCells();
  const found = cells.filter(
    (c) => c.buildability === "buildable" && c.status === "available"
  );
  return found[0]?.id ?? "";
}

describe("API — GET /api/cells (via store)", () => {
  it("returns all 10,201 cells", async () => {
    const cells = await getAllCells();
    expect(cells.length).toBe(10201);
  });

  it("returns cells with required fields", async () => {
    const [cell] = await getAllCells();
    expect(cell).toHaveProperty("id");
    expect(cell).toHaveProperty("row");
    expect(cell).toHaveProperty("col");
    expect(cell).toHaveProperty("status");
    expect(cell).toHaveProperty("polygon");
    expect(cell).toHaveProperty("buildability");
  });

  it("returns stats with correct counts", async () => {
    const cells = await getAllCells();
    const stats = {
      total: cells.length,
      available: cells.filter((c) => c.status === "available").length,
      claimed: cells.filter((c) => c.status === "claimed").length,
      buildable: cells.filter((c) => c.buildability === "buildable").length,
      nonBuildable: cells.filter((c) => c.buildability !== "buildable").length,
    };
    expect(stats.total).toBe(10201);
    expect(stats.available + stats.claimed).toBe(stats.total);
    expect(stats.buildable + stats.nonBuildable).toBe(stats.total);
  });
});

describe("API — GET /api/cells?bbox (via store)", () => {
  it("filters cells by bounding box", async () => {
    const allCells = await getAllCells();
    const bbox = "51.38,35.68,51.42,35.72";
    const [minLng, minLat, maxLng, maxLat] = bbox.split(",").map(Number);

    const filtered = allCells.filter((cell) => {
      const ring = cell.polygon[0];
      let sumLng = 0, sumLat = 0;
      for (const [lng, lat] of ring) {
        sumLng += lng;
        sumLat += lat;
      }
      const cLng = sumLng / ring.length;
      const cLat = sumLat / ring.length;
      return cLng >= minLng && cLng <= maxLng && cLat >= minLat && cLat <= maxLat;
    });

    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.length).toBeLessThan(allCells.length);
  });
});

describe("API — POST /api/claims (via store)", () => {
  it("claims a buildable cell successfully", async () => {
    const cellId = await findBuildableCell();
    expect(cellId).toBeTruthy();

    const outcome = await attemptClaim({
      cellId,
      playerId: "test-player",
      timestamp: Date.now(),
    });

    expect(outcome.ok).toBe(true);
    if (outcome.ok) {
      expect(outcome.cell.status).toBe("claimed");
      expect(outcome.cell.ownerId).toBe("test-player");
    }
  });

  it("returns duplicate flag for same sessionId", async () => {
    const cellId = await findBuildableCell();
    const sessionId = `test-session-${Date.now()}`;

    const first = await attemptClaim({
      cellId,
      playerId: "test-player",
      timestamp: Date.now(),
      sessionId,
    });
    expect(first.ok).toBe(true);
    if (first.ok) expect(first.duplicate).toBe(false);

    const second = await attemptClaim({
      cellId,
      playerId: "test-player",
      timestamp: Date.now() + 1,
      sessionId,
    });
    expect(second.ok).toBe(true);
    if (second.ok) expect(second.duplicate).toBe(true);
  });

  it("rejects claim on non-buildable cell", async () => {
    const allCells = await getAllCells();
    const nonBuildable = allCells.find(
      (c) => c.buildability === "non_buildable" && c.status === "available"
    );
    expect(nonBuildable).toBeTruthy();

    const outcome = await attemptClaim({
      cellId: nonBuildable!.id,
      playerId: "test-player",
      timestamp: Date.now(),
    });

    expect(outcome.ok).toBe(false);
    if (!outcome.ok) expect(outcome.reason).toBe("CELL_NOT_BUILDABLE");
  });

  it("rejects claim on already-claimed cell", async () => {
    const cellId = await findBuildableCell();
    await attemptClaim({ cellId, playerId: "player-a", timestamp: Date.now() });

    const outcome = await attemptClaim({
      cellId,
      playerId: "player-b",
      timestamp: Date.now(),
    });

    expect(outcome.ok).toBe(false);
    if (!outcome.ok) expect(outcome.reason).toBe("CELL_NOT_AVAILABLE");
  });

  it("rejects claim on non-existent cell", async () => {
    const outcome = await attemptClaim({
      cellId: "does-not-exist",
      playerId: "test-player",
      timestamp: Date.now(),
    });

    expect(outcome.ok).toBe(false);
    if (!outcome.ok) expect(outcome.reason).toBe("CELL_NOT_FOUND");
  });
});

describe("API — DELETE /api/claims (via store)", () => {
  it("releases a claimed cell by owner", async () => {
    const cellId = await findBuildableCell();
    await attemptClaim({ cellId, playerId: "test-player", timestamp: Date.now() });

    const ok = await releaseClaim(cellId, "test-player");
    expect(ok).toBe(true);
    expect((await getCellById(cellId))?.status).toBe("available");
  });

  it("refuses release by non-owner", async () => {
    const cellId = await findBuildableCell();
    await attemptClaim({ cellId, playerId: "player-a", timestamp: Date.now() });

    const ok = await releaseClaim(cellId, "player-b");
    expect(ok).toBe(false);
  });
});
