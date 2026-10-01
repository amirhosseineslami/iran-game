import type { GameCell, LngLat } from "@/features/world/types/gameCell";
import { generateTestFeatures } from "@/features/world/services/__fixtures__/testGeography";
import { generateCellsFromGeography } from "@/features/world/services/generateBuildableCells";

/**
 * Single in-memory store for the development build.
 * Both /api/cells and /api/claims read and write through this module,
 * so the two routes can never disagree about state.
 *
 * This module is replaced by a Postgres-backed repository in a later
 * milestone; the API surface below is intentionally small so that
 * migration is a straight swap.
 */

interface StoreState {
  cells: Map<string, GameCell>;
  seeded: boolean;
}

declare global {
  // eslint-disable-next-line no-var
  var __iranGameStore: StoreState | undefined;
}

function seed(): StoreState {
  const features = generateTestFeatures();
  const cells = generateCellsFromGeography(features);
  const map = new Map<string, GameCell>();
  for (const cell of cells) {
    map.set(cell.id, cell);
  }
  return { cells: map, seeded: true };
}

function getStore(): StoreState {
  if (!globalThis.__iranGameStore || !globalThis.__iranGameStore.seeded) {
    globalThis.__iranGameStore = seed();
  }
  return globalThis.__iranGameStore;
}

export function getAllCells(): GameCell[] {
  return Array.from(getStore().cells.values());
}

export function getCellById(id: string): GameCell | null {
  return getStore().cells.get(id) ?? null;
}

export function getCellsForPlayer(playerId: string): GameCell[] {
  const out: GameCell[] = [];
  for (const cell of getStore().cells.values()) {
    if (cell.ownerId === playerId) out.push(cell);
  }
  return out;
}

export function replaceCell(cell: GameCell): void {
  getStore().cells.set(cell.id, cell);
}

export interface ClaimAttempt {
  cellId: string;
  playerId: string;
  timestamp: number;
}

export type ClaimOutcome =
  | { ok: true; cell: GameCell }
  | { ok: false; reason: string };

export function attemptClaim(input: ClaimAttempt): ClaimOutcome {
  const cell = getCellById(input.cellId);
  if (!cell) return { ok: false, reason: "CELL_NOT_FOUND" };
  if (cell.status !== "available") return { ok: false, reason: "CELL_NOT_AVAILABLE" };
  if (cell.buildability === "non_buildable" || cell.buildability === "restricted") {
    return { ok: false, reason: "CELL_NOT_BUILDABLE" };
  }

  const updated: GameCell = {
    ...cell,
    status: "claimed",
    ownerId: input.playerId,
    claimedAt: input.timestamp,
  };
  replaceCell(updated);
  return { ok: true, cell: updated };
}

export function releaseClaim(cellId: string, playerId: string): boolean {
  const cell = getCellById(cellId);
  if (!cell) return false;
  if (cell.ownerId !== playerId) return false;
  if (cell.status !== "claimed") return false;

  replaceCell({
    ...cell,
    status: "available",
    ownerId: null,
    claimedAt: undefined,
  });
  return true;
}
