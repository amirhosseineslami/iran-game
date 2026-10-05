import { NextResponse } from "next/server";
import { getPersistenceStatus } from "@/features/world/server/store";

/**
 * Health/diagnostics endpoint.
 *
 * Reports which persistence backend the game is actually using so the
 * "PostgreSQL vs in-memory fallback" state is never invisible:
 * - mode "postgres":        production path, claims persist.
 * - mode "memory":          DATABASE_URL not configured (environment-blocked).
 * - mode "memory-fallback": DATABASE_URL configured but unreachable (ERROR).
 */
export async function GET() {
  try {
    const status = await getPersistenceStatus();
    return NextResponse.json({
      ok: true,
      persistence: {
        mode: status.mode,
        kind: status.kind,
        detail: status.detail,
        persistent: status.mode === "postgres",
      },
      timestamp: Date.now(),
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { ok: false, error: "PERSISTENCE_INIT_FAILED", detail, timestamp: Date.now() },
      { status: 503 }
    );
  }
}
