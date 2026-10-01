import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  attemptClaim,
  getAllCells,
  releaseClaim,
} from "@/features/world/server/store";

// GET /api/claims — world stats
export async function GET() {
  const cells = getAllCells();
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

  const outcome = attemptClaim({ cellId, playerId, timestamp });

  if (outcome.ok) {
    return NextResponse.json({ success: true, cell: outcome.cell, sessionId });
  }

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

  const ok = releaseClaim(cellId, playerId);
  if (!ok) {
    return NextResponse.json({ error: "RELEASE_FAILED" }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}
