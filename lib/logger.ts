/**
 * Structured logging for game events.
 * In production, this would write to a log aggregation service.
 * In development, it writes to console with structured format.
 */

export type LogLevel = "info" | "warn" | "error";

export interface LogEntry {
  level: LogLevel;
  event: string;
  playerId?: string;
  cellId?: string;
  sessionId?: string;
  reason?: string;
  durationMs?: number;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

function formatEntry(entry: LogEntry): string {
  const parts = [
    `[${entry.timestamp}]`,
    entry.level.toUpperCase(),
    entry.event,
  ];

  if (entry.playerId) parts.push(`player=${entry.playerId}`);
  if (entry.cellId) parts.push(`cell=${entry.cellId}`);
  if (entry.sessionId) parts.push(`session=${entry.sessionId}`);
  if (entry.reason) parts.push(`reason=${entry.reason}`);
  if (entry.durationMs !== undefined) parts.push(`duration=${entry.durationMs}ms`);

  const metadata = entry.metadata;
  if (metadata && Object.keys(metadata).length > 0) {
    parts.push(`meta=${JSON.stringify(metadata)}`);
  }

  return parts.join(" ");
}

function log(level: LogLevel, entry: Omit<LogEntry, "timestamp" | "level">): void {
  const full: LogEntry = {
    level,
    ...entry,
    timestamp: new Date().toISOString(),
  };

  const line = formatEntry(full);

  switch (level) {
    case "error":
      console.error(line);
      break;
    case "warn":
      console.warn(line);
      break;
    default:
      console.log(line);
      break;
  }
}

export const logger = {
  claimAttempt(entry: {
    playerId: string;
    cellId: string;
    sessionId: string;
    durationMs?: number;
  }) {
    log("info", { event: "claim_attempt", ...entry });
  },

  claimSuccess(entry: {
    playerId: string;
    cellId: string;
    sessionId: string;
    duplicate: boolean;
    durationMs?: number;
  }) {
    log("info", { event: "claim_success", ...entry });
  },

  claimFailure(entry: {
    playerId: string;
    cellId: string;
    sessionId: string;
    reason: string;
    durationMs?: number;
  }) {
    log("warn", { event: "claim_failure", ...entry });
  },

  claimRateLimited(entry: {
    playerId: string;
    sessionId: string;
  }) {
    log("warn", { event: "claim_rate_limited", ...entry });
  },

  suspiciousActivity(entry: {
    playerId: string;
    reason: string;
    metadata?: Record<string, unknown>;
  }) {
    log("error", { event: "suspicious_activity", ...entry });
  },

  locationFailure(entry: {
    playerId?: string;
    reason: string;
    metadata?: Record<string, unknown>;
  }) {
    log("warn", { event: "location_failure", ...entry });
  },

  apiError(entry: {
    route: string;
    error: string;
    playerId?: string;
  }) {
    log("error", { event: "api_error", ...entry });
  },
};
