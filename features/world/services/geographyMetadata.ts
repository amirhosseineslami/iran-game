import type { PersistedGameCell } from "@/features/persistence/types";

export interface TehranMetadata {
  source: string;
  sourceUrl: string;
  sourceDate: string;
  license: string;
  bbox: {
    minLng: number;
    minLat: number;
    maxLng: number;
    maxLat: number;
  };
  featureCounts: {
    total: number;
    roads: number;
    water: number;
    parks: number;
    buildings: number;
    other: number;
  };
  pipelineVersion: string;
  createdAt: number;
}

export interface ImportStatistics {
  totalFeatures: number;
  importedFeatures: number;
  skippedFeatures: number;
  validationErrors: number;
  duplicatesSkipped: number;
  categories: Record<string, number>;
  importDurationMs: number;
}

export async function generateTehranMetadata(): Promise<TehranMetadata> {
  return {
    source: 'OpenStreetMap',
    sourceUrl: 'https://www.openstreetmap.org/',
    sourceDate: new Date().toISOString().split('T')[0],
    license: 'ODbL',
    bbox: {
      minLng: 51.15,
      minLat: 35.55,
      maxLng: 51.65,
      maxLat: 35.80,
    },
    featureCounts: {
      total: 0,
      roads: 0,
      water: 0,
      parks: 0,
      buildings: 0,
      other: 0,
    },
    pipelineVersion: '1.0.0',
    createdAt: Date.now(),
  };
}

export function createEmptyImportStatistics(): ImportStatistics {
  return {
    totalFeatures: 0,
    importedFeatures: 0,
    skippedFeatures: 0,
    validationErrors: 0,
    duplicatesSkipped: 0,
    categories: {},
    importDurationMs: 0,
  };
}
