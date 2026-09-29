export type GameCellStatus =
  | "available"      // Cell not yet claimed
  | "pending_claim"  // Claim requested but not yet confirmed
  | "claimed"        // Owned by a player
  | "under_construction"; // Player has started building

export type LngLat = [number, number];

export interface GameCell {
  id: string;
  row: number;
  col: number;
  status: GameCellStatus;
  ownerId: string | null;
  polygon: LngLat[][];
  createdAt?: number;
  claimedAt?: number;
  constructionStartedAt?: number;
}

export interface CellClaimResult {
  success: boolean;
  reason?: string;
  cell?: GameCell;
}

export function isCellAvailable(cell: GameCell): boolean {
  return cell.status === "available";
}

export function isCellClaimed(cell: GameCell): boolean {
  return cell.status === "claimed";
}

export function isCellBuildable(cell: GameCell): boolean {
  return cell.status === "claimed" || cell.status === "under_construction";
}
