import type { GameCell } from "../world/types/gameCell";
import type { OfflineOperation } from "./store";

export interface ConflictResolutionStrategy {
  name: string;
  describe: () => string;
  resolve: (
    serverCell: GameCell | null,
    clientOperation: OfflineOperation,
  ) => { action: "accept" | "reject" | "modify"; reason?: string; modifiedCell?: GameCell };
}

export class FirstComeFirstServedStrategy implements ConflictResolutionStrategy {
  readonly name = "first_come_first_served";

  describe() {
    return "Earlier operations take precedence";
  }

  resolve(serverCell: GameCell | null, clientOperation: OfflineOperation) {
    if (!serverCell) return { action: "accept" as const };
    const serverClaimed = serverCell.claimedAt;
    const clientTimestamp = clientOperation.timestamp;
    if (clientTimestamp < (serverClaimed ?? Infinity)) {
      return { action: "reject" as const, reason: "Server already claimed before client operation" };
    }
    return { action: "accept" as const };
  }
}

export class ClientWinsStrategy implements ConflictResolutionStrategy {
  readonly name = "client_wins";

  describe() {
    return "Client-side state always takes precedence";
  }

  resolve(_serverCell: GameCell | null, _clientOperation: OfflineOperation) {
    return { action: "accept" as const };
  }
}

export class ServerWinsStrategy implements ConflictResolutionStrategy {
  readonly name = "server_wins";

  describe() {
    return "Server-side state always takes precedence";
  }

  resolve(serverCell: GameCell | null, _clientOperation: OfflineOperation) {
    if (!serverCell || serverCell.status === "available") return { action: "accept" as const };
    return { action: "reject" as const, reason: "Server state differs from client state" };
  }
}

export class SmartMergeStrategy implements ConflictResolutionStrategy {
  readonly name = "smart_merge";

  describe() {
    return "Combine non-conflicting fields from both sides";
  }

  resolve(serverCell: GameCell | null, clientOperation: OfflineOperation) {
    if (!serverCell) return { action: "accept" as const };

    // Only accept if the cell status is compatible
    const incompatible = ["claimed", "under_construction"];
    if (incompatible.includes(serverCell.status) && clientOperation.type === "claim") {
      return { action: "reject" as const, reason: "Cell is no longer available" };
    }

    // Otherwise accept and let the caller merge non-conflicting fields
    return { action: "accept" as const };
  }
}

export type ConflictResolver = (
  serverCell: GameCell | null,
  operation: OfflineOperation,
) => Promise<{ action: "accept" | "reject" | "modify"; reason?: string; modifiedCell?: GameCell }>;

const defaultStrategies: Record<string, ConflictResolutionStrategy> = {
  first_come_first_served: new FirstComeFirstServedStrategy(),
  client_wins: new ClientWinsStrategy(),
  server_wins: new ServerWinsStrategy(),
  smart_merge: new SmartMergeStrategy(),
};

export function getStrategy(name: string): ConflictResolutionStrategy {
  return defaultStrategies[name] ?? defaultStrategies.first_come_first_served;
}
