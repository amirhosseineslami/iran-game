export type CheatType =
  | "teleport"
  | "speed_hack"
  | "duplicate_claim"
  | "invalid_timestamp"
  | "impossible_movement"
  | "permission_violation";

export interface CheatingViolation {
  playerId: string;
  sessionId: string;
  type: CheatType;
  evidence: Record<string, unknown>;
  detectedAt: number;
  severity: "low" | "medium" | "high" | "critical";
}

export interface ValidationRule {
  name: string;
  check: (payload: unknown, context: ValidationContext) => ValidationError | null;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  rule: string;
  message: string;
  field?: string;
}

export interface ValidationContext {
  playerId: string;
  previousState?: unknown;
  currentTime: number;
}
