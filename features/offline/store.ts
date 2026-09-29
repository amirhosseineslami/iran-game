export interface OfflineOperation {
  id: string;
  type: "claim" | "build" | "location_update" | "quest_complete";
  playerId: string;
  sessionId: string;
  payload: Record<string, unknown>;
  timestamp: number;
  status: "pending" | "retrying" | "synced" | "failed";
  retryCount: number;
  lastError?: string;
}

export interface SyncConflict {
  operationId: string;
  serverVersion: number;
  clientVersion: number;
  resolution?: "client_wins" | "server_wins" | "merge";
  resolvedAt?: number;
}

const OP_QUEUE_KEY = "iran_game_offline_queue";
const CONFLICTS_KEY = "iran_game_sync_conflicts";

class OfflineStore {
  private getQueue(): OfflineOperation[] {
    try {
      const raw = localStorage.getItem(OP_QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private saveQueue(queue: OfflineOperation[]): void {
    localStorage.setItem(OP_QUEUE_KEY, JSON.stringify(queue));
  }

  getPendingOperations(playerId: string): OfflineOperation[] {
    return this.getQueue().filter((op) => op.playerId === playerId && op.status !== "synced");
  }

  addOperation(operation: Omit<OfflineOperation, "id" | "timestamp" | "status" | "retryCount">): string {
    const queue = this.getQueue();
    const newOp: OfflineOperation = {
      ...operation,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      status: "pending",
      retryCount: 0,
    };
    queue.push(newOp);
    this.saveQueue(queue);
    return newOp.id;
  }

  markSynced(operationId: string): void {
    const queue = this.getQueue().filter((op) => op.id !== operationId);
    this.saveQueue(queue);
  }

  markFailed(operationId: string, error: string): void {
    const queue = this.getQueue();
    const op = queue.find((o) => o.id === operationId);
    if (op) {
      op.status = "failed";
      op.retryCount++;
      op.lastError = error;
      this.saveQueue(queue);
    }
  }

  markRetrying(operationId: string): void {
    const queue = this.getQueue();
    const op = queue.find((o) => o.id === operationId);
    if (op) op.status = "retrying";
    this.saveQueue(queue);
  }

  saveConflicts(conflicts: SyncConflict[]): void {
    localStorage.setItem(CONFLICTS_KEY, JSON.stringify(conflicts));
  }

  getUnresolvedConflicts(): SyncConflict[] {
    try {
      const raw = localStorage.getItem(CONFLICTS_KEY);
      if (!raw) return [];
      return JSON.parse(raw).filter((c: SyncConflict) => !c.resolution);
    } catch {
      return [];
    }
  }

  resolveConflict(operationId: string, resolution: SyncConflict["resolution"]): void {
    try {
      const conflicts: SyncConflict[] = JSON.parse(localStorage.getItem(CONFLICTS_KEY) ?? "[]");
      const conflict = conflicts.find((c: SyncConflict) => c.operationId === operationId);
      if (conflict) {
        conflict.resolution = resolution;
        conflict.resolvedAt = Date.now();
        localStorage.setItem(CONFLICTS_KEY, JSON.stringify(conflicts));
      }
    } catch {
      // Silently fail
    }
  }
}

export const offlineStore = new OfflineStore();
