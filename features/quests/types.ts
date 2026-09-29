export type QuestType =
  | "claim_cell"
  | "build_structure"
  | "collect_resources"
  | "visit_location"
  | "social_interaction";

export interface QuestProgress {
  current: number;
  target: number;
}

export interface Quest {
  id: string;
  title: { en: string; fa: string };
  description: { en: string; fa: string };
  type: QuestType;
  status: "active" | "completed" | "failed";
  reward: {
    experience: number;
    coins?: number;
    items?: Array<{ itemId: string; quantity: number }>;
  };
  progress: QuestProgress;
  createdAt: number;
  expiresAt?: number;
  requirements?: Record<string, unknown>;
}

export interface Objective {
  id: string;
  questId: string;
  description: { en: string; fa: string };
  type: string;
  target: number;
  current: number;
  completed: boolean;
}

export interface PlayerQuests {
  active: Quest[];
  completed: Quest[];
  failed: Quest[];
}
