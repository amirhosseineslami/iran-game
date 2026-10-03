import { describe, it, expect } from "vitest";
import {
  calculateProgression,
  calculateClaimXp,
  getLevelForXp,
  getNextLevel,
  XP_PER_CLAIM,
  XP_PER_TERRITORY_MILESTONE,
  MILESTONE_INTERVAL,
} from "../progression";

describe("progression — getLevelForXp", () => {
  it("returns level 1 for 0 XP", () => {
    expect(getLevelForXp(0).level).toBe(1);
  });

  it("returns level 2 at 100 XP", () => {
    expect(getLevelForXp(100).level).toBe(2);
  });

  it("returns level 5 at 800 XP", () => {
    expect(getLevelForXp(800).level).toBe(5);
  });

  it("returns max level for very high XP", () => {
    expect(getLevelForXp(99999).level).toBe(10);
  });
});

describe("progression — getNextLevel", () => {
  it("returns null at max level", () => {
    expect(getNextLevel(4000)).toBeNull();
  });

  it("returns next level when below max", () => {
    const next = getNextLevel(100);
    expect(next).not.toBeNull();
    expect(next!.level).toBe(3);
  });
});

describe("progression — calculateProgression", () => {
  it("calculates correct state for new player", () => {
    const state = calculateProgression(0, 0);
    expect(state.level).toBe(1);
    expect(state.xp).toBe(0);
    expect(state.territoriesClaimed).toBe(0);
    expect(state.progressToNext).toBe(0);
  });

  it("calculates progress between levels", () => {
    const state = calculateProgression(150, 2);
    expect(state.level).toBe(2);
    expect(state.nextLevelXp).toBe(250);
    expect(state.progressToNext).toBeCloseTo(0.33, 1);
  });

  it("shows full progress at max level", () => {
    const state = calculateProgression(5000, 50);
    expect(state.level).toBe(10);
    expect(state.progressToNext).toBe(1);
  });
});

describe("progression — calculateClaimXp", () => {
  it("grants base XP for normal claim", () => {
    const { xp, isMilestone } = calculateClaimXp(0, "buildable");
    expect(xp).toBe(XP_PER_CLAIM);
    expect(isMilestone).toBe(false);
  });

  it("grants milestone bonus at interval", () => {
    const { xp, isMilestone } = calculateClaimXp(
      MILESTONE_INTERVAL - 1,
      "buildable"
    );
    expect(isMilestone).toBe(true);
    expect(xp).toBe(XP_PER_CLAIM + XP_PER_TERRITORY_MILESTONE);
  });

  it("grants 1.5x bonus for restricted cells", () => {
    const { xp } = calculateClaimXp(0, "restricted");
    expect(xp).toBe(Math.round(XP_PER_CLAIM * 1.5));
  });

  it("does not grant milestone for non-milestone claims", () => {
    const { isMilestone } = calculateClaimXp(3, "buildable");
    expect(isMilestone).toBe(false);
  });
});
