import type { ClaimRequest, ClaimResult } from "./claimEngine";

export interface ClaimRoutes {
  postClaim(payload: { sessionId: string; playerId: string; cellId: string; timestamp: number; signature?: string }): Promise<ClaimResult>;
  cancelClaim(cellId: string, playerId: string): Promise<boolean>;
  confirmClaim(cellId: string, playerId: string): Promise<boolean>;
}

export type { ClaimRequest, ClaimResult };
