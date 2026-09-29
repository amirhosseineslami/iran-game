import type { PersistedGameCell, PersistedPosition } from "../types";

const cellStore = new Map<string, PersistedGameCell>();
const positionStore = new Map<string, PersistedPosition>();

export function savePosition(position: PersistedPosition): void {
  positionStore.set(position.id, position);
}

export function findRecentPositions(playerId: string, limit: number): PersistedPosition[] {
  return Array.from(positionStore.values())
    .filter((p) => p.playerId === playerId)
    .sort((a, b) => b.recordedAt - a.recordedAt)
    .slice(0, limit);
}

// Game cell store
export const gameCellMemoryStore = {
  findById(id: string): PersistedGameCell | null {
    return cellStore.get(id) ?? null;
  },
  findByPosition(sessionId: string, row: number, col: number): PersistedGameCell | null {
    for (const cell of cellStore.values()) {
      if (cell.sessionId === sessionId && cell.rowNum === row && cell.colNum === col) return cell;
    }
    return null;
  },
  async findNearby(point: { lat: number; lng: number }, radiusMeters: number, sessionId: string): Promise<PersistedGameCell[]> {
    const nearby: PersistedGameCell[] = [];
    for (const cell of cellStore.values()) {
      if (cell.sessionId !== sessionId) continue;
      const coords = cell.polygon[0];
      let cellLat = 0, cellLng = 0;
      for (const [cLng, cLat] of coords) { cellLat += cLat; cellLng += cLng; }
      cellLat /= coords.length; cellLng /= coords.length;
      const dist = Math.abs(cellLat - point.lat) * 111320 + Math.abs(cellLng - point.lng) * 111320 * Math.cos((point.lat * Math.PI) / 180);
      if (dist <= radiusMeters) nearby.push(cell);
    }
    return nearby;
  },
  async findByPlayer(playerId: string, sessionId?: string): Promise<PersistedGameCell[]> {
    return Array.from(cellStore.values()).filter((c) => c.playerId === playerId && (!sessionId || c.sessionId === sessionId));
  },
  async save(cell: PersistedGameCell): Promise<PersistedGameCell> {
    cellStore.set(cell.id, cell);
    return cell;
  },
  async delete(id: string): Promise<void> {
    cellStore.delete(id);
  },
};
