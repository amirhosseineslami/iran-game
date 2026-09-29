import type { GameCell, CellClaimResult } from "../types/gameCell";

export function claimCell(
  cell: GameCell,
  playerId: string
): CellClaimResult {
  if (cell.status === "claimed") {
    return {
      success: false,
      reason: "already_claimed",
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
