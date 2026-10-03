import { describe, it, expect } from "vitest";
import {
  initializeQuests,
  updateQuestProgress,
  processGameEvent,
  claimQuestReward,
  getCompletedQuests,
  getActiveQuest,
  setActiveQuest,
  QUEST_DEFINITIONS,
} from "../quests";

describe("quests — initializeQuests", () => {
  it("creates progress for all quest definitions", () => {
    const state = initializeQuests();
    expect(state.quests.length).toBe(QUEST_DEFINITIONS.length);
  });

  it("starts with no active quest", () => {
    const state = initializeQuests();
    expect(state.activeQuestId).toBeNull();
  });

  it("all quests start at 0 progress", () => {
    const state = initializeQuests();
    expect(state.quests.every((q) => q.current === 0)).toBe(true);
    expect(state.quests.every((q) => !q.completed)).toBe(true);
  });
});

describe("quests — updateQuestProgress", () => {
  it("updates progress for a specific quest", () => {
    const state = initializeQuests();
    const updated = updateQuestProgress(state, "first_claim", 1);
    const quest = updated.quests.find((q) => q.questId === "first_claim")!;
    expect(quest.current).toBe(1);
    expect(quest.completed).toBe(true);
  });

  it("caps progress at target", () => {
    const state = initializeQuests();
    const updated = updateQuestProgress(state, "first_claim", 999);
    const quest = updated.quests.find((q) => q.questId === "first_claim")!;
    expect(quest.current).toBe(1);
  });

  it("does not update completed quests", () => {
    let state = initializeQuests();
    state = updateQuestProgress(state, "first_claim", 1);
    const updated = updateQuestProgress(state, "first_claim", 0);
    const quest = updated.quests.find((q) => q.questId === "first_claim")!;
    expect(quest.current).toBe(1);
  });
});

describe("quests — processGameEvent", () => {
  it("updates claim quests on claim event", () => {
    const state = initializeQuests();
    const { state: updated, newlyCompleted } = processGameEvent(state, {
      type: "claim",
      value: 1,
    });
    expect(newlyCompleted).toContain("first_claim");
    const quest = updated.quests.find((q) => q.questId === "first_claim")!;
    expect(quest.completed).toBe(true);
  });

  it("updates explore quests on explore event", () => {
    const state = initializeQuests();
    const { state: updated, newlyCompleted } = processGameEvent(state, {
      type: "explore",
      value: 20,
    });
    expect(newlyCompleted).toContain("explore_20");
  });

  it("updates level quests on level_up event", () => {
    const state = initializeQuests();
    const { state: updated, newlyCompleted } = processGameEvent(state, {
      type: "level_up",
      value: 3,
    });
    expect(newlyCompleted).toContain("level_3");
  });

  it("does not complete quests when value is below target", () => {
    const state = initializeQuests();
    const { newlyCompleted } = processGameEvent(state, {
      type: "claim",
      value: 0,
    });
    expect(newlyCompleted).toHaveLength(0);
  });
});

describe("quests — claimQuestReward", () => {
  it("marks quest as claimed and returns XP", () => {
    let state = initializeQuests();
    state = updateQuestProgress(state, "first_claim", 1);
    const { state: updated, xpReward } = claimQuestReward(state, "first_claim");
    const quest = updated.quests.find((q) => q.questId === "first_claim")!;
    expect(quest.claimed).toBe(true);
    expect(xpReward).toBe(50);
  });

  it("returns 0 XP for unknown quest", () => {
    const state = initializeQuests();
    const { xpReward } = claimQuestReward(state, "nonexistent");
    expect(xpReward).toBe(0);
  });
});

describe("quests — getCompletedQuests", () => {
  it("returns only completed and unclaimed quests", () => {
    let state = initializeQuests();
    state = updateQuestProgress(state, "first_claim", 1);
    const completed = getCompletedQuests(state);
    expect(completed.length).toBe(1);
    expect(completed[0].questId).toBe("first_claim");
  });

  it("excludes already claimed quests", () => {
    let state = initializeQuests();
    state = updateQuestProgress(state, "first_claim", 1);
    state = claimQuestReward(state, "first_claim").state;
    const completed = getCompletedQuests(state);
    expect(completed.length).toBe(0);
  });
});

describe("quests — active quest", () => {
  it("sets and gets active quest", () => {
    let state = initializeQuests();
    state = setActiveQuest(state, "first_claim");
    const active = getActiveQuest(state);
    expect(active).not.toBeNull();
    expect(active!.questId).toBe("first_claim");
  });

  it("returns null when no active quest", () => {
    const state = initializeQuests();
    expect(getActiveQuest(state)).toBeNull();
  });
});
