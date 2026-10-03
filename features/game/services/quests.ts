/**
 * Quest/Mission system — data-driven definitions tied to game events.
 *
 * Quests are generated from actual player actions:
 * - Claim first territory
 * - Claim N territories
 * - Explore N cells
 * - Claim territory near a landmark
 * - Maintain a streak
 */

export interface QuestDefinition {
  id: string;
  title: string;
  titleFa: string;
  description: string;
  descriptionFa: string;
  target: number;
  xpReward: number;
  icon: string; // Lucide icon name
}

export interface QuestProgress {
  questId: string;
  current: number;
  target: number;
  completed: boolean;
  claimed: boolean;
}

export interface QuestState {
  quests: QuestProgress[];
  activeQuestId: string | null;
}

// Quest definitions — data-driven, not hardcoded in UI
export const QUEST_DEFINITIONS: QuestDefinition[] = [
  {
    id: "first_claim",
    title: "First Steps",
    titleFa: "قدم‌های اول",
    description: "Claim your first territory",
    descriptionFa: "اولین قلمرو خود را تصاحب کنید",
    target: 1,
    xpReward: 50,
    icon: "Shield",
  },
  {
    id: "claim_5",
    title: "Territory Collector",
    titleFa: "جمع‌آوری قلمرو",
    description: "Claim 5 territories",
    descriptionFa: "۵ قلمرو تصاحب کنید",
    target: 5,
    xpReward: 100,
    icon: "Map",
  },
  {
    id: "claim_10",
    title: "Land Baron",
    titleFa: "باب زمین",
    description: "Claim 10 territories",
    descriptionFa: "۱۰ قلمرو تصاحب کنید",
    target: 10,
    xpReward: 200,
    icon: "Crown",
  },
  {
    id: "explore_20",
    title: "Explorer",
    titleFa: "کاوشگر",
    description: "Explore 20 cells",
    descriptionFa: "۲۰ قطعه را کاوش کنید",
    target: 20,
    xpReward: 75,
    icon: "Compass",
  },
  {
    id: "explore_50",
    title: "Pathfinder",
    titleFa: "مسیریاب",
    description: "Explore 50 cells",
    descriptionFa: "۵۰ قطعه را کاوش کنید",
    target: 50,
    xpReward: 150,
    icon: "Navigation",
  },
  {
    id: "level_3",
    title: "Rising Star",
    titleFa: "ستاره نوظهور",
    description: "Reach level 3",
    descriptionFa: "به سطح ۳ برسید",
    target: 3,
    xpReward: 100,
    icon: "Star",
  },
  {
    id: "level_5",
    title: "Strategist",
    titleFa: "راهبرد",
    description: "Reach level 5",
    descriptionFa: "به سطح ۵ برسید",
    target: 5,
    xpReward: 250,
    icon: "Trophy",
  },
];

export function initializeQuests(): QuestState {
  return {
    quests: QUEST_DEFINITIONS.map((def) => ({
      questId: def.id,
      current: 0,
      target: def.target,
      completed: false,
      claimed: false,
    })),
    activeQuestId: null,
  };
}

export function updateQuestProgress(
  state: QuestState,
  questId: string,
  value: number
): QuestState {
  const quests = state.quests.map((q) => {
    if (q.questId !== questId || q.completed) return q;
    const current = Math.min(value, q.target);
    return {
      ...q,
      current,
      completed: current >= q.target,
    };
  });
  return { ...state, quests };
}

export function getQuestDefinition(questId: string): QuestDefinition | undefined {
  return QUEST_DEFINITIONS.find((q) => q.id === questId);
}

export function getCompletedQuests(state: QuestState): QuestProgress[] {
  return state.quests.filter((q) => q.completed && !q.claimed);
}

export function getActiveQuest(state: QuestState): QuestProgress | null {
  if (!state.activeQuestId) return null;
  return state.quests.find((q) => q.questId === state.activeQuestId) ?? null;
}

export function setActiveQuest(state: QuestState, questId: string): QuestState {
  return { ...state, activeQuestId: questId };
}

export function claimQuestReward(state: QuestState, questId: string): {
  state: QuestState;
  xpReward: number;
} {
  const def = getQuestDefinition(questId);
  if (!def) return { state, xpReward: 0 };

  const quests = state.quests.map((q) => {
    if (q.questId !== questId) return q;
    return { ...q, claimed: true };
  });

  return {
    state: { ...state, quests },
    xpReward: def.xpReward,
  };
}

/**
 * Update quests based on a game event.
 * Returns updated state and any newly completed quests.
 */
export function processGameEvent(
  state: QuestState,
  event: { type: "claim" | "explore" | "level_up"; value: number }
): { state: QuestState; newlyCompleted: string[] } {
  let newState = state;
  const newlyCompleted: string[] = [];

  const questIds: Record<string, string[]> = {
    claim: ["first_claim", "claim_5", "claim_10"],
    explore: ["explore_20", "explore_50"],
    level_up: ["level_3", "level_5"],
  };

  for (const questId of questIds[event.type] ?? []) {
    const quest = newState.quests.find((q) => q.questId === questId);
    if (!quest || quest.completed) continue;

    const wasCompleted = quest.completed;
    newState = updateQuestProgress(newState, questId, event.value);
    const updated = newState.quests.find((q) => q.questId === questId)!;
    if (updated.completed && !wasCompleted) {
      newlyCompleted.push(questId);
    }
  }

  return { state: newState, newlyCompleted };
}
