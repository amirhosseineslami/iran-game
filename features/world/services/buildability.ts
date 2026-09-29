import type { GameCell } from "../../../features/world/types/gameCell";

export interface BuildValidationResult {
  valid: boolean;
  reason?: "not_owned" | "already_built" | "too_close_to_own" | "too_close_to_enemy";
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
      return { valid: false, reason: "too_close_to_own" };
    }
    return { valid: true };
  }
  if (cell.ownerId === playerId) {
    return { valid: false, reason: "already_built" };
  }
  if (cell.ownerId !== null && cell.ownerId !== playerId) {
    return { valid: false, reason: "too_close_to_enemy" };
  }
  return { valid: false, reason: "not_owned" };
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
