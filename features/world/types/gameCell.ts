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
  buildability?: 'buildable' | 'non_buildable' | 'restricted'; // New field from geography
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
  // Cell is buildable if it's claimed AND the underlying geography allows building
  if (cell.status !== "claimed" && cell.status !== "under_construction") {
    return false;
  }
  // Check buildability status (undefined means buildable by default)
  return cell.buildability !== 'non_buildable' && cell.buildability !== 'restricted';
}

/**
 * Get all buildable cells from a list
 */
export function getBuildableCells(cells: GameCell[]): GameCell[] {
  return cells.filter(c => c.buildability === 'buildable' || !c.buildability);
}
