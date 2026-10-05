import type { GameCell } from "@/features/world/types/gameCell";
import { generateTestFeatures } from "@/features/world/services/__fixtures__/testGeography";
import { generateCellsFromGeography } from "@/features/world/services/generateBuildableCells";
import type { Bbox, CellBackend, ClaimAttempt, ClaimOutcome } from "./cellBackend";

/**
 * In-memory cell store. This is the original prototype store, kept as:
 * - the deterministic backend for unit tests
 * - an explicit, loudly-logged development fallback when PostgreSQL is
 *   unavailable (never used silently — see backends/index.ts).
 *
 * State lives on globalThis so it survives Next.js dev-server hot reloads.
 */

interface StoreState {
  cells: Map<string, GameCell>;
  processedSessions: Set<string>;
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
  return { cells: map, processedSessions: new Set(), seeded: true };
}

function getStore(): StoreState {
  if (!globalThis.__iranGameStore || !globalThis.__iranGameStore.seeded) {
    globalThis.__iranGameStore = seed();
  }
  return globalThis.__iranGameStore;
}

/** Test helper: drop all in-memory world state. */
export function resetMemoryStore(): void {
  globalThis.__iranGameStore = undefined;
}

function getCellCenter(cell: GameCell): { lng: number; lat: number } {
  const ring = cell.polygon[0];
  let sumLng = 0;
  let sumLat = 0;
  for (const [lng, lat] of ring) {
    sumLng += lng;
    sumLat += lat;
  }
  return { lng: sumLng / ring.length, lat: sumLat / ring.length };
}

export class MemoryCellBackend implements CellBackend {
  readonly kind = "memory" as const;

  async getAllCells(): Promise<GameCell[]> {
    return Array.from(getStore().cells.values());
  }

  async getCellsInBbox(bbox: Bbox): Promise<GameCell[]> {
    const out: GameCell[] = [];
    for (const cell of getStore().cells.values()) {
      const c = getCellCenter(cell);
      if (
        c.lng >= bbox.minLng &&
        c.lng <= bbox.maxLng &&
        c.lat >= bbox.minLat &&
        c.lat <= bbox.maxLat
      ) {
        out.push(cell);
      }
    }
    return out;
  }

  async getCellById(id: string): Promise<GameCell | null> {
    return getStore().cells.get(id) ?? null;
  }

  async getCellsForPlayer(playerId: string): Promise<GameCell[]> {
    const out: GameCell[] = [];
    for (const cell of getStore().cells.values()) {
      if (cell.ownerId === playerId) out.push(cell);
    }
    return out;
  }

  async replaceCell(cell: GameCell): Promise<void> {
    getStore().cells.set(cell.id, cell);
  }

  async attemptClaim(input: ClaimAttempt): Promise<ClaimOutcome> {
    // NOTE: the read-validate-write below must stay synchronous (no awaits
    // between the check and the set) so concurrent claims cannot interleave
    // and both observe "available".
    const store = getStore();

    // Idempotency: if this sessionId was already processed, return the original result
    if (input.sessionId && store.processedSessions.has(input.sessionId)) {
      const cell = store.cells.get(input.cellId) ?? null;
      if (cell && cell.status === "claimed" && cell.ownerId === input.playerId) {
        return { ok: true, cell, duplicate: true };
      }
    }

    const cell = store.cells.get(input.cellId) ?? null;
    if (!cell) return { ok: false, reason: "CELL_NOT_FOUND", duplicate: false };
    if (cell.status !== "available") return { ok: false, reason: "CELL_NOT_AVAILABLE", duplicate: false };
    if (cell.buildability === "non_buildable" || cell.buildability === "restricted") {
      return { ok: false, reason: "CELL_NOT_BUILDABLE", duplicate: false };
    }

    const updated: GameCell = {
      ...cell,
      status: "claimed",
      ownerId: input.playerId,
      claimedAt: input.timestamp,
    };
    store.cells.set(updated.id, updated);

    // Mark session as processed for idempotency
    if (input.sessionId) {
      store.processedSessions.add(input.sessionId);
    }

    return { ok: true, cell: updated, duplicate: false };
  }

  async releaseClaim(cellId: string, playerId: string): Promise<boolean> {
    // Synchronous read-validate-write (see attemptClaim note).
    const store = getStore();
    const cell = store.cells.get(cellId);
    if (!cell) return false;
    if (cell.ownerId !== playerId) return false;
    if (cell.status !== "claimed") return false;

    store.cells.set(cellId, {
      ...cell,
      status: "available",
      ownerId: null,
      claimedAt: undefined,
    });
    return true;
  }
}
