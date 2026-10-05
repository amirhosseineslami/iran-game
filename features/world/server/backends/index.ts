import type { CellBackend } from "./cellBackend";
import { MemoryCellBackend } from "./memoryCellBackend";
import { createPostgresCellBackend } from "./postgresCellBackend";

/**
 * Backend selection, resolved once per process and cached on globalThis
 * (survives Next.js dev-server hot reloads).
 *
 * Selection rules:
 * - DATABASE_URL set and reachable  → PostgreSQL (the production path).
 * - DATABASE_URL set but unreachable → memory fallback, logged as an ERROR.
 * - DATABASE_URL not set             → memory, logged as a WARNING.
 *
 * The fallback is never silent: it is logged at startup and reported by
 * GET /api/health so "claims persist" vs "claims are volatile" is visible.
 */

export type PersistenceMode = "postgres" | "memory" | "memory-fallback";

export interface BackendState {
  backend: CellBackend;
  mode: PersistenceMode;
  detail: string;
}

declare global {
  // eslint-disable-next-line no-var
  var __iranGameBackend: Promise<BackendState> | undefined;
}

export function redactUrl(url: string): string {
  return url.replace(/\/\/([^:/@]+):([^@]+)@/, "//$1:***@");
}

async function initBackend(): Promise<BackendState> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.warn(
      "[persistence] DATABASE_URL not set — using IN-MEMORY store. Claims will NOT survive a server restart."
    );
    return {
      backend: new MemoryCellBackend(),
      mode: "memory",
      detail: "DATABASE_URL not set",
    };
  }
  try {
    const backend = await createPostgresCellBackend(url);
    console.log(
      `[persistence] connected to PostgreSQL at ${redactUrl(url)} — claims persist across restarts.`
    );
    return { backend, mode: "postgres", detail: redactUrl(url) };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(
      `[persistence] FAILED to use PostgreSQL (${msg}) — falling back to IN-MEMORY store. Claims will NOT survive a server restart.`
    );
    return {
      backend: new MemoryCellBackend(),
      mode: "memory-fallback",
      detail: msg,
    };
  }
}

export function getBackendState(): Promise<BackendState> {
  if (!globalThis.__iranGameBackend) {
    globalThis.__iranGameBackend = initBackend();
  }
  return globalThis.__iranGameBackend;
}

/** Test helper: force re-selection on next use. */
export function resetBackendForTests(): void {
  globalThis.__iranGameBackend = undefined;
}
