import type { AntiCheatValidator } from "./validator";
import type { PlayerLocation } from "../player/types/playerLocation";

export interface SessionState {
  playerId: string;
  connectedAt: number;
  lastAction: string;
  lastPayload: Record<string, unknown>;
  lastTimestamp: number;
  lastPosition?: { lng: number; lat: number };
  lastClaimTime?: number;
}

export class SessionTracker {
  private sessions = new Map<string, SessionState>();

  constructor(private validator: AntiCheatValidator) {}

  register(playerId: string, sessionId: string): void {
    this.sessions.set(sessionId, {
      playerId,
      connectedAt: Date.now(),
      lastAction: "",
      lastPayload: {},
      lastTimestamp: Date.now(),
    });
  }

  update(
    sessionId: string,
    action: string,
    payload: Record<string, unknown>,
  ): { valid: boolean; violations: Array<{ rule: string; message: string }> } {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return {
        valid: false,
        violations: [{ rule: "unknown_session", message: "Unknown session" }],
      };
    }

    const previousState = {
      position: session.lastPosition,
      timestamp: session.lastTimestamp,
    };

    const result = this.validator.validate(
      action,
      payload,
      {
        playerId: session.playerId,
        previousState,
        currentTime: Date.now(),
      },
      previousState,
    );

    // Update session state
    session.lastAction = action;
    session.lastPayload = payload;
    session.lastTimestamp = Date.now();

    if (payload["currentPosition"]) {
      session.lastPosition = payload["currentPosition"] as {
        lng: number;
        lat: number;
      };
    }

    if (action === "claim") {
      session.lastClaimTime = Date.now();
    }

    return result;
  }

  getSession(sessionId: string): SessionState | undefined {
    return this.sessions.get(sessionId);
  }

  removeSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }
}
