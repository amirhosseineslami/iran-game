import type { PlayerLocation } from "../types/playerLocation";

export interface MapCoordinates {
  lng: number;
  lat: number;
}

export function playerLocationToMapCoordinates(
  location: PlayerLocation
): MapCoordinates {
  return {
    lng: location.longitude,
    lat: location.latitude,
  };
}
