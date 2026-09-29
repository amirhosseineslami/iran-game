import type { GameEvent } from "./types";
import type { LocationEventData, CellClaimEventData, GameStateSnapshotData } from "./types";

interface EventListener<T = unknown> {
  callback: (event: T) => void;
  unsubscribe: () => void;
}

export class EventBus {
  private listeners: Map<string, Set<(event: unknown) => void>> = new Map();

  subscribe<T extends GameEvent>(type: T["type"]): EventListener<T> {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }

    const set = this.listeners.get(type)!;
    const callback = (event: unknown) => {
      set.forEach((fn) => fn(event));
    };

    set.add(callback);

    const unsubscribe = () => {
      set.delete(callback);
      if (set.size === 0) {
        this.listeners.delete(type);
      }
    };

    return {
      callback: callback as (event: T) => void,
      unsubscribe,
    };
  }

  emit(event: GameEvent): void {
    const set = this.listeners.get(event.type);
    if (set) {
      set.forEach((fn) => fn(event));
    }
  }

  emitLocation(playerId: string, sessionId: string, data: LocationEventData): void {
    this.emit({
      type: "player_location_update",
      timestamp: Date.now(),
      eventId: crypto.randomUUID(),
      playerId,
      sessionId,
      data,
    });
  }

  emitCellClaim(playerId: string, sessionId: string, data: CellClaimEventData): void {
    this.emit({
      type: "cell_claimed",
      timestamp: Date.now(),
      eventId: crypto.randomUUID(),
      playerId,
      sessionId,
      data,
    });
  }

  emitGameStateSnapshot(playerId: string, sessionId: string, data: GameStateSnapshotData): void {
    this.emit({
      type: "game_state_snapshot",
      timestamp: Date.now(),
      eventId: crypto.randomUUID(),
      playerId,
      sessionId,
      data,
    });
  }
}

export const eventBus = new EventBus();
