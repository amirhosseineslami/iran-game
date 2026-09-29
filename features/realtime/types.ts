export type GameEventType =
  | "cell_claimed"
  | "cell_construction_started"
  | "player_location_update"
  | "player_joined"
  | "player_left"
  | "game_state_snapshot";

export interface GameEvent<T = unknown> {
  type: GameEventType;
  timestamp: number;
  eventId: string;
  playerId: string;
  sessionId: string;
  data: T;
}

export type LocationEventData = {
  longitude: number;
  latitude: number;
  accuracy: number;
  confidence: number;
};

export type CellClaimEventData = {
  cellId: string;
  newStatus: string;
  version: number;
};

export type GameStateSnapshotData = {
  cells: Array<{ id: string; status: string; ownerId: string | null }>;
  players: Array<{ playerId: string; lastPosition: { lng: number; lat: number }; connectedAt: number }>;
  serverTimestamp: number;
  version: number;
};
