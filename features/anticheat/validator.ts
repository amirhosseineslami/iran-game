import type {
  ValidationRule,
  ValidationContext,
  ValidationError,
} from "../anticheat/types";
import type { GameCell } from "../world/types/gameCell";
import type { PlayerLocation } from "../player/types/playerLocation";

const MAX_MOVE_SPEED_PER_SECOND = 0.002; // degrees per second
const MAX_TIMESTAMP_DRIFT_MS = 5000;
const MIN_TIME_BETWEEN_CLAIMS_MS = 5000;

export class AntiCheatValidator {
  private readonly rules: ValidationRule[];

  constructor() {
    this.rules = [
      { name: "timestamp_drift", check: this.checkTimestampDrift },
      { name: "movement_speed", check: this.checkMovementSpeed },
      { name: "claim_cooldown", check: this.checkClaimCooldown },
      { name: "cell_ownership", check: this.checkCellOwnership },
    ];
  }

  validate(
    action: string,
    payload: unknown,
    context: ValidationContext,
    previousState?: Record<string, unknown>,
  ): { valid: boolean; violations: Array<{ rule: string; message: string }> } {
    const errors: ValidationError[] = [];

    for (const rule of this.rules) {
      const error = rule.check(payload, {
        ...context,
        previousState: previousState ?? undefined,
      });
      if (error) {
        errors.push(error);
      }
    }

    return {
      valid: errors.length === 0,
      violations: errors.map((e) => ({ rule: e.rule, message: e.message })),
    };
  }

  private checkTimestampDrift = (
    payload: unknown,
    ctx: ValidationContext,
  ): ValidationError | null => {
    const typed = payload as { timestamp?: number };
    if (typed.timestamp === undefined) return null;

    const drift = Math.abs(typed.timestamp - ctx.currentTime);
    if (drift > MAX_TIMESTAMP_DRIFT_MS) {
      return {
        rule: "timestamp_drift",
        message: `Timestamp drift of ${drift}ms exceeds ${MAX_TIMESTAMP_DRIFT_MS}ms threshold`,
        field: "timestamp",
      };
    }
    return null;
  };

  private checkMovementSpeed = (
    payload: unknown,
    ctx: ValidationContext,
  ): ValidationError | null => {
    const typed = payload as {
      previousPosition?: { lng: number; lat: number };
      currentPosition?: { lng: number; lat: number };
      timestamp?: number;
    };

    if (
      !typed.previousPosition ||
      !typed.currentPosition ||
      !typed.timestamp
    ) {
      return null;
    }

    const prevCtx = ctx.previousState as
      | { position?: { lng: number; lat: number }; timestamp?: number }
      | undefined;

    if (!prevCtx?.position || !prevCtx.timestamp) return null;

    const timeDelta = (typed.timestamp - prevCtx.timestamp) / 1000; // seconds
    if (timeDelta <= 0) return null;

    const lngDiff = Math.abs(typed.currentPosition.lng - prevCtx.position.lng);
    const latDiff = Math.abs(typed.currentPosition.lat - prevCtx.position.lat);
    const distance = Math.sqrt(lngDiff * lngDiff + latDiff * latDiff);
    const speed = distance / timeDelta;

    if (speed > MAX_MOVE_SPEED_PER_SECOND) {
      return {
        rule: "movement_speed",
        message: `Movement speed ${speed.toFixed(4)}/s exceeds max ${MAX_MOVE_SPEED_PER_SECOND}/s`,
        field: "position",
      };
    }
    return null;
  };

  private checkClaimCooldown = (
    payload: unknown,
    ctx: ValidationContext,
  ): ValidationError | null => {
    const typed = payload as { lastClaimTime?: number };
    if (typed.lastClaimTime === undefined) return null;

    const timeSinceLastClaim = ctx.currentTime - typed.lastClaimTime;
    if (timeSinceLastClaim < MIN_TIME_BETWEEN_CLAIMS_MS) {
      return {
        rule: "claim_cooldown",
        message: `Claim cooldown not met: ${timeSinceLastClaim}ms < ${MIN_TIME_BETWEEN_CLAIMS_MS}ms`,
        field: "lastClaimTime",
      };
    }
    return null;
  };

  private checkCellOwnership = (
    payload: unknown,
    ctx: ValidationContext,
  ): ValidationError | null => {
    const typed = payload as { cellId?: string; action?: string };
    if (!typed.cellId || typed.action !== "claim") return null;

    // In a real implementation, this would query the database
    // For now, just pass validation
    return null;
  };
}

export const antiCheatValidator = new AntiCheatValidator();
