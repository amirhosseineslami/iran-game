import { NextResponse } from "next/server";
import type { GameCell, GameCellStatus } from "@/features/world/types/gameCell";
import { generateTestFeatures } from "@/features/world/services/__fixtures__/testGeography";
import { generateCellsFromGeography } from "@/features/world/services/generateBuildableCells";

const DEMO_PLAYER_ID = "player-demo-001";

// In-memory store for claimed cells (persists across requests in dev)
let claimedCells: Map<string, string> = new Map();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '0');
  const bbox = searchParams.get('bbox');
  
  // Generate geographic features (deterministic for testing)
  const features = generateTestFeatures();
  
  // Generate cells from geography
  let cells = generateCellsFromGeography(features);
  
  // Apply claims from memory
  for (const [cellId, ownerId] of claimedCells) {
    const cell = cells.find(c => c.id === cellId);
    if (cell) {
      cell.status = 'claimed' as GameCellStatus;
      cell.ownerId = ownerId;
    }
  }
  
  // Filter by bbox if provided
  if (bbox) {
    const [minLng, minLat, maxLng, maxLat] = bbox.split(',').map(Number);
    if (!isNaN(minLng) && !isNaN(minLat) && !isNaN(maxLng) && !isNaN(maxLat)) {
      cells = cells.filter(cell => {
        const center = getCellCenter(cell);
        return center.lng >= minLng && center.lng <= maxLng && 
               center.lat >= minLat && center.lat <= maxLat;
      });
    }
  }
  
  // Limit results
  if (limit > 0) {
    cells = cells.slice(0, limit);
  }
  
  // Return summary stats
  const stats = {
    total: cells.length,
    available: cells.filter(c => c.status === 'available').length,
    claimed: cells.filter(c => c.status === 'claimed').length,
    buildable: cells.filter(c => c.buildability === 'buildable').length,
    nonBuildable: cells.filter(c => c.buildability !== 'buildable').length,
  };
  
  return NextResponse.json({ cells, stats });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { cellId, playerId } = body;
  
  if (!cellId || !playerId) {
    return NextResponse.json(
      { error: 'Missing cellId or playerId' },
      { status: 400 }
    );
  }
  
  // Store claim
  claimedCells.set(cellId, playerId);
  
  return NextResponse.json({ success: true, cellId });
}

function getCellCenter(cell: GameCell): { lng: number; lat: number } {
  const polygon = cell.polygon[0];
  let sumLng = 0, sumLat = 0;
  for (const [lng, lat] of polygon) {
    sumLng += lng;
    sumLat += lat;
  }
  return {
    lng: sumLng / polygon.length,
    lat: sumLat / polygon.length,
  };
}
