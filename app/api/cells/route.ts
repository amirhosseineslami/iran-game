import { NextResponse } from "next/server";
import type { GameCell } from "@/features/world/types/gameCell";
import { getAllCells } from "@/features/world/server/store";

function getCellCenter(cell: GameCell): { lng: number; lat: number } {
  const ring = cell.polygon[0];
  let sumLng = 0;
  let sumLat = 0;
  for (const [lng, lat] of ring) {
    sumLng += lng;
    sumLat += lat;
  }
  return { lng: sumLng / ring.length, lat: sumLat / ring.length };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "0", 10);
  const bbox = searchParams.get("bbox");

  let cells = getAllCells();

  if (bbox) {
    const [minLng, minLat, maxLng, maxLat] = bbox.split(",").map(Number);
    if (
      !Number.isNaN(minLng) &&
      !Number.isNaN(minLat) &&
      !Number.isNaN(maxLng) &&
      !Number.isNaN(maxLat)
    ) {
      cells = cells.filter((cell) => {
        const c = getCellCenter(cell);
        return (
          c.lng >= minLng && c.lng <= maxLng && c.lat >= minLat && c.lat <= maxLat
        );
      });
    }
  }

  if (limit > 0) {
    cells = cells.slice(0, limit);
  }

  const stats = {
    total: cells.length,
    available: cells.filter((c) => c.status === "available").length,
    claimed: cells.filter((c) => c.status === "claimed").length,
    buildable: cells.filter((c) => c.buildability === "buildable").length,
    nonBuildable: cells.filter((c) => c.buildability !== "buildable").length,
  };

  return NextResponse.json({ cells, stats });
}
