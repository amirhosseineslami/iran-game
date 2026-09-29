import type { PersistedGameCell, PersistedPlayer, PersistedGameState, PersistedPosition } from "./types";

export interface PlayerRepository {
  findById(id: string): Promise<PersistedPlayer | null>;
  findByUsername(username: string): Promise<PersistedPlayer | null>;
  findByEmail(email: string): Promise<PersistedPlayer | null>;
  create(player: Omit<PersistedPlayer, "id" | "createdAt" | "updatedAt">): Promise<PersistedPlayer>;
  update(id: string, updates: Partial<PersistedPlayer>): Promise<PersistedPlayer>;
}

export interface SessionRepository {
  findById(id: string): Promise<PersistedGameState | null>;
  findByToken(token: string): Promise<PersistedGameState | null>;
  findByPlayerId(playerId: string): Promise<PersistedGameState[]>;
  create(session: Omit<PersistedGameState, "id" | "createdAt" | "updatedAt">): Promise<PersistedGameState>;
  update(id: string, updates: Partial<PersistedGameState>): Promise<PersistedGameState>;
  delete(id: string): Promise<void>;
}

export interface CellRepository {
  findById(id: string): Promise<PersistedGameCell | null>;
  findByPosition(sessionId: string, row: number, col: number): Promise<PersistedGameCell | null>;
  findNearby(point: { lat: number; lng: number }, radiusMeters: number, sessionId: string): Promise<PersistedGameCell[]>;
  findByPlayer(playerId: string, sessionId?: string): Promise<PersistedGameCell[]>;
  save(cell: PersistedGameCell): Promise<PersistedGameCell>;
  delete(id: string): Promise<void>;
}

export interface PositionRepository {
  save(position: PersistedPosition): Promise<PersistedPosition>;
  findRecent(playerId: string, limit: number): Promise<PersistedPosition[]>;
  findBetween(playerId: string, from: number, to: number): Promise<PersistedPosition[]>;
}

export interface AuditLogRepository {
  log(entry: {
    sessionId: string | null;
    playerId: string | null;
    action: string;
    entityType: string | null;
    entityId: string | null;
    oldValue: Record<string, unknown> | null;
    newItem: Record<string, unknown> | null;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void>;
  findRecent(limit: number): Promise<Array<{ action: string; timestamp: number }>>;
}

export interface RepositoryFactory {
  getPlayers(): PlayerRepository;
  getSessions(): SessionRepository;
  getCells(): CellRepository;
  getPositions(): PositionRepository;
  getAuditLog(): AuditLogRepository;
}
