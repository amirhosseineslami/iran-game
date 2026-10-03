/**
 * Player progression system — XP, levels, and territory milestones.
 *
 * Domain rules:
 * - Claiming a territory grants XP based on cell buildability
 * - Levels unlock at increasing XP thresholds
 * - Territory milestones grant bonus XP
 */

export interface LevelDefinition {
  level: number;
  xpRequired: number;
  title: string;
  titleFa: string;
}

export interface ProgressionState {
  xp: number;
  level: number;
  territoriesClaimed: number;
  nextLevelXp: number;
  progressToNext: number; // 0-1
}

// XP rewards
export const XP_PER_CLAIM = 25;
export const XP_PER_TERRITORY_MILESTONE = 100;
export const MILESTONE_INTERVAL = 5; // every 5 territories

// Level thresholds — cumulative XP required
export const LEVELS: LevelDefinition[] = [
  { level: 1, xpRequired: 0, title: "Newcomer", titleFa: "تازه‌وارد" },
  { level: 2, xpRequired: 100, title: "Explorer", titleFa: "کاوشگر" },
  { level: 3, xpRequired: 250, title: "Settler", titleFa: "سکونت‌گزین" },
  { level: 4, xpRequired: 500, title: "Builder", titleFa: "سازنده" },
  { level: 5, xpRequired: 800, title: "Strategist", titleFa: "راهبرد" },
  { level: 6, xpRequired: 1200, title: "Commander", titleFa: "فرمانده" },
  { level: 7, xpRequired: 1700, title: "Governor", titleFa: "فرماندار" },
  { level: 8, xpRequired: 2300, title: "Warlord", titleFa: "جنگ‌سالار" },
  { level: 9, xpRequired: 3000, title: "Supreme Leader", titleFa: "رهبر برتر" },
  { level: 10, xpRequired: 4000, title: "Legend", titleFa: "افسانه" },
];

export function getLevelForXp(xp: number): LevelDefinition {
  let current = LEVELS[0];
  for (const level of LEVELS) {
    if (xp >= level.xpRequired) {
      current = level;
    } else {
      break;
    }
  }
  return current;
}

export function getNextLevel(xp: number): LevelDefinition | null {
  for (const level of LEVELS) {
    if (xp < level.xpRequired) {
      return level;
    }
  }
  return null;
}

export function calculateProgression(
  xp: number,
  territoriesClaimed: number
): ProgressionState {
  const currentLevel = getLevelForXp(xp);
  const nextLevel = getNextLevel(xp);

  const nextLevelXp = nextLevel?.xpRequired ?? currentLevel.xpRequired;
  const prevLevelXp = currentLevel.xpRequired;
  const progressToNext =
    nextLevelXp === prevLevelXp
      ? 1
      : (xp - prevLevelXp) / (nextLevelXp - prevLevelXp);

  return {
    xp,
    level: currentLevel.level,
    territoriesClaimed,
    nextLevelXp,
    progressToNext: Math.min(1, Math.max(0, progressToNext)),
  };
}

export function calculateClaimXp(
  currentTerritories: number,
  buildability: string | undefined
): { xp: number; isMilestone: boolean } {
  let xp = XP_PER_CLAIM;
  const newTotal = currentTerritories + 1;
  const isMilestone = newTotal % MILESTONE_INTERVAL === 0;

  if (isMilestone) {
    xp += XP_PER_TERRITORY_MILESTONE;
  }

  // Bonus XP for restricted cells (harder to claim)
  if (buildability === "restricted") {
    xp = Math.round(xp * 1.5);
  }

  return { xp, isMilestone };
}
