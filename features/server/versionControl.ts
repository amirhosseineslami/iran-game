import type { GameCell } from "../world/types/gameCell";

export interface CellVersion {
  version: number;
  updatedAt: number;
}

export type VersionStore = Map<string, CellVersion>;

const versionStore: VersionStore = new Map();

export function getVersion(cellId: string): number {
  return versionStore.get(cellId)?.version ?? 0;
}

export function incrementVersion(cellId: string): void {
  const current = versionStore.get(cellId) ?? { version: 0, updatedAt: 0 };
  versionStore.set(cellId, { version: current.version + 1, updatedAt: Date.now() });
}

export function getVersionForUpdate(cellId: string, expectedVersion: number): void {
  const current = versionStore.get(cellId);
  if (!current || current.version !== expectedVersion) {
    throw new Error(`Version mismatch for ${cellId}: expected ${expectedVersion}, got ${current?.version ?? 0}`);
  }
}

export function clearVersion(cellId: string): void {
  versionStore.delete(cellId);
}

export function resetAll(): void {
  versionStore.clear();
}

export function assertCellVersion(cell: GameCell, expectedVersion: number): void {
  const current = getVersion(cell.id);
  if (current !== expectedVersion) {
    throw new Error(
      `Stale cell version for ${cell.id}: expected ${expectedVersion}, got ${current}`,
    );
  }
}
