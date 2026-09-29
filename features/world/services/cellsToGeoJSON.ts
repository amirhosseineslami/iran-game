import type { GameCell } from "../types/gameCell";

export function cellsToGeoJSON(
  cells: GameCell[]
) {
  return {
    type: "FeatureCollection" as const,

    features: cells.map((cell) => ({
      type: "Feature" as const,

      id: cell.id,

      properties: {
        cellId: cell.id,
        status: cell.status,
        ownerId: cell.ownerId,
      },

      geometry: {
        type: "Polygon" as const,

        coordinates: cell.polygon,
      },
    })),
  };
}
