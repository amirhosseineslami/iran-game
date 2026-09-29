import type { GameCell } from "../types/gameCell";

export interface BuildValidationResult {
  valid: boolean;
  reason?: "not_owned" | "already_built" | "too_close_to_own" | "too_close_to_enemy";
}

export function validateBuild(
  cell: GameCell,
  playerId: string,
  neighbors: GameCell[]
): BuildValidationResult {
  if (cell.ownerId !== playerId) {
    return { valid: false, reason: "not_owned" };
  }

  if (cell.status === "under_construction") {
    return { valid: false, reason: "already_built" };
  }

  const hasOwnNeighbor = neighbors.some(
    (n) =>
      n.ownerId === playerId &&
      Math.abs(n.row - cell.row) <= 1 &&
      Math.abs(n.col - cell.col) <= 1
  );

  if (hasOwnNeighbor) {
    return { valid: false, reason: "too_close_to_own" };
  }

  const hasEnemyNeighbor = neighbors.some(
    (n) =>
      n.ownerId !== null &&
      n.ownerId !== playerId &&
      Math.abs(n.row - cell.row) <= 2 &&
      Math.abs(n.col - cell.col) <= 2
  );

  if (hasEnemyNeighbor) {
    return { valid: false, reason: "too_close_to_enemy" };
  }

  return { valid: true };
}
