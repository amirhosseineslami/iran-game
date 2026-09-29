import { offlineStore } from "./store";
import type { OfflineOperation } from "./store";

export interface SyncResult {
  synced: number;
  failed: number;
  conflicts: Array<{ operationId: string; resolution: string }>;
}

export class OfflineSyncEngine {
  constructor(
    private readonly syncOperation: (op: OfflineOperation) => Promise<{ success: boolean; serverVersion?: number; conflict?: { action: string; reason?: string } }>,
    private readonly strategyName: string = "first_come_first_served",
  ) {}

  async syncPending(playerId: string): Promise<SyncResult> {
    const pending = offlineStore.getPendingOperations(playerId);
    if (pending.length === 0) {
      return { synced: 0, failed: 0, conflicts: [] };
    }

    let synced = 0;
    let failed = 0;
    const conflicts: Array<{ operationId: string; resolution: string }> = [];

    for (const op of pending) {
      offlineStore.markRetrying(op.id);

      try {
        const result = await this.syncOperation(op);
        if (result.success) {
          offlineStore.markSynced(op.id);
          synced++;
        } else if (result.conflict) {
          offlineStore.markFailed(op.id, result.conflict.reason ?? "Sync conflict");
          conflicts.push({ operationId: op.id, resolution: result.conflict.action });
          failed++;
        } else {
          offlineStore.markFailed(op.id, "Unknown sync error");
          failed++;
        }
      } catch {
        offlineStore.markFailed(op.id, "Network error during sync");
        failed++;
      }
    }

    return { synced, failed, conflicts };
  }

  getPendingCount(playerId: string): number {
    return offlineStore.getPendingOperations(playerId).length;
  }

  getConflicts(playerId: string): Array<{ operationId: string; resolution: string }> {
    const pending = offlineStore.getPendingOperations(playerId);
    return pending.map((op) => ({ operationId: op.id, resolution: op.lastError ?? "unknown" }));
  }
}
