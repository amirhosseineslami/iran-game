import { describe, it, expect, beforeEach } from "vitest";
import { useGameStore } from "@/features/game/context/GameContext";
import { QUEST_DEFINITIONS } from "@/features/game/services/quests";

/**
 * Store-level quest integration: the game store must feed quest progress
 * from player actions (select = explore, claim, level-ups), queue completion
 * toasts exactly once, and pay rewards exactly once.
 */

beforeEach(() => {
  // Fresh store per test. create() has no reset; re-create initial state via
  // the public actions exposed on the singleton.
  useGameStore.setState((s) => ({
    ...s,
    cells: [],
    selectedCellId: null,
    xp: 0,
    progression: { xp: 0, level: 1, territoriesClaimed: 0, nextLevelXp: 100, progressToNext: 0 },
    questState: {
      quests: QUEST_DEFINITIONS.map((d) => ({
        questId: d.id,
        current: 0,
        target: d.target,
        completed: false,
        claimed: false,
      })),
      activeQuestId: null,
    },
    exploredCellIds: [],
    pendingQuestToasts: [],
    playerClaims: [],
  }));
});

describe("quest store — explore events", () => {
  it("tracks distinct inspected cells and advances explore quests", () => {
    const store = useGameStore.getState();
    store.selectCell("cell-1-1");
    store.selectCell("cell-1-2");
    store.selectCell("cell-1-1"); // repeat — must not double count

    const state = useGameStore.getState();
    expect(state.exploredCellIds).toEqual(["cell-1-1", "cell-1-2"]);
    const explore = state.questState.quests.find((q) => q.questId === "explore_20")!;
    expect(explore.current).toBe(2);
    expect(explore.completed).toBe(false);
  });

  it("completing an explore quest queues exactly one toast", () => {
    const store = useGameStore.getState();
    // Pretend 19 cells already explored, then inspect the 20th.
    useGameStore.setState((s) => ({
      ...s,
      exploredCellIds: Array.from({ length: 19 }, (_, i) => `cell-x-${i}`),
    }));
    useGameStore.getState().selectCell("cell-final");

    const state = useGameStore.getState();
    const explore = state.questState.quests.find((q) => q.questId === "explore_20")!;
    expect(explore.completed).toBe(true);
    expect(state.pendingQuestToasts).toEqual(["explore_20"]);

    const drained = state.consumeQuestToasts();
    expect(drained).toEqual(["explore_20"]);
    expect(useGameStore.getState().pendingQuestToasts).toEqual([]);
  });

  it("deselecting does not count as exploration", () => {
    useGameStore.getState().selectCell(null);
    expect(useGameStore.getState().exploredCellIds).toEqual([]);
    expect(useGameStore.getState().pendingQuestToasts).toEqual([]);
  });
});

describe("quest store — rewards", () => {
  it("pays XP exactly once for a completed quest", () => {
    // Complete first_claim manually, then claim the reward twice.
    useGameStore.setState((s) => ({
      ...s,
      questState: {
        ...s.questState,
        quests: s.questState.quests.map((q) =>
          q.questId === "first_claim" ? { ...q, current: 1, completed: true } : q
        ),
      },
    }));

    const before = useGameStore.getState();
    const gained = before.claimQuestReward("first_claim");
    expect(gained).toBe(50);

    const after = useGameStore.getState();
    expect(after.xp).toBe(before.xp + 50);
    expect(after.questState.quests.find((q) => q.questId === "first_claim")!.claimed).toBe(true);

    // Second attempt pays nothing (no double rewards).
    expect(after.claimQuestReward("first_claim")).toBe(0);
    expect(useGameStore.getState().xp).toBe(after.xp);
  });

  it("refuses rewards for incomplete quests", () => {
    expect(useGameStore.getState().claimQuestReward("claim_10")).toBe(0);
    expect(useGameStore.getState().xp).toBe(0);
  });

  it("refuses rewards for unknown quests", () => {
    expect(useGameStore.getState().claimQuestReward("nope")).toBe(0);
  });
});

describe("quest store — active quest", () => {
  it("tracks and untracks quests", () => {
    const store = useGameStore.getState();
    expect(store.questState.activeQuestId).toBeNull();
    store.setActiveQuest("claim_5");
    expect(useGameStore.getState().questState.activeQuestId).toBe("claim_5");
    store.setActiveQuest(null);
    expect(useGameStore.getState().questState.activeQuestId).toBeNull();
  });
});

