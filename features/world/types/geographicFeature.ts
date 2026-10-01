// Geographic Feature Types for Iran Game
// Based on OpenStreetMap data model and ODbL license

export type GeographicFeatureType =
  | 'road'
  | 'highway'
  | 'water'
  | 'river'
  | 'lake'
  | 'park'
  | 'forest'
  | 'building'
  | 'landuse'
  | 'residential'
  | 'industrial'
  | 'commercial'
  | 'recreation_ground'
  | 'hospital'
  | 'school'
  | 'station'
  | 'railway'
  | 'aeroway'
  | 'boundary'
  | 'natural'
  | 'barrier'
  | 'man_made';

export type GeographicCategory =
  | 'buildable'       // Land suitable for building
  | 'non_buildable'   // Cannot build here (water, protected areas)
  | 'restricted'      // Special restrictions apply
  | 'transportation'  // Roads, railways
  | 'green_space'     // Parks, forests
  | 'unknown';        // Unclassified or unmapped

export interface GeographicFeature {
  id: string;
  sourceId: string;      // Original OSM ID
  sourceType: string;    // Original OSM type (e.g., 'highway', 'waterway')
  tags: Record<string, string>; // Raw OSM tags preserved for provenance
  geometry: number[][][]; // Polygon coordinates [[lng, lat], ...]
  centroid: [number, number]; // Center point for spatial queries
  boundingBox: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
  area: number;          // Area in square meters
  length?: number;       // Length in meters (for linear features)
  category: GeographicCategory;
  buildability: BuildabilityStatus;
  confidence: number;    // 0-1 confidence in classification
  source: string;        // Data source (e.g., 'osm')
  sourceVersion?: string; // Source version/date
  importTimestamp: number; // When imported
  metadata?: Record<string, unknown>; // Additional source metadata
}

export type BuildabilityStatus =
  | 'buildable'       // Can build here
  | 'non_buildable'   // Cannot build here
  | 'restricted';     // Build with restrictions

// Precedence rules for buildability determination
// Higher priority features override lower priority ones
export interface BuildabilityRule {
  type: string;
  category: GeographicCategory;
  buildability: BuildabilityStatus;
  weight: number;
}

export const BUILDABILITY_PRECEDENCE: BuildabilityRule[] = [
  { type: 'water', category: 'non_buildable', buildability: 'non_buildable', weight: 100 },
  { type: 'river', category: 'non_buildable', buildability: 'non_buildable', weight: 95 },
  { type: 'lake', category: 'non_buildable', buildability: 'non_buildable', weight: 95 },
  { type: 'protected_area', category: 'non_buildable', buildability: 'non_buildable', weight: 90 },
  { type: 'national_park', category: 'non_buildable', buildability: 'non_buildable', weight: 85 },
  { type: 'hospital', category: 'restricted', buildability: 'restricted', weight: 80 },
  { type: 'school', category: 'restricted', buildability: 'restricted', weight: 75 },
  { type: 'station', category: 'restricted', buildability: 'restricted', weight: 70 },
  { type: 'railway', category: 'non_buildable', buildability: 'non_buildable', weight: 65 },
  { type: 'highway', category: 'transportation', buildability: 'non_buildable', weight: 60 },
  { type: 'road', category: 'transportation', buildability: 'non_buildable', weight: 50 },
  { type: 'aeroway', category: 'non_buildable', buildability: 'non_buildable', weight: 45 },
  { type: 'barrier', category: 'non_buildable', buildability: 'non_buildable', weight: 40 },
  { type: 'man_made', category: 'non_buildable', buildability: 'non_buildable', weight: 35 },
  { type: 'forest', category: 'green_space', buildability: 'restricted', weight: 30 },
  { type: 'park', category: 'green_space', buildability: 'restricted', weight: 25 },
  { type: 'green_space', category: 'green_space', buildability: 'restricted', weight: 20 },
  { type: 'building', category: 'non_buildable', buildability: 'non_buildable', weight: 15 },
  { type: 'landuse_industrial', category: 'restricted', buildability: 'restricted', weight: 10 },
  { type: 'landuse_commercial', category: 'buildable', buildability: 'buildable', weight: 5 },
  { type: 'landuse_residential', category: 'buildable', buildability: 'buildable', weight: 3 },
];

// Tehran bounding box (MVP scope)
export const TEHRAN_BBOX = {
  minLng: 51.15,
  minLat: 35.55,
  maxLng: 51.65,
  maxLat: 35.80,
} as const;

// Source attribution for OSM data
export const OSM_ATTRIBUTION = {
  source: 'OpenStreetMap',
  license: 'ODbL',
  url: 'https://www.openstreetmap.org/copyright',
  contributors: 'OpenStreetMap contributors',
  requiredAttribution: '© OpenStreetMap contributors',
};
