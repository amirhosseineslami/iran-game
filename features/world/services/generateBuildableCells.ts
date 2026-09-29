import type { GameCell, LngLat } from "../types/gameCell";

const TEHRAN_CENTER: LngLat = [51.389, 35.6892];

export function generateBuildableCells(
  rows = 9,
  cols = 9,
  cellSize = 0.003
): GameCell[] {
  const cells: GameCell[] = [];

  const startLng =
    TEHRAN_CENTER[0] - (cols * cellSize) / 2;

  const startLat =
    TEHRAN_CENTER[1] - (rows * cellSize) / 2;

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
      });
    }
  }

  return cells;
}
