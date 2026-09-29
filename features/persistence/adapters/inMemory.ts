import type {
  PlayerRepository,
  SessionRepository,
  CellRepository,
  PositionRepository,
  AuditLogRepository,
  RepositoryFactory,
} from "../repositories";
import type { PersistedGameCell, PersistedPlayer, PersistedGameState, PersistedPosition } from "../types";
import { gameCellMemoryStore } from "./memoryStore";

export class InMemoryPlayerRepository implements PlayerRepository {
  private store: Map<string, PersistedPlayer> = new Map();

  async findById(id: string): Promise<PersistedPlayer | null> {
    return this.store.get(id) ?? null;
  }

  async findByUsername(username: string): Promise<PersistedPlayer | null> {
    return Array.from(this.store.values()).find((p) => p.username === username) ?? null;
  }

  async findByEmail(email: string): Promise<PersistedPlayer | null> {
    return Array.from(this.store.values()).find((p) => p.email === email) ?? null;
  }

  async create(player: Omit<PersistedPlayer, "id" | "createdAt" | "updatedAt">): Promise<PersistedPlayer> {
    const id = crypto.randomUUID();
    const now = Date.now();
    const newPlayer: PersistedPlayer = {
      ...player,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.store.set(id, newPlayer);
    return newPlayer;
  }

  async update(id: string, updates: Partial<PersistedPlayer>): Promise<PersistedPlayer> {
    const existing = this.store.get(id);
    if (!existing) throw new Error("Player not found");
    const updated: PersistedPlayer = {
      ...existing,
      ...updates,
      updatedAt: Date.now(),
    };
    this.store.set(id, updated);
    return updated;
  }
}

export class InMemorySessionRepository implements SessionRepository {
  private store: Map<string, PersistedGameState> = new Map();

  async findById(id: string): Promise<PersistedGameState | null> {
    return this.store.get(id) ?? null;
  }

  async findByToken(token: string): Promise<PersistedGameState | null> {
    return Array.from(this.store.values()).find((s) => s.sessionToken === token) ?? null;
  }

  async findByPlayerId(playerId: string): Promise<PersistedGameState[]> {
    return Array.from(this.store.values()).filter((s) => s.playerId === playerId);
  }

  async create(session: Omit<PersistedGameState, "id">): Promise<PersistedGameState> {
    const id = crypto.randomUUID();
    const now = Date.now();
    const newSession: PersistedGameState = { ...session, id, createdAt: now, updatedAt: now, startedAt: now, lastActiveAt: now };
    this.store.set(id, newSession);
    return newSession;
  }

  async update(id: string, updates: Partial<PersistedGameState>): Promise<PersistedGameState> {
    const existing = this.store.get(id);
    if (!existing) throw new Error("Session not found");
    const updated: PersistedGameState = { ...existing, ...updates, updatedAt: Date.now() };
    this.store.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }
}

export class InMemoryCellRepository implements CellRepository {
  async findById(id: string): Promise<PersistedGameCell | null> {
    return gameCellMemoryStore.findById(id);
  }

  async findByPosition(sessionId: string, row: number, col: number): Promise<PersistedGameCell | null> {
    return gameCellMemoryStore.findByPosition(sessionId, row, col);
  }

  async findNearby(point: { lat: number; lng: number }, radiusMeters: number, sessionId: string): Promise<PersistedGameCell[]> {
    return gameCellMemoryStore.findNearby(point, radiusMeters, sessionId);
  }

  async findByPlayer(playerId: string, sessionId?: string): Promise<PersistedGameCell[]> {
    return gameCellMemoryStore.findByPlayer(playerId, sessionId);
  }

  async save(cell: PersistedGameCell): Promise<PersistedGameCell> {
    return gameCellMemoryStore.save(cell);
  }

  async delete(id: string): Promise<void> {
    return gameCellMemoryStore.delete(id);
  }
}

export class InMemoryPositionRepository implements PositionRepository {
  private store: Map<string, PersistedPosition> = new Map();

  async save(position: PersistedPosition): Promise<PersistedPosition> {
    this.store.set(position.id, position);
    return position;
  }

  async findRecent(playerId: string, limit: number): Promise<PersistedPosition[]> {
    return Array.from(this.store.values())
      .filter((p) => p.playerId === playerId)
      .sort((a, b) => b.recordedAt - a.recordedAt)
      .slice(0, limit);
  }

  async findBetween(playerId: string, from: number, to: number): Promise<PersistedPosition[]> {
    return Array.from(this.store.values())
      .filter((p) => p.playerId === playerId && p.recordedAt >= from && p.recordedAt <= to);
  }
}

export class InMemoryAuditLogRepository implements AuditLogRepository {
  private logs: Array<{ entry: { action: string } & Record<string, unknown>; timestamp: number }> = [];

  async log(entry: {
    sessionId: string | null;
    playerId: string | null;
    action: string;
    entityType: string | null;
    entityId: string | null;
    oldValue: Record<string, unknown> | null;
    newItem: Record<string, unknown> | null;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    this.logs.push({ entry, timestamp: Date.now() });
  }

  async findRecent(limit: number): Promise<Array<{ action: string; timestamp: number }>> {
    return this.logs
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit)
      .map(({ entry, timestamp }) => ({ action: entry.action, timestamp }));
  }
}

export class InMemoryRepositoryFactory implements RepositoryFactory {
  getPlayers(): PlayerRepository {
    return new InMemoryPlayerRepository();
  }

  getSessions(): SessionRepository {
    return new InMemorySessionRepository();
  }

  getCells(): CellRepository {
    return new InMemoryCellRepository();
  }

  getPositions(): PositionRepository {
    return new InMemoryPositionRepository();
  }

  getAuditLog(): AuditLogRepository {
    return new InMemoryAuditLogRepository();
  }
}
