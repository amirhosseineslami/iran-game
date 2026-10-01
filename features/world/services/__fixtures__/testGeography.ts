import type { GeographicFeature } from "@/features/world/types/geographicFeature";

/**
 * Generate deterministic test geographic features for Tehran
 * These fixtures are used for testing without requiring external data downloads
 */

export function generateTestFeatures(): GeographicFeature[] {
  const features: GeographicFeature[] = [];
  const now = Date.now();
  
  // Test feature 1: Central park area (buildable around it)
  features.push({
    id: 'geo-test-park',
    sourceId: 'test-park-1',
    sourceType: 'park',
    tags: { name: 'Test Park', leisure: 'park' },
    geometry: [[[51.38, 35.68], [51.39, 35.68], [51.39, 35.69], [51.38, 35.69], [51.38, 35.68]]],
    centroid: [51.385, 35.685],
    boundingBox: [51.38, 35.68, 51.39, 35.69],
    area: 1_113_200,
    category: 'green_space',
    buildability: 'restricted',
    confidence: 0.95,
    source: 'test',
    importTimestamp: now,
  });
  
  // Test feature 2: Main road
  features.push({
    id: 'geo-test-road',
    sourceId: 'test-road-1',
    sourceType: 'highway',
    tags: { name: 'Valiasr Street', highway: 'primary' },
    geometry: [[[51.37, 35.68], [51.40, 35.68], [51.40, 35.685], [51.37, 35.685], [51.37, 35.68]]],
    centroid: [51.385, 35.6825],
    boundingBox: [51.37, 35.68, 51.40, 35.685],
    area: 3_339_600,
    category: 'transportation',
    buildability: 'non_buildable',
    confidence: 0.98,
    source: 'test',
    importTimestamp: now,
  });
  
  // Test feature 3: Water body
  features.push({
    id: 'geo-test-water',
    sourceId: 'test-water-1',
    sourceType: 'water',
    tags: { name: 'Test Lake', water: 'reservoir' },
    geometry: [[[51.42, 35.72], [51.43, 35.72], [51.43, 35.73], [51.42, 35.73], [51.42, 35.72]]],
    centroid: [51.425, 35.725],
    boundingBox: [51.42, 35.72, 51.43, 35.73],
    area: 1_113_200,
    category: 'non_buildable',
    buildability: 'non_buildable',
    confidence: 0.99,
    source: 'test',
    importTimestamp: now,
  });
  
  // Test feature 4: Hospital
  features.push({
    id: 'geo-test-hospital',
    sourceId: 'test-hospital-1',
    sourceType: 'amenity',
    tags: { name: 'Test Hospital', amenity: 'hospital' },
    geometry: [[[51.40, 35.70], [51.405, 35.70], [51.405, 35.705], [51.40, 35.705], [51.40, 35.70]]],
    centroid: [51.4025, 35.7025],
    boundingBox: [51.40, 35.70, 51.405, 35.705],
    area: 278_300,
    category: 'restricted',
    buildability: 'restricted',
    confidence: 0.97,
    source: 'test',
    importTimestamp: now,
  });
  
  // Test feature 5: Residential area
  features.push({
    id: 'geo-test-residential',
    sourceId: 'test-residential-1',
    sourceType: 'landuse',
    tags: { name: 'Test District', landuse: 'residential' },
    geometry: [[[51.36, 35.67], [51.37, 35.67], [51.37, 35.68], [51.36, 35.68], [51.36, 35.67]]],
    centroid: [51.365, 35.675],
    boundingBox: [51.36, 35.67, 51.37, 35.68],
    area: 1_113_200,
    category: 'buildable',
    buildability: 'buildable',
    confidence: 0.92,
    source: 'test',
    importTimestamp: now,
  });
  
  // Test feature 6: Industrial zone
  features.push({
    id: 'geo-test-industrial',
    sourceId: 'test-industrial-1',
    sourceType: 'landuse',
    tags: { name: 'Test Industrial', landuse: 'industrial' },
    geometry: [[[51.44, 35.74], [51.45, 35.74], [51.45, 35.75], [51.44, 35.75], [51.44, 35.74]]],
    centroid: [51.445, 35.745],
    boundingBox: [51.44, 35.74, 51.45, 35.75],
    area: 1_113_200,
    category: 'restricted',
    buildability: 'restricted',
    confidence: 0.90,
    source: 'test',
    importTimestamp: now,
  });
  
  return features;
}

/**
 * Generate features within Tehran bounding box
 */
export function generateTehranTestFeatures(count: number = 50): GeographicFeature[] {
  const features: GeographicFeature[] = [];
  const now = Date.now();
  
  const types: string[] = ['road', 'highway', 'water', 'park', 'building', 'landuse', 'amenity'];
  
  for (let i = 0; i < count; i++) {
    const typeIndex = i % types.length;
    const type = types[typeIndex];
    
    // Build tags based on type
    const tags: Record<string, string> = { name: `Feature ${i}` };
    if (type === 'road') tags.highway = 'residential';
    else if (type === 'highway') tags.highway = 'primary';
    else if (type === 'water') tags.water = 'river';
    else if (type === 'park') tags.leisure = 'park';
    else if (type === 'building') tags.building = 'yes';
    else if (type === 'landuse') tags.landuse = 'residential';
    else if (type === 'amenity') tags.amenity = 'hospital';
    
    // Random position within Tehran bbox
    const lng = 51.15 + Math.random() * (51.65 - 51.15);
    const lat = 35.55 + Math.random() * (35.80 - 35.55);
    
    // Small polygon around the point
    const size = 0.001 + Math.random() * 0.002;
    const geometry = [
      [
        [lng, lat],
        [lng + size, lat],
        [lng + size, lat + size],
        [lng, lat + size],
        [lng, lat],
      ]
    ];
    
    const category = i % 3 === 0 ? 'buildable' : i % 3 === 1 ? 'restricted' : 'non_buildable';
    const buildability = i % 3 === 0 ? 'buildable' : i % 3 === 1 ? 'restricted' : 'non_buildable';
    
    features.push({
      id: `geo-tehran-${i}`,
      sourceId: `osm-way-${1000 + i}`,
      sourceType: type,
      tags,
      geometry,
      centroid: [lng + size / 2, lat + size / 2],
      boundingBox: [lng, lat, lng + size, lat + size],
      area: size * size * 111320 * 111320 * Math.cos(35.7 * Math.PI / 180),
      category: category as any,
      buildability: buildability as any,
      confidence: 0.7 + Math.random() * 0.3,
      source: 'test',
      importTimestamp: now,
    });
  }
  
  return features;
}
