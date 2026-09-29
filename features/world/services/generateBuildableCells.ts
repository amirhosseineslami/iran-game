import type { GameCell, LngLat } from "../types/gameCell";

export function generateBuildableCells(
  rows: number = 9,
  cols: number = 9,
  cellSize: number = 0.003
): GameCell[] {
  const cells: GameCell[] = [];
  const now = Date.now();

  const startLng = 51.389 - (cols * cellSize) / 2;
  const startLat = 35.6892 - (rows * cellSize) / 2;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const west = startLng + col * cellSize;
      const south = startLat + row * cellSize;
      const east = west + cellSize;
      const north = south + cellSize;

      const polygon: LngLat[][] = [[
        [west, south],
        [east, south],
        [east, north],
        [west, north],
        [west, south],
      ]];

      cells.push({
        id: `cell-${row}-${col}`,
        row,
        col,
        status: "available",
        ownerId: null,
        polygon,
        createdAt: now,
      });
    }
  }

  return cells;
}
