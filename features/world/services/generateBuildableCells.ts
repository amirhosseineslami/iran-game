import type { GameCell, LngLat, GameCellStatus } from "../types/gameCell";
import type { GeographicFeature } from "../types/geographicFeature";

const CELL_SIZE = 0.001;
const CENTER_LNG = 51.389;
const CENTER_LAT = 35.6892;
const GRID_SIZE = 101; // 101x101 = 10,201 cells

/**
 * Generate game cells based on geographic features
 * This replaces synthetic grid generation with geography-aware generation
 */
export function generateCellsFromGeography(
  features: GeographicFeature[],
  gridSize: number = GRID_SIZE,
  cellSize: number = CELL_SIZE
): GameCell[] {
  const cells: GameCell[] = [];
  const now = Date.now();
  
  // Calculate grid bounds
  const startLng = CENTER_LNG - (gridSize * cellSize) / 2;
  const startLat = CENTER_LAT - (gridSize * cellSize) / 2;
  
  // Generate each cell in the grid
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const west = startLng + col * cellSize;
      const south = startLat + row * cellSize;
      const east = west + cellSize;
      const north = south + cellSize;
      
      // Create cell polygon
      const polygon: LngLat[][] = [[
        [west, south],
        [east, south],
        [east, north],
        [west, north],
        [west, south],
      ]];
      
      // Determine buildability based on geographic features
      const buildability = calculateCellBuildability(west, south, east, north, features);
      
      // Set cell status based on buildability
      // Note: All cells start as 'available' for claiming, but buildability affects whether they CAN be built on
      const status: GameCellStatus = 'available';
      
      cells.push({
        id: `cell-${row}-${col}`,
        row,
        col,
        status,
        ownerId: null,
        polygon,
        createdAt: now,
        buildability,
      });
    }
  }
  
  return cells;
}

/**
 * Calculate buildability for a cell based on overlapping geographic features
 */
function calculateCellBuildability(
  west: number,
  south: number,
  east: number,
  north: number,
  features: GeographicFeature[]
): 'buildable' | 'non_buildable' | 'restricted' {
  let maxWeight = 0;
  let currentBuildability: 'buildable' | 'non_buildable' | 'restricted' = 'buildable';
  
  for (const feature of features) {
    // Check if feature overlaps with cell
    if (overlaps(feature, west, south, east, north)) {
      const weight = getBuildabilityWeight(feature.buildability);
      if (weight > maxWeight) {
        maxWeight = weight;
        currentBuildability = feature.buildability as 'buildable' | 'non_buildable' | 'restricted';
      }
    }
  }
  
  return currentBuildability;
}

/**
 * Check if two rectangular areas overlap
 */
function overlaps(
  feature: GeographicFeature,
  west: number,
  south: number,
  east: number,
  north: number
): boolean {
  const [fMinLng, fMinLat, fMaxLng, fMaxLat] = feature.boundingBox;
  
  // Simple bounding box intersection test
  return !(east < fMinLng || west > fMaxLng || 
           north < fMinLat || south > fMaxLat);
}

/**
 * Get numeric weight for buildability status
 * Higher weights mean more restrictive
 */
function getBuildabilityWeight(buildability: string): number {
  switch (buildability) {
    case 'non_buildable':
      return 100;
    case 'restricted':
      return 50;
    case 'buildable':
      return 0;
    default:
      return 10;
  }
}

/**
 * Generate deterministic cells for API (backward compatible)
 */
export function generateDeterministicCells(): GameCell[] {
  // Use simple grid with no geographic overlay for backward compatibility
  const cells: GameCell[] = [];
  const now = Date.now();
  
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      const west = CENTER_LNG + (col - GRID_SIZE / 2) * CELL_SIZE;
      const south = CENTER_LAT + (row - GRID_SIZE / 2) * CELL_SIZE;
      
      const polygon: LngLat[][] = [[
        [west, south],
        [west + CELL_SIZE, south],
        [west + CELL_SIZE, south + CELL_SIZE],
        [west, south + CELL_SIZE],
        [west, south],
      ]];
      
      cells.push({
        id: `cell-${row}-${col}`,
        row,
        col,
        status: 'available',
        ownerId: null,
        polygon,
        createdAt: now,
        buildability: 'buildable',
      });
    }
  }
  
  return cells;
}
