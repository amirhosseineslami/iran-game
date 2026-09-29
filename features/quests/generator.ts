import type { Quest, QuestProgress } from "./types";

const QUEST_TEMPLATES: Quest[] = [
  {
    id: "quest_first_claim",
    title: { en: "First Claim", fa: "اولین مالکیت" },
    description: { en: "Claim your first GameCell", fa: "اولین GameCell خود را مالک شوید" },
    type: "claim_cell",
    status: "active",
    reward: { experience: 100, coins: 50 },
    progress: { current: 0, target: 1 },
    createdAt: Date.now(),
  },
  {
    id: "quest_build_first",
    title: { en: "First Builder", fa: "اولین سازنده" },
    description: { en: "Start construction on a claimed cell", fa: "ساخت‌وساز را روی یک سلول مالکیتی شروع کنید" },
    type: "build_structure",
    status: "active",
    reward: { experience: 200, coins: 100 },
    progress: { current: 0, target: 1 },
    createdAt: Date.now(),
  },
  {
    id: "quest_explorer",
    title: { en: "Explorer", fa: "کاوشگر" },
    description: { en: "Visit 5 different cells", fa: "به 5 سلول مختلف سر بزنید" },
    type: "visit_location",
    status: "active",
    reward: { experience: 300, coins: 150 },
    progress: { current: 0, target: 5 },
    createdAt: Date.now(),
  },
  {
    id: "quest_social",
    title: { en: "Social Connector", fa: "ارتباط اجتماعی" },
    description: { en: "Interact with 3 other players", fa: "با 3 بازیکن دیگر تعامل کنید" },
    type: "social_interaction",
    status: "active",
    reward: { experience: 250, coins: 120 },
    progress: { current: 0, target: 3 },
    createdAt: Date.now(),
  },
];

export class QuestGenerator {
  generateNewQuest(type: string, overrides?: Partial<Quest>): Quest {
    const template =
      QUEST_TEMPLATES.find((q) => q.type === type) ?? QUEST_TEMPLATES[0];

    return {
      ...template,
      id: `quest_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      progress: { current: 0, target: template.progress.target },
      ...overrides,
    };
  }

  getAllTemplates(): Quest[] {
    return [...QUEST_TEMPLATES];
  }
}

export const questGenerator = new QuestGenerator();
