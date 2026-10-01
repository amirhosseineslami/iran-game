import type { GeographicFeature } from "@/features/world/types/geographicFeature";

/**
 * Validate geographic feature geometry
 * Ensures polygon is valid and properly closed
 */
export function validatePolygon(polygon: number[][][]): boolean {
  if (!Array.isArray(polygon) || polygon.length === 0) return false;
  
  for (const ring of polygon) {
    if (!Array.isArray(ring) || ring.length < 4) return false;
    
    // Check first and last points are the same (closed ring)
    const first = ring[0];
    const last = ring[ring.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) return false;
    
    // Check each coordinate is valid
    for (const coord of ring) {
      if (!Array.isArray(coord) || coord.length !== 2) return false;
      const [lng, lat] = coord;
      if (typeof lng !== 'number' || typeof lat !== 'number') return false;
      if (lng < -180 || lng > 180 || lat < -90 || lat > 90) return false;
    }
  }
  
  return true;
}

/**
 * Calculate centroid of a polygon
 */
export function calculateCentroid(polygon: number[][][]): [number, number] {
  const ring = polygon[0];
  let sumLng = 0, sumLat = 0, count = 0;
  
  for (const [lng, lat] of ring) {
    sumLng += lng;
    sumLat += lat;
    count++;
  }
  
  return [sumLng / count, sumLat / count];
}

/**
 * Calculate bounding box from polygon
 */
export function calculateBoundingBox(polygon: number[][][]): [number, number, number, number] {
  const ring = polygon[0];
  let minLng = Infinity, minLat = Infinity;
  let maxLng = -Infinity, maxLat = -Infinity;
  
  for (const [lng, lat] of ring) {
    minLng = Math.min(minLng, lng);
    minLat = Math.min(minLat, lat);
    maxLng = Math.max(maxLng, lng);
    maxLat = Math.max(maxLat, lat);
  }
  
  return [minLng, minLat, maxLng, maxLat];
}

/**
 * Approximate polygon area using shoelace formula (returns square degrees)
 */
export function approximateAreaDeg(polygon: number[][][]): number {
  const ring = polygon[0];
  let area = 0;
  
  for (let i = 0; i < ring.length - 1; i++) {
    const [lng1, lat1] = ring[i];
    const [lng2, lat2] = ring[i + 1];
    area += lng1 * lat2 - lng2 * lat1;
  }
  
  return Math.abs(area) / 2;
}

/**
 * Convert square degrees to approximate square meters
 * At Tehran latitude (~35.7°), 1 degree ≈ 111km
 */
export function degToMeters(deg: number): number {
  const metersPerDegree = 111320; // Approximate at mid-latitudes
  return deg * metersPerDegree * Math.cos(35.7 * Math.PI / 180);
}

/**
 * Calculate area in square meters
 */
export function calculateAreaMeters(polygon: number[][][]): number {
  return approximateAreaDeg(polygon) * 111320 * 111320 * Math.cos(35.7 * Math.PI / 180);
}

/**
 * Classify geographic feature based on OSM tags
 */
export function classifyFeature(
  sourceType: string,
  tags: Record<string, string>
): { category: string; buildability: string } {
  // Water features - always non-buildable
  if (sourceType === 'water' || sourceType === 'waterway' || 
      tags.water || tags.covered === 'water') {
    return { category: 'non_buildable', buildability: 'non_buildable' };
  }
  
  // Parks and green spaces
  if (sourceType === 'park' || sourceType === 'forest' || 
      tags.leisure === 'park' || tags.landuse === 'grass' ||
      tags.natural === 'wood' || tags.natural === 'forest') {
    return { category: 'restricted', buildability: 'restricted' };
  }
  
  // Roads and transportation
  if (sourceType === 'road' || sourceType === 'highway' || 
      sourceType === 'railway' || sourceType === 'aeroway' ||
      tags.highway || tags.railway || tags.aeroway) {
    return { category: 'transportation', buildability: 'non_buildable' };
  }
  
  // Buildings
  if (sourceType === 'building' || tags.building) {
    return { category: 'non_buildable', buildability: 'non_buildable' };
  }
  
  // Land use types
  if (tags.landuse) {
    switch (tags.landuse) {
      case 'industrial':
        return { category: 'restricted', buildability: 'restricted' };
      case 'commercial':
        return { category: 'buildable', buildability: 'buildable' };
      case 'residential':
        return { category: 'buildable', buildability: 'buildable' };
      default:
        return { category: 'unknown', buildability: 'non_buildable' };
    }
  }
  
  // Special facilities
  if (tags.amenity === 'hospital' || tags.amenity === 'school' ||
      tags.amenity === 'university' || tags.amenity === 'station') {
    return { category: 'restricted', buildability: 'restricted' };
  }
  
  // Barriers
  if (tags.barrier || sourceType === 'barrier') {
    return { category: 'non_buildable', buildability: 'non_buildable' };
  }
  
  // Default: unclassified features are non-buildable for safety
  return { category: 'unknown', buildability: 'non_buildable' };
}

/**
 * Validate complete geographic feature
 */
export function validateGeographicFeature(feature: Partial<GeographicFeature>): {
  valid: boolean;
  errors?: string[];
} {
  const errors: string[] = [];
  
  if (!feature.id) errors.push('Missing id');
  if (!feature.sourceId) errors.push('Missing sourceId');
  if (!feature.geometry || !validatePolygon(feature.geometry)) {
    errors.push('Invalid geometry');
  }
  if (!feature.category || !['buildable', 'non_buildable', 'restricted', 'transportation', 'green_space', 'unknown'].includes(feature.category)) {
    errors.push('Invalid category');
  }
  if (!feature.buildability || !['buildable', 'non_buildable', 'restricted'].includes(feature.buildability)) {
    errors.push('Invalid buildability');
  }
  if (feature.importTimestamp === undefined) errors.push('Missing importTimestamp');
  
  return {
    valid: errors.length === 0,
    errors
  };
}
