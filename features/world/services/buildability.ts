import type { GameCell, GameCellStatus } from "@/features/world/types/gameCell";
import type { GeographicFeature } from "@/features/world/types/geographicFeature";

export interface BuildValidationResult {
  valid: boolean;
  reason?: "not_owned" | "already_built" | "too_close_to_own" | "too_close_to_enemy" | "non_buildable";
  cell?: GameCell;
}

const OWN_CELL_DISTANCE_THRESHOLD = 0.001; // degrees
const ENEMY_CELL_DISTANCE_THRESHOLD = 0.003; // degrees

function haversineDistanceDeg(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getCellCenter(cell: GameCell): { lat: number; lng: number } {
  const coords = cell.polygon[0];
  let lat = 0, lng = 0;
  for (const [lngCoord, latCoord] of coords) {
    lat += latCoord;
    lng += lngCoord;
  }
  return { lat: lat / coords.length, lng: lng / coords.length };
}

/**
 * Check if a cell is buildable based on geographic features
 */
export function isCellBuildable(cell: GameCell, features: GeographicFeature[]): boolean {
  const center = getCellCenter(cell);
  
  // Check if any non-buildable feature overlaps with this cell
  for (const feature of features) {
    if (feature.buildability === 'non_buildable' || feature.buildability === 'restricted') {
      // Simple bounding box intersection test
      const [fMinLng, fMinLat, fMaxLng, fMaxLat] = feature.boundingBox;
      if (center.lng >= fMinLng && center.lng <= fMaxLng &&
          center.lat >= fMinLat && center.lat <= fMaxLat) {
        return false;
      }
    }
  }
  
  return true;
}

export function validateBuild(
  cell: GameCell,
  playerId: string,
  ownCells: GameCell[],
): BuildValidationResult {
  if (cell.status === "available") {
    const nearbyOwn = ownCells.filter((c) => {
      const ownCenter = getCellCenter(c);
      const cellCenter = getCellCenter(cell);
      return haversineDistanceDeg(ownCenter.lat, ownCenter.lng, cellCenter.lat, cellCenter.lng) <= OWN_CELL_DISTANCE_THRESHOLD * 111320;
    });
    if (nearbyOwn.length > 0) {
      return { valid: false, reason: "too_close_to_own", cell };
    }
    return { valid: true, cell };
  }
  if (cell.ownerId === playerId) {
    return { valid: false, reason: "already_built", cell };
  }
  if (cell.ownerId !== null && cell.ownerId !== playerId) {
    return { valid: false, reason: "too_close_to_enemy", cell };
  }
  return { valid: false, reason: "not_owned", cell };
}

/**
 * Calculate buildability statistics for a set of cells
 */
export function calculateBuildabilityStats(cells: GameCell[], features: GeographicFeature[]): {
  total: number;
  buildable: number;
  nonBuildable: number;
  restricted: number;
  percentage: number;
} {
  let buildable = 0;
  let nonBuildable = 0;
  let restricted = 0;
  
  for (const cell of cells) {
    const buildable_flag = isCellBuildable(cell, features);
    if (buildable_flag) {
      buildable++;
    } else {
      // Check if it's restricted vs non_buildable based on overlapping features
      let isRestricted = false;
      for (const feature of features) {
        const center = getCellCenter(cell);
        const [fMinLng, fMinLat, fMaxLng, fMaxLat] = feature.boundingBox;
        if (center.lng >= fMinLng && center.lng <= fMaxLng &&
            center.lat >= fMinLat && center.lat <= fMaxLat) {
          if (feature.buildability === 'restricted') {
            isRestricted = true;
          }
          break;
        }
      }
      if (isRestricted) {
        restricted++;
      } else {
        nonBuildable++;
      }
    }
  }
  
  const total = cells.length;
  const percentage = total > 0 ? (buildable / total) * 100 : 0;
  
  return {
    total,
    buildable,
    nonBuildable,
    restricted,
    percentage,
  };
}
