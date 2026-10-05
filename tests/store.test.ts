import { describe, it, expect, beforeEach } from "vitest";
import {
  getAllCells,
  getCellById,
  getCellsForPlayer,
  attemptClaim,
  releaseClaim,
} from "@/features/world/server/store";

beforeEach(() => {
  // Force a re-seed between tests so each case starts from a clean world.
  (globalThis as { __iranGameStore?: unknown }).__iranGameStore = undefined;
});

async function findBuildableCellIds(n: number): Promise<string[]> {
  const cells = await getAllCells();
  return cells
    .filter((c) => c.buildability === "buildable" && c.status === "available")
    .slice(0, n)
    .map((c) => c.id);
}

async function findNonBuildableCellId(): Promise<string | null> {
  const cells = await getAllCells();
  const cell = cells.find(
    (c) =>
      c.buildability === "non_buildable" || c.buildability === "restricted"
  );
  return cell ? cell.id : null;
}

describe("store — getAllCells", () => {
  it("returns the full 101x101 grid", async () => {
    const cells = await getAllCells();
    expect(cells.length).toBe(10201);
  });

  it("returns cells with the expected shape", async () => {
    const [cell] = await getAllCells();
    expect(cell).toHaveProperty("id");
    expect(cell).toHaveProperty("row");
    expect(cell).toHaveProperty("col");
    expect(cell).toHaveProperty("status");
    expect(cell).toHaveProperty("polygon");
    expect(cell).toHaveProperty("buildability");
  });
});

describe("store — getCellById", () => {
  it("returns a cell for a known id", async () => {
    const cell = await getCellById("cell-0-0");
    expect(cell).not.toBeNull();
    expect(cell?.id).toBe("cell-0-0");
  });

  it("returns null for an unknown id", async () => {
    expect(await getCellById("does-not-exist")).toBeNull();
  });
});

describe("store — attemptClaim", () => {
  it("claims an available, buildable cell", async () => {
    const [id] = await findBuildableCellIds(1);
    expect(id).toBeDefined();

    const outcome = await attemptClaim({
      cellId: id,
      playerId: "player-a",
      timestamp: 1000,
    });

    expect(outcome.ok).toBe(true);
    if (outcome.ok) {
      expect(outcome.cell.status).toBe("claimed");
      expect(outcome.cell.ownerId).toBe("player-a");
      expect(outcome.cell.claimedAt).toBe(1000);
    }
  });

  it("rejects an unknown cell with CELL_NOT_FOUND", async () => {
    const outcome = await attemptClaim({
      cellId: "does-not-exist",
      playerId: "player-a",
      timestamp: 1000,
    });
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) expect(outcome.reason).toBe("CELL_NOT_FOUND");
  });

  it("rejects a non-buildable cell with CELL_NOT_BUILDABLE", async () => {
    const id = await findNonBuildableCellId();
    expect(id).not.toBeNull();

    const outcome = await attemptClaim({
      cellId: id as string,
      playerId: "player-a",
      timestamp: 1000,
    });
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) expect(outcome.reason).toBe("CELL_NOT_BUILDABLE");
  });

  it("rejects a second claim on the same cell with CELL_NOT_AVAILABLE", async () => {
    const [id] = await findBuildableCellIds(1);

    const first = await attemptClaim({
      cellId: id,
      playerId: "player-a",
      timestamp: 1000,
    });
    expect(first.ok).toBe(true);

    const second = await attemptClaim({
      cellId: id,
      playerId: "player-b",
      timestamp: 2000,
    });
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.reason).toBe("CELL_NOT_AVAILABLE");
  });
});

describe("store — releaseClaim", () => {
  it("releases a cell owned by the caller", async () => {
    const [id] = await findBuildableCellIds(1);
    await attemptClaim({ cellId: id, playerId: "player-a", timestamp: 1000 });

    expect(await releaseClaim(id, "player-a")).toBe(true);
    expect((await getCellById(id))?.status).toBe("available");
    expect((await getCellById(id))?.ownerId).toBeNull();
  });

  it("refuses to release a cell owned by someone else", async () => {
    const [id] = await findBuildableCellIds(1);
    await attemptClaim({ cellId: id, playerId: "player-a", timestamp: 1000 });

    expect(await releaseClaim(id, "player-b")).toBe(false);
    expect((await getCellById(id))?.status).toBe("claimed");
    expect((await getCellById(id))?.ownerId).toBe("player-a");
  });

  it("returns false for an unknown cell", async () => {
    expect(await releaseClaim("does-not-exist", "player-a")).toBe(false);
  });
});

describe("store — getCellsForPlayer", () => {
  it("returns only cells owned by the requested player", async () => {
    const ids = await findBuildableCellIds(3);
    expect(ids.length).toBe(3);

    await attemptClaim({ cellId: ids[0], playerId: "player-a", timestamp: 1000 });
    await attemptClaim({ cellId: ids[1], playerId: "player-a", timestamp: 1001 });
    await attemptClaim({ cellId: ids[2], playerId: "player-b", timestamp: 1002 });

    const aCells = await getCellsForPlayer("player-a");
    expect(aCells.length).toBe(2);
    expect(aCells.every((c) => c.ownerId === "player-a")).toBe(true);

    const bCells = await getCellsForPlayer("player-b");
    expect(bCells.length).toBe(1);
    expect(bCells[0].id).toBe(ids[2]);
  });

  it("returns an empty array for an unknown player", async () => {
    expect((await getCellsForPlayer("nobody")).length).toBe(0);
  });
});