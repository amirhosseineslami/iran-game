export interface LocationQuality {
  timestamp: number;
  accuracy: number;
  heading: number | null;
  speed: number | null;
  confidence: number; // 0-1, higher is better
}

export interface FilteredPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
  quality: LocationQuality;
}

const MAX_AGE_MS = 60_000; // 1 minute
const MIN_ACCURACY_METERS = 50;
const MAX_SPEED_MS = 30; // ~108 km/h
const HYSTERESIS_THRESHOLD_METERS = 50;

let lastValidPosition: { lat: number; lng: number } | null = null;

export function isStale(timestamp: number): boolean {
  return Date.now() - timestamp > MAX_AGE_MS;
}

export function isValid(position: GeolocationPosition): boolean {
  const { latitude, longitude, accuracy } = position.coords;
  const now = Date.now();
  const age = now - position.timestamp;

  if (accuracy > MIN_ACCURACY_METERS) return false;
  if (age > MAX_AGE_MS) return false;
  if (Number.isNaN(latitude) || Number.isNaN(longitude)) return false;

  if (lastValidPosition !== null && age > 0) {
    const timeDiff = age / 1000;
    const dist = Math.sqrt(
      Math.pow(latitude - lastValidPosition.lat, 2) +
        Math.pow(longitude - lastValidPosition.lng, 2)
    ) * 111320;
    const speed = dist / timeDiff;
    if (speed > MAX_SPEED_MS) return false;
  }

  return true;
}

export function calculateConfidence(position: GeolocationPosition): number {
  const { accuracy } = position.coords;
  const age = Date.now() - position.timestamp;

  const accuracyScore = Math.max(0, 1 - accuracy / MIN_ACCURACY_METERS);
  const ageScore = Math.max(0, 1 - age / MAX_AGE_MS);
  const baseScore = (accuracyScore + ageScore) / 2;

  return Math.round(baseScore * 100) / 100;
}

export function applyHysteresis(
  newLat: number,
  newLng: number,
  oldLat: number | null,
  oldLng: number | null,
  accuracy: number
): { latitude: number; longitude: number; jumped: boolean } {
  if (oldLat === null || oldLng === null) {
    return { latitude: newLat, longitude: newLng, jumped: true };
  }

  const distanceMeters = Math.sqrt(
    Math.pow((newLat - oldLat) * 111320, 2) +
      Math.pow((newLng - oldLng) * 111320 * Math.cos(oldLat * Math.PI / 180), 2)
  );

  const threshold = Math.max(HYSTERESIS_THRESHOLD_METERS, accuracy);
  const jumped = distanceMeters > threshold;

  return {
    latitude: jumped ? newLat : oldLat,
    longitude: jumped ? newLng : oldLng,
    jumped,
  };
}

export function getFilteredPosition(
  position: GeolocationPosition
): FilteredPosition | null {
  if (!isValid(position)) return null;

  const { latitude, longitude, accuracy } = position.coords;
  const confidence = calculateConfidence(position);

  lastValidPosition = { lat: latitude, lng: longitude };

  return {
    latitude,
    longitude,
    accuracy,
    quality: {
      timestamp: position.timestamp,
      accuracy,
      heading: position.coords.heading,
      speed: position.coords.speed,
      confidence,
    },
  };
}
