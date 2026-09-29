import type { GameCell } from "../world/types/gameCell";

export interface PersistedGameCell extends Omit<GameCell, "row" | "col"> {
  id: string;
  sessionId: string;
  playerId: string | null;
  rowNum: number;
  colNum: number;
  createdAt: number;
  updatedAt: number;
}

export interface PersistedPlayer {
  id: string;
  username: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  stats: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

export interface PersistedGameState {
  id: string;
  playerId: string;
  sessionToken: string;
  status: "active" | "suspended" | "ended";
  startedAt: number;
  lastActiveAt: number;
  endedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface PersistedPosition {
  id: string;
  playerId: string;
  sessionId: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude: number | null;
  qualityScore: number;
  heading: number | null;
  speed: number | null;
  recordedAt: number;
}

export function mapGameCellToPersisted(cell: GameCell, sessionId: string, playerId: string | null): PersistedGameCell {
  const now = Date.now();
  return {
    ...cell,
    id: cell.id,
    sessionId,
    playerId,
    rowNum: cell.row,
    colNum: cell.col,
    createdAt: cell.createdAt ?? now,
    updatedAt: now,
  };
}

export function mapPersistedToGameCell(persisted: PersistedGameCell): GameCell {
  return {
    id: persisted.id,
    row: persisted.rowNum,
    col: persisted.colNum,
    status: persisted.status,
    ownerId: persisted.playerId,
    polygon: persisted.polygon,
    createdAt: persisted.createdAt,
    claimedAt: persisted.claimedAt ?? undefined,
    constructionStartedAt: persisted.constructionStartedAt ?? undefined,
  };
}
