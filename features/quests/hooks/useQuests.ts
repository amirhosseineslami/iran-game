import { useState, useEffect } from "react";
import type { Quest, PlayerQuests } from "../types";

interface UseQuestsOptions {
  playerId?: string;
}

export function useQuests(options: UseQuestsOptions = {}) {
  const [activeQuests, setActiveQuests] = useState<Quest[]>([]);
  const [completedQuests, setCompletedQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);

  // Load quests from localStorage (or API in production)
  useEffect(() => {
    const loadQuests = () => {
      try {
        const stored = localStorage.getItem(`quests_${options.playerId}`);
        if (stored) {
          const parsed = JSON.parse(stored) as PlayerQuests;
          setActiveQuests(parsed.active);
          setCompletedQuests(parsed.completed);
        } else {
          // Initialize with default quests
          setActiveQuests([]);
          setCompletedQuests([]);
        }
      } catch (error) {
        console.error("Failed to load quests:", error);
      } finally {
        setLoading(false);
      }
    };

    loadQuests();
  }, [options.playerId]);

  const completeQuest = (questId: string) => {
    const questIndex = activeQuests.findIndex((q) => q.id === questId);
    if (questIndex === -1) return;

    const [quest] = activeQuests.splice(questIndex, 1);
    const updatedActive = [...activeQuests];
    const updatedCompleted = [...completedQuests, { ...quest, status: "completed" as const }];

    setActiveQuests(updatedActive);
    setCompletedQuests(updatedCompleted);

    // Save to localStorage
    const playerQuests: PlayerQuests = {
      active: updatedActive,
      completed: updatedCompleted,
      failed: [],
    };
    localStorage.setItem(`quests_${options.playerId}`, JSON.stringify(playerQuests));
  };

  const failQuest = (questId: string) => {
    const questIndex = activeQuests.findIndex((q) => q.id === questId);
    if (questIndex === -1) return;

    const [quest] = activeQuests.splice(questIndex, 1);
    setActiveQuests([...activeQuests]);
    // Note: failed quests could be stored separately
  };

  const updateProgress = (questId: string, increment: number) => {
    const questIndex = activeQuests.findIndex((q) => q.id === questId);
    if (questIndex === -1) return;

    const quest = activeQuests[questIndex];
    const newProgress = quest.progress.current + increment;

    if (newProgress >= quest.progress.target) {
      // Quest complete
      setTimeout(() => completeQuest(questId), 0);
    } else {
      const updated = [...activeQuests];
      updated[questIndex] = {
        ...quest,
        progress: { ...quest.progress, current: newProgress },
      };
      setActiveQuests(updated);
    }
  };

  return {
    activeQuests,
    completedQuests,
    loading,
    completeQuest,
    failQuest,
    updateProgress,
  };
}
