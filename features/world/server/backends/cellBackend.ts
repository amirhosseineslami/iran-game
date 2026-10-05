import type { GameCell } from "@/features/world/types/gameCell";

/**
 * Storage contract for game cells.
 *
 * Two implementations exist:
 * - MemoryCellBackend:   deterministic, used by tests and as an explicit,
 *                        clearly-logged development fallback.
 * - PostgresCellBackend: the production path (PostgreSQL + PostGIS).
 *
 * The API routes never talk to an implementation directly — they go through
 * `features/world/server/store.ts`, which resolves the backend once and
 * caches it for the lifetime of the process.
 */

export interface Bbox {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

export interface ClaimAttempt {
  cellId: string;
  playerId: string;
  timestamp: number;
  sessionId?: string;
}

export type ClaimOutcome =
  | { ok: true; cell: GameCell; duplicate: boolean }
  | { ok: false; reason: string; duplicate: boolean };

export interface CellBackend {
  readonly kind: "memory" | "postgres";

  getAllCells(): Promise<GameCell[]>;
  /** Cells whose center lies inside the bbox (same semantics for both backends). */
  getCellsInBbox(bbox: Bbox): Promise<GameCell[]>;
  getCellById(id: string): Promise<GameCell | null>;
  getCellsForPlayer(playerId: string): Promise<GameCell[]>;
  replaceCell(cell: GameCell): Promise<void>;
  attemptClaim(input: ClaimAttempt): Promise<ClaimOutcome>;
  releaseClaim(cellId: string, playerId: string): Promise<boolean>;
  /** Optional cleanup for tests / graceful shutdown. */
  close?(): Promise<void>;
}
