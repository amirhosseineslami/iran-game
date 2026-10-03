import { describe, it, expect } from "vitest";
import {
  isCellBuildable,
  validateBuild,
  calculateBuildabilityStats,
} from "../buildability";
import type { GameCell } from "@/features/world/types/gameCell";
import type { GeographicFeature } from "@/features/world/types/geographicFeature";

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

function makeFeature(overrides: Partial<GeographicFeature> = {}): GeographicFeature {
  return {
    id: "geo-1",
    sourceId: "test-1",
    sourceType: "park",
    tags: {},
    geometry: [[[51.38, 35.68], [51.39, 35.68], [51.39, 35.69], [51.38, 35.69], [51.38, 35.68]]],
    centroid: [51.385, 35.685],
    boundingBox: [51.38, 35.68, 51.39, 35.69],
    area: 1000,
    category: "green_space",
    buildability: "non_buildable",
    confidence: 0.9,
    source: "test",
    importTimestamp: Date.now(),
    ...overrides,
  };
}

describe("buildability — isCellBuildable", () => {
  it("returns true when no features overlap", () => {
    const cell = makeCell();
    const features: GeographicFeature[] = [];
    expect(isCellBuildable(cell, features)).toBe(true);
  });

  it("returns false when non-buildable feature overlaps", () => {
    const cell = makeCell();
    const features = [makeFeature({ buildability: "non_buildable" })];
    expect(isCellBuildable(cell, features)).toBe(false);
  });

  it("returns false when restricted feature overlaps", () => {
    const cell = makeCell();
    const features = [makeFeature({ buildability: "restricted" })];
    expect(isCellBuildable(cell, features)).toBe(false);
  });

  it("returns true when only buildable features overlap", () => {
    const cell = makeCell();
    const features = [makeFeature({ buildability: "buildable" })];
    expect(isCellBuildable(cell, features)).toBe(true);
  });
});

describe("buildability — validateBuild", () => {
  it("accepts available cell with no nearby own cells", () => {
    const cell = makeCell({ status: "available" });
    const result = validateBuild(cell, "player-1", []);
    expect(result.valid).toBe(true);
  });

  it("rejects available cell too close to own territory", () => {
    const ownCell = makeCell({ id: "own-1", status: "claimed", ownerId: "player-1" });
    const cell = makeCell({ status: "available" });
    const result = validateBuild(cell, "player-1", [ownCell]);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("too_close_to_own");
  });

  it("rejects already-built cell by same player", () => {
    const cell = makeCell({ status: "claimed", ownerId: "player-1" });
    const result = validateBuild(cell, "player-1", []);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("already_built");
  });

  it("rejects cell owned by another player", () => {
    const cell = makeCell({ status: "claimed", ownerId: "player-2" });
    const result = validateBuild(cell, "player-1", []);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("too_close_to_enemy");
  });
});

describe("buildability — calculateBuildabilityStats", () => {
  it("returns zero stats for empty cell list", () => {
    const stats = calculateBuildabilityStats([], []);
    expect(stats.total).toBe(0);
    expect(stats.percentage).toBe(0);
  });

  it("counts buildable vs non-buildable correctly", () => {
    const cells = [
      makeCell({ id: "c1" }),
      makeCell({ id: "c2" }),
    ];
    const features = [makeFeature({ buildability: "non_buildable" })];
    const stats = calculateBuildabilityStats(cells, features);
    expect(stats.total).toBe(2);
    expect(stats.buildable).toBe(0);
    expect(stats.nonBuildable).toBe(2);
  });
});
