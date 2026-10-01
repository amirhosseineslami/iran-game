import type { GeographicFeature } from "@/features/world/types/geographicFeature";
import { classifyFeature, validateGeographicFeature, calculateCentroid, calculateBoundingBox, calculateAreaMeters } from "./geographyUtils";

/**
 * Import geographic features from OSM-like data
 * This is the core import pipeline that transforms raw data into game-ready features
 */

export interface ImportResult {
  success: boolean;
  features: GeographicFeature[];
  statistics: {
    totalImported: number;
    validationErrors: number;
    duplicatesSkipped: number;
  };
}

export async function importGeographicFeatures(rawData: RawOSMData[]): Promise<ImportResult> {
  const features: GeographicFeature[] = [];
  let validationErrors = 0;
  let duplicatesSkipped = 0;
  const seenSourceIds = new Set<string>();
  
  for (const raw of rawData) {
    // Skip duplicates
    if (seenSourceIds.has(raw.id)) {
      duplicatesSkipped++;
      continue;
    }
    seenSourceIds.add(raw.id);
    
    // Classify the feature
    const { category, buildability } = classifyFeature(raw.type, raw.tags);
    
    // Calculate geometry properties
    const centroid = calculateCentroid(raw.geometry);
    const boundingBox = calculateBoundingBox(raw.geometry);
    const area = calculateAreaMeters(raw.geometry);
    
    // Create validated feature
    const feature: GeographicFeature = {
      id: `geo-${raw.id}`,
      sourceId: raw.id,
      sourceType: raw.type,
      tags: raw.tags,
      geometry: raw.geometry,
      centroid,
      boundingBox,
      area,
      category: category as any,
      buildability: buildability as any,
      confidence: raw.tags.confidence ? parseFloat(raw.tags.confidence) : 0.8,
      source: 'osm',
      sourceVersion: raw.version,
      importTimestamp: Date.now(),
      metadata: raw.metadata,
    };
    
    // Validate
    const validation = validateGeographicFeature(feature);
    if (!validation.valid) {
      validationErrors++;
      console.warn(`Validation error for feature ${feature.id}:`, validation.errors);
      continue;
    }
    
    features.push(feature);
  }
  
  return {
    success: validationErrors === 0 && duplicatesSkipped === 0,
    features,
    statistics: {
      totalImported: features.length,
      validationErrors,
      duplicatesSkipped,
    },
  };
}

/**
 * Raw OSM data format for import
 */
export interface RawOSMData {
  id: string;
  type: string;
  tags: Record<string, string>;
  geometry: number[][][];
  version?: string;
  metadata?: Record<string, unknown>;
}
