import type { GameCell } from "../world/types/gameCell";

export interface ClaimRequest {
  sessionId: string;
  playerId: string;
  cellId: string;
  timestamp: number;
  signature?: string; // client-side signature for verification
}

export interface ClaimResult {
  success: boolean;
  reason?: string;
  cell?: GameCell;
  sessionId: string;
}

export interface ConflictResolution {
  winner: string;
  loser: string;
  winningTimestamp: number;
  losingTimestamp: number;
  resolution: "first_come_first_served" | "highest_quality" | "manual_review";
}

const MAX_PENDING_CLAIMS_PER_PLAYER = 5;
const CLAIM_EXPIRY_MS = 30_000; // 30 seconds
const MAX_CONFLICT_RETRIES = 3;

export class ServerClaimEngine {
  private pendingClaims: Map<string, ClaimRequest> = new Map();
  private conflicts: Map<string, ConflictResolution[]> = new Map();

  constructor(
    private readonly getCell: (id: string) => Promise<GameCell | null>,
    private readonly getCellsByPlayer: (playerId: string) => Promise<GameCell[]>,
    private readonly saveCell: (cell: GameCell) => Promise<void>,
    private readonly logConflict: (resolution: ConflictResolution) => Promise<void>,
  ) {}

  async processClaim(request: ClaimRequest): Promise<ClaimResult> {
    const cell = await this.getCell(request.cellId);
    if (!cell) return { success: false, reason: "CELL_NOT_FOUND", sessionId: request.sessionId };
    if (cell.status !== "available") return { success: false, reason: "CELL_NOT_AVAILABLE", sessionId: request.sessionId };

    const playerCells = await this.getCellsByPlayer(request.playerId);
    if (playerCells.length >= MAX_PENDING_CLAIMS_PER_PLAYER) {
      return { success: false, reason: "MAX_CLAIMS_EXCEEDED", sessionId: request.sessionId };
    }

    const existingClaim = this.pendingClaims.get(request.cellId);
    if (existingClaim && existingClaim.timestamp > request.timestamp - CLAIM_EXPIRY_MS) {
      return await this.handleConflict(existingClaim, request, cell);
    }

    return await this.executeClaim(request, cell, playerCells);
  }

  private async handleConflict(
    existing: ClaimRequest,
    incoming: ClaimRequest,
    cell: GameCell,
  ): Promise<ClaimResult> {
    const conflict: ConflictResolution = {
      winner: existing.timestamp > incoming.timestamp ? existing.playerId : incoming.playerId,
      loser: existing.timestamp > incoming.timestamp ? incoming.playerId : existing.playerId,
      winningTimestamp: Math.max(existing.timestamp, incoming.timestamp),
      losingTimestamp: Math.min(existing.timestamp, incoming.timestamp),
      resolution: "first_come_first_served",
    };

    await this.logConflict(conflict);

    if (conflict.winner === incoming.playerId) {
      return await this.executeClaim(incoming, cell, await this.getCellsByPlayer(incoming.playerId));
    }
    return { success: false, reason: "CONFLICT_LOST", sessionId: incoming.sessionId };
  }

  private async executeClaim(
    request: ClaimRequest,
    cell: GameCell,
    playerCells: GameCell[],
  ): Promise<ClaimResult> {
    this.pendingClaims.set(request.cellId, request);

    const updatedCell: GameCell = {
      ...cell,
      status: "pending_claim",
      ownerId: request.playerId,
      claimedAt: request.timestamp,
    };

    await this.saveCell(updatedCell);

    setTimeout(() => {
      this.pendingClaims.delete(request.cellId);
    }, CLAIM_EXPIRY_MS);

    return { success: true, cell: updatedCell, sessionId: request.sessionId };
  }

  async cancelClaim(cellId: string, playerId: string): Promise<boolean> {
    const request = this.pendingClaims.get(cellId);
    if (!request || request.playerId !== playerId) return false;

    const cell = await this.getCell(cellId);
    if (cell) {
      await this.saveCell({ ...cell, status: "available", ownerId: null, claimedAt: undefined });
    }
    this.pendingClaims.delete(cellId);
    return true;
  }

  async confirmClaim(cellId: string, playerId: string): Promise<boolean> {
    const request = this.pendingClaims.get(cellId);
    if (!request || request.playerId !== playerId) return false;

    const cell = await this.getCell(cellId);
    if (!cell) return false;

    await this.saveCell({ ...cell, status: "claimed" });
    this.pendingClaims.delete(cellId);
    return true;
  }
}
