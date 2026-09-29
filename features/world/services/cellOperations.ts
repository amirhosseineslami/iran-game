import type { GameCell, CellClaimResult } from "../types/gameCell";

export function claimCell(
  cell: GameCell,
  playerId: string
): CellClaimResult {
  if (cell.status !== "available") {
    return {
      success: false,
      reason: "cell_not_available",
      cell,
    };
  }

  return {
    success: true,
    cell: {
      ...cell,
      status: "claimed",
      ownerId: playerId,
      claimedAt: Date.now(),
    },
  };
}

export function startConstruction(
  cell: GameCell,
  _playerId: string
): CellClaimResult {
  if (cell.status !== "claimed") {
    return {
      success: false,
      reason: "cell_not_claimed",
      cell,
    };
  }

  return {
    success: true,
    cell: {
      ...cell,
      status: "under_construction",
      constructionStartedAt: Date.now(),
    },
  };
}
