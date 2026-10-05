import { NextResponse } from "next/server";
import { getAllCells, getCellsInBbox, type Bbox } from "@/features/world/server/store";

function parseBbox(raw: string): Bbox | null {
  const [minLng, minLat, maxLng, maxLat] = raw.split(",").map(Number);
  if (
    Number.isNaN(minLng) ||
    Number.isNaN(minLat) ||
    Number.isNaN(maxLng) ||
    Number.isNaN(maxLat)
  ) {
    return null;
  }
  return { minLng, minLat, maxLng, maxLat };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "0", 10);
  const bboxRaw = searchParams.get("bbox");

  // Viewport queries are pushed down to the backend (PostGIS index for the
  // postgres path, in-memory filter otherwise).
  const bbox = bboxRaw ? parseBbox(bboxRaw) : null;
  let cells = bbox ? await getCellsInBbox(bbox) : await getAllCells();

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
