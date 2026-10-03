import { describe, it, expect } from "vitest";
import { GameWorld } from "../GameState";
import type { GameCell } from "@/features/world/types/gameCell";

function makeCell(overrides: Partial<GameCell> = {}): GameCell {
  return {
    id: "cell-0-0",
    row: 0,
    col: 0,
    status: "available",
    ownerId: null,
    polygon: [[[51.38, 35.68], [51.39, 35.68], [51.39, 35.69], [51.38, 35.69], [51.38, 35.68]]],
    ...overrides,
  };
}

describe("GameWorld", () => {
  it("loads cells and returns state", () => {
    const world = new GameWorld();
    const cells = [makeCell(), makeCell({ id: "cell-0-1", col: 1 })];
    world.load(cells);
    const state = world.getState();
    expect(state).not.toBeNull();
    expect(state!.cells.length).toBe(2);
  });

  it("returns null state before load", () => {
    const world = new GameWorld();
    expect(world.getState()).toBeNull();
  });

  it("finds cell by id", () => {
    const world = new GameWorld();
    world.load([makeCell({ id: "cell-5-5" })]);
    expect(world.getCellById("cell-5-5")?.id).toBe("cell-5-5");
    expect(world.getCellById("nonexistent")).toBeNull();
  });

  it("returns cells for a specific player", () => {
    const world = new GameWorld();
    world.load([
      makeCell({ id: "c1", ownerId: "player-a" }),
      makeCell({ id: "c2", ownerId: "player-b" }),
      makeCell({ id: "c3", ownerId: "player-a" }),
    ]);
    const aCells = world.getCellsForPlayer("player-a");
    expect(aCells.length).toBe(2);
    expect(aCells.every((c) => c.ownerId === "player-a")).toBe(true);
  });

  it("returns neighboring cells within radius", () => {
    const world = new GameWorld();
    world.load([
      makeCell({ id: "c0-0", row: 0, col: 0 }),
      makeCell({ id: "c0-1", row: 0, col: 1 }),
      makeCell({ id: "c5-5", row: 5, col: 5 }),
    ]);
    const neighbors = world.getNeighboringCells(
      makeCell({ id: "c0-0", row: 0, col: 0 }),
      1
    );
    expect(neighbors.length).toBe(2); // c0-0 and c0-1
  });

  it("notifies listeners on state change", () => {
    const world = new GameWorld();
    let called = false;
    world.subscribe(() => { called = true; });
    world.load([makeCell()]);
    expect(called).toBe(true);
  });

  it("buildCell returns no_state before load", () => {
    const world = new GameWorld();
    const result = world.buildCell("cell-0-0", "player-1");
    expect(result.success).toBe(false);
    expect(result.reason).toBe("no_state");
  });
});
