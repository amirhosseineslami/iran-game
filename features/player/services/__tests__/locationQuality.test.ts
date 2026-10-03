import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  isStale,
  isValid,
  calculateConfidence,
  applyHysteresis,
  getFilteredPosition,
} from "../locationQuality";

function makePosition(coordsOverrides: Partial<GeolocationPosition["coords"]> = {}): GeolocationPosition {
  const now = Date.now();
  return {
    coords: {
      latitude: 35.6892,
      longitude: 51.389,
      accuracy: 10,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
      ...coordsOverrides,
    },
    timestamp: now,
  } as GeolocationPosition;
}

describe("locationQuality — isStale", () => {
  it("returns false for fresh timestamp", () => {
    expect(isStale(Date.now())).toBe(false);
  });

  it("returns true for old timestamp", () => {
    expect(isStale(Date.now() - 120_000)).toBe(true);
  });

  it("returns false for timestamp at boundary", () => {
    expect(isStale(Date.now() - 30_000)).toBe(false);
  });
});

describe("locationQuality — isValid", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns true for valid position", () => {
    const pos = makePosition({ accuracy: 10 });
    expect(isValid(pos)).toBe(true);
  });

  it("returns false for poor accuracy", () => {
    const pos = makePosition({ accuracy: 100 });
    expect(isValid(pos)).toBe(false);
  });

  it("returns false for stale timestamp", () => {
    const pos = makePosition({ accuracy: 10 });
    // Override timestamp to be old
    (pos as any).timestamp = Date.now() - 120_000;
    expect(isValid(pos)).toBe(false);
  });

  it("returns false for NaN coordinates", () => {
    const pos = makePosition({ latitude: NaN, longitude: NaN });
    expect(isValid(pos)).toBe(false);
  });
});

describe("locationQuality — calculateConfidence", () => {
  it("returns high confidence for accurate fresh position", () => {
    const pos = makePosition({ accuracy: 5 });
    const confidence = calculateConfidence(pos);
    expect(confidence).toBeGreaterThan(0.8);
  });

  it("returns lower confidence for inaccurate position", () => {
    const pos = makePosition({ accuracy: 45 });
    const confidence = calculateConfidence(pos);
    expect(confidence).toBeLessThan(0.6);
    expect(confidence).toBeGreaterThan(0.4);
  });

  it("returns value between 0 and 1", () => {
    const pos = makePosition({ accuracy: 25 });
    const confidence = calculateConfidence(pos);
    expect(confidence).toBeGreaterThanOrEqual(0);
    expect(confidence).toBeLessThanOrEqual(1);
  });
});

describe("locationQuality — applyHysteresis", () => {
  it("returns new position when no previous position", () => {
    const result = applyHysteresis(35.7, 51.4, null, null, 10);
    expect(result.latitude).toBe(35.7);
    expect(result.longitude).toBe(51.4);
    expect(result.jumped).toBe(true);
  });

  it("returns old position when within threshold", () => {
    const result = applyHysteresis(35.6893, 51.3891, 35.6892, 51.389, 50);
    expect(result.latitude).toBe(35.6892);
    expect(result.longitude).toBe(51.389);
    expect(result.jumped).toBe(false);
  });

  it("returns new position when beyond threshold", () => {
    const result = applyHysteresis(35.7, 51.4, 35.6892, 51.389, 10);
    expect(result.latitude).toBe(35.7);
    expect(result.longitude).toBe(51.4);
    expect(result.jumped).toBe(true);
  });
});

describe("locationQuality — getFilteredPosition", () => {
  it("returns filtered position for valid input", () => {
    const pos = makePosition({ accuracy: 10 });
    const result = getFilteredPosition(pos);
    expect(result).not.toBeNull();
    expect(result!.latitude).toBe(35.6892);
    expect(result!.longitude).toBe(51.389);
    expect(result!.accuracy).toBe(10);
  });

  it("returns null for invalid position", () => {
    const pos = makePosition({ accuracy: 100 });
    const result = getFilteredPosition(pos);
    expect(result).toBeNull();
  });
});
