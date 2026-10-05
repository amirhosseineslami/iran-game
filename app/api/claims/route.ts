import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  attemptClaim,
  getAllCells,
  releaseClaim,
} from "@/features/world/server/store";
import { logger } from "@/lib/logger";

// Simple in-memory rate limiter (per player, per minute)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 30; // claims per minute
const RATE_WINDOW_MS = 60_000;

function isRateLimited(playerId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(playerId);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(playerId, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }

  entry.count++;
  return entry.count > RATE_LIMIT;
}

// GET /api/claims — world stats
export async function GET() {
  const cells = await getAllCells();
  const claimed = cells.filter((c) => c.status === "claimed").length;
  const pending = cells.filter((c) => c.status === "pending_claim").length;
  const available = cells.filter((c) => c.status === "available").length;

  return NextResponse.json({
    total_count: cells.length,
    claimed,
    pending,
    available,
  });
}

// POST /api/claims — claim a cell
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let body: {
    sessionId?: string;
    playerId?: string;
    cellId?: string;
    timestamp?: number;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const { sessionId, playerId, cellId, timestamp } = body;

  if (!sessionId || !playerId || !cellId || !timestamp) {
    return NextResponse.json(
      { error: "Missing required fields: sessionId, playerId, cellId, timestamp" },
      { status: 400 }
    );
  }

  // Rate limiting
  if (isRateLimited(playerId)) {
    logger.claimRateLimited({ playerId, sessionId });
    return NextResponse.json(
      { error: "RATE_LIMITED", sessionId },
      { status: 429 }
    );
  }

  logger.claimAttempt({ playerId, cellId, sessionId });

  const outcome = await attemptClaim({ cellId, playerId, timestamp, sessionId });
  const durationMs = Date.now() - startTime;

  if (outcome.ok) {
    logger.claimSuccess({ playerId, cellId, sessionId, duplicate: outcome.duplicate, durationMs });
    return NextResponse.json({
      success: true,
      cell: outcome.cell,
      sessionId,
      duplicate: outcome.duplicate,
    });
  }

  logger.claimFailure({ playerId, cellId, sessionId, reason: outcome.reason, durationMs });
  const status = outcome.reason === "CELL_NOT_FOUND" ? 404 : 409;
  return NextResponse.json(
    { error: outcome.reason, sessionId },
    { status }
  );
}

// DELETE /api/claims — release a cell owned by the caller
export async function DELETE(request: NextRequest) {
  let body: { cellId?: string; playerId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const { cellId, playerId } = body;
  if (!cellId || !playerId) {
    return NextResponse.json(
      { error: "Missing cellId or playerId" },
      { status: 400 }
    );
  }

  const ok = await releaseClaim(cellId, playerId);
  if (!ok) {
    return NextResponse.json({ error: "RELEASE_FAILED" }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}
