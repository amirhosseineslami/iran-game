import { describe, it, expect } from "vitest";
import {
  validatePolygon,
  calculateCentroid,
  calculateBoundingBox,
  calculateAreaMeters,
  classifyFeature,
} from "../geographyUtils";

describe("geographyUtils — validatePolygon", () => {
  it("returns true for valid closed polygon", () => {
    const polygon = [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]];
    expect(validatePolygon(polygon)).toBe(true);
  });

  it("returns false for empty polygon", () => {
    expect(validatePolygon([])).toBe(false);
  });

  it("returns false for unclosed ring", () => {
    const polygon = [[[0, 0], [1, 0], [1, 1], [0, 1]]];
    expect(validatePolygon(polygon)).toBe(false);
  });

  it("returns false for ring with too few points", () => {
    const polygon = [[[0, 0], [1, 0], [0, 0]]];
    expect(validatePolygon(polygon)).toBe(false);
  });

  it("returns false for out-of-range coordinates", () => {
    const polygon = [[[200, 0], [1, 0], [1, 1], [200, 0]]];
    expect(validatePolygon(polygon)).toBe(false);
  });

  it("returns false for non-numeric coordinates", () => {
    const polygon = [[["a", 0], [1, 0], [1, 1], ["a", 0]]];
    expect(validatePolygon(polygon as any)).toBe(false);
  });
});

describe("geographyUtils — calculateCentroid", () => {
  it("calculates centroid of a square (includes closing point)", () => {
    const polygon = [[[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]];
    const [lng, lat] = calculateCentroid(polygon);
    // 5 points: (0+2+2+0+0)/5 = 0.8, (0+0+2+2+0)/5 = 0.8
    expect(lng).toBeCloseTo(0.8, 5);
    expect(lat).toBeCloseTo(0.8, 5);
  });

  it("calculates centroid of a triangle (includes closing point)", () => {
    const polygon = [[[0, 0], [3, 0], [0, 3], [0, 0]]];
    const [lng, lat] = calculateCentroid(polygon);
    // 4 points: (0+3+0+0)/4 = 0.75, (0+0+3+0)/4 = 0.75
    expect(lng).toBeCloseTo(0.75, 5);
    expect(lat).toBeCloseTo(0.75, 5);
  });
});

describe("geographyUtils — calculateBoundingBox", () => {
  it("returns correct bounding box", () => {
    const polygon = [[[1, 2], [3, 2], [3, 4], [1, 4], [1, 2]]];
    const bbox = calculateBoundingBox(polygon);
    expect(bbox).toEqual([1, 2, 3, 4]);
  });

  it("handles negative coordinates", () => {
    const polygon = [[[-1, -2], [1, -2], [1, 2], [-1, 2], [-1, -2]]];
    const bbox = calculateBoundingBox(polygon);
    expect(bbox).toEqual([-1, -2, 1, 2]);
  });
});

describe("geographyUtils — calculateAreaMeters", () => {
  it("returns positive area for valid polygon", () => {
    const polygon = [[[51.38, 35.68], [51.39, 35.68], [51.39, 35.69], [51.38, 35.69], [51.38, 35.68]]];
    const area = calculateAreaMeters(polygon);
    expect(area).toBeGreaterThan(0);
  });

  it("returns larger area for larger polygon", () => {
    const small = [[[0, 0], [0.001, 0], [0.001, 0.001], [0, 0.001], [0, 0]]];
    const large = [[[0, 0], [0.01, 0], [0.01, 0.01], [0, 0.01], [0, 0]]];
    expect(calculateAreaMeters(large)).toBeGreaterThan(calculateAreaMeters(small));
  });
});

describe("geographyUtils — classifyFeature", () => {
  it("classifies water as non_buildable", () => {
    const result = classifyFeature("water", { water: "river" });
    expect(result.buildability).toBe("non_buildable");
  });

  it("classifies park as restricted", () => {
    const result = classifyFeature("park", { leisure: "park" });
    expect(result.buildability).toBe("restricted");
  });

  it("classifies buildings as non_buildable", () => {
    const result = classifyFeature("building", { building: "residential" });
    expect(result.buildability).toBe("non_buildable");
  });

  it("classifies highway as non_buildable", () => {
    const result = classifyFeature("highway", { highway: "primary" });
    expect(result.buildability).toBe("non_buildable");
  });
});
