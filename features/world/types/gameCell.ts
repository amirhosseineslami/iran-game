export type GameCellStatus = "available" | "claimed" | "under_construction";

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
}

export interface CellClaimResult {
  success: boolean;
  reason?: string;
  cell?: GameCell;
}
