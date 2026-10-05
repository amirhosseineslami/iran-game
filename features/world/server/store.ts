import type { GameCell } from "@/features/world/types/gameCell";
import { getBackendState, type PersistenceMode } from "./backends";
import type { Bbox, ClaimAttempt, ClaimOutcome } from "./backends/cellBackend";

/**
 * The single gateway for game-cell state used by the API routes.
 *
 * Resolves the storage backend once per process (PostgreSQL when
 * DATABASE_URL is configured and reachable, otherwise the in-memory
 * fallback — see backends/index.ts for the exact rules) and exposes a
 * small async API. Both /api/cells and /api/claims read and write through
 * this module, so the two routes can never disagree about state.
 *
 * Exported names match the original synchronous store so call sites and
 * tests only needed `await` added.
 */

export type { Bbox, ClaimAttempt, ClaimOutcome };

export async function getAllCells(): Promise<GameCell[]> {
  return (await getBackendState()).backend.getAllCells();
}

export async function getCellsInBbox(bbox: Bbox): Promise<GameCell[]> {
  return (await getBackendState()).backend.getCellsInBbox(bbox);
}

export async function getCellById(id: string): Promise<GameCell | null> {
  return (await getBackendState()).backend.getCellById(id);
}

export async function getCellsForPlayer(playerId: string): Promise<GameCell[]> {
  return (await getBackendState()).backend.getCellsForPlayer(playerId);
}

export async function replaceCell(cell: GameCell): Promise<void> {
  return (await getBackendState()).backend.replaceCell(cell);
}

export async function attemptClaim(input: ClaimAttempt): Promise<ClaimOutcome> {
  return (await getBackendState()).backend.attemptClaim(input);
}

export async function releaseClaim(cellId: string, playerId: string): Promise<boolean> {
  return (await getBackendState()).backend.releaseClaim(cellId, playerId);
}

/** Persistence status for GET /api/health — never exposes credentials. */
export async function getPersistenceStatus(): Promise<{
  mode: PersistenceMode;
  kind: string;
  detail: string;
}> {
  const state = await getBackendState();
  return { mode: state.mode, kind: state.backend.kind, detail: state.detail };
}
