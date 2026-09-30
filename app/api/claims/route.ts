import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { LngLat } from "@/features/world/types/gameCell";
import { ServerClaimEngine } from "@/features/server/claimEngine";
import { GameWorld } from "@/features/world/state/GameState";

// In-memory game world for development
const gameWorld = new GameWorld();

// Initialize with some cells if empty
if (!gameWorld.getState()) {
  const cells = generateSampleCells();
  gameWorld.load(cells);
}

// Create claim engine instance
const claimEngine = new ServerClaimEngine(
  async (id) => gameWorld.getCellById(id),
  async (playerId) => gameWorld.getCellsForPlayer(playerId),
  async (cell) => {
    // Update in game world
    const state = gameWorld.getState();
    if (state) {
      const updatedCells = state.cells.map((c) =>
        c.id === cell.id ? cell : c
      );
      gameWorld.load(updatedCells);
    }
  },
  async () => {} // No-op logger
);

function generateSampleCells() {
  const cells = [];
  const tileSize = 0.001;
  const centerLat = 35.6892; // Tehran
  const centerLng = 51.3890;
  
  for (let row = -50; row <= 50; row++) {
    for (let col = -50; col <= 50; col++) {
      const lat = centerLat + row * tileSize;
      const lng = centerLng + col * tileSize;
      
      cells.push({
        id: `${row}_${col}`,
        row,
        col,
        status: "available" as const,
        ownerId: null,
        polygon: [
          [
            [lng, lat] as LngLat,
            [lng + tileSize, lat] as LngLat,
            [lng + tileSize, lat + tileSize] as LngLat,
            [lng, lat + tileSize] as LngLat,
            [lng, lat] as LngLat,
          ],
        ],
      });
    }
  }
  return cells;
}

// GET /api/claims - Get all claims or stats
export async function GET(request: NextRequest) {
  try {
    const state = gameWorld.getState();
    if (!state) {
      return NextResponse.json({ total_count: 0, claimed: 0, available: 0 });
    }
    
    const claimed = state.cells.filter((c) => c.status === "claimed").length;
    const pending = state.cells.filter((c) => c.status === "pending_claim").length;
    const available = state.cells.filter((c) => c.status === "available").length;
    
    return NextResponse.json({
      total_count: state.cells.length,
      claimed,
      pending,
      available,
    });
  } catch (error) {
    console.error("Error getting claims:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/claims - Claim a cell
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, playerId, cellId, timestamp } = body;
    
    if (!sessionId || !playerId || !cellId || !timestamp) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }
    
    const result = await claimEngine.processClaim({
      sessionId,
      playerId,
      cellId,
      timestamp,
    });
    
    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(
        { error: result.reason },
        { status: 409 }
      );
    }
  } catch (error) {
    console.error("Error creating claim:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/claims/:cellId/confirm - Confirm a claim
export async function PUT(
  request: NextRequest
) {
  try {
    const body = await request.json();
    const { cellId, playerId } = body;

    if (!cellId || !playerId) {
      return NextResponse.json(
        { error: "Missing cellId or playerId" },
        { status: 400 }
      );
    }

    const success = await claimEngine.confirmClaim(cellId, playerId);

    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: "Failed to confirm claim" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error confirming claim:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/claims/:cellId - Cancel a claim
export async function DELETE(
  request: NextRequest
) {
  try {
    const body = await request.json();
    const { cellId, playerId } = body;

    if (!cellId || !playerId) {
      return NextResponse.json(
        { error: "Missing cellId or playerId" },
        { status: 400 }
      );
    }

    const success = await claimEngine.cancelClaim(cellId, playerId);

    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: "Failed to cancel claim" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error canceling claim:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
