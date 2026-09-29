import type { GameEvent } from "./types";
import type { LocationEventData, CellClaimEventData, GameStateSnapshotData } from "./types";

interface Listener {
  id: string;
  callback: (event: unknown) => void;
}

export class EventBus {
  private listeners: Map<string, Set<Listener>> = new Map();
  private nextId = 0;

  subscribe(type: string): { addListener: (handler: (event: unknown) => void) => void; removeListener: () => void } {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }

    const set = this.listeners.get(type)!;
    const id = `listener-${++this.nextId}`;

    return {
      addListener: (handler: (event: unknown) => void) => {
        set.add({ id, callback: handler });
      },
      removeListener: () => {
        const item = Array.from(set).find((l) => l.id === id);
        if (item) {
          set.delete(item);
        }
        if (set.size === 0) {
          this.listeners.delete(type);
        }
      },
    };
  }

  emit<T extends GameEvent>(event: T): void {
    const set = this.listeners.get(event.type);
    if (set) {
      set.forEach((fn) => fn.callback(event));
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
