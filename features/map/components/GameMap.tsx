"use client";

import { useEffect, useRef, useCallback } from "react";
import { Map as MapLibreMap, NavigationControl, setWorkerUrl } from "maplibre-gl";
import type { MapLayerMouseEvent } from "maplibre-gl";
import type { GameCell } from "@/features/world/types/gameCell";

setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

const TEHRAN_CENTER = [51.389, 35.6892] as [number, number];
const INITIAL_ZOOM = 13;
const MAX_CELLS = 500;

const SOURCE_ID = "game-cells";
const LAYER_FILL = "game-cells-fill";
const LAYER_OUTLINE = "game-cells-outline";
const LAYER_CLICK = "game-cells-click";
const LAYER_SELECTED = "game-cells-selected";
const ALL_LAYERS = [LAYER_FILL, LAYER_OUTLINE, LAYER_CLICK, LAYER_SELECTED];

interface GameMapProps {
  cells: GameCell[];
  selectedCellId: string | null;
  playerLocation: { latitude: number; longitude: number } | null;
  onCellClick: (cellId: string) => void;
}

export default function GameMap({
  cells,
  selectedCellId,
  playerLocation,
  onCellClick,
}: GameMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const clickHandlerRef = useRef(onCellClick);

  // Keep the latest click handler visible to the map without re-registering it.
  useEffect(() => {
    clickHandlerRef.current = onCellClick;
  }, [onCellClick]);

  // Create the map once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new MapLibreMap({
      container: containerRef.current,
      style: "/maplibre/style.json",
      center: TEHRAN_CENTER,
      zoom: INITIAL_ZOOM,
      attributionControl: false,
    });

    map.addControl(new NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;

    const canvas = map.getCanvas();
    canvas.style.cursor = "grab";
    const onMouseDown = () => {
      canvas.style.cursor = "grabbing";
    };
    const onMouseUp = () => {
      canvas.style.cursor = "";
    };
    map.on("mousedown", onMouseDown);
    map.on("mouseup", onMouseUp);

    // Single, layer-scoped click handler. Registered once, forever.
    const onClick = (e: MapLayerMouseEvent) => {
      if (!map.getLayer(LAYER_CLICK)) return;
      const features = map.queryRenderedFeatures(e.point, {
        layers: [LAYER_CLICK],
      });
      if (features.length === 0) return;
      const cellId = String(features[0].properties?.cellId ?? "");
      if (cellId) clickHandlerRef.current(cellId);
    };
    map.on("click", onClick);

    return () => {
      map.off("mousedown", onMouseDown);
      map.off("mouseup", onMouseUp);
      map.off("click", onClick);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Build GeoJSON from cells. Downsampled for rendering.
  const buildGeoJSON = useCallback((cellList: GameCell[]) => {
    const sampled =
      cellList.length > MAX_CELLS
        ? cellList
            .filter((_, i) => i % Math.ceil(cellList.length / MAX_CELLS) === 0)
            .slice(0, MAX_CELLS)
        : cellList;

    return {
      type: "FeatureCollection" as const,
      features: sampled.map((cell) => ({
        type: "Feature" as const,
        id: cell.id,
        geometry: {
          type: "Polygon" as const,
          coordinates: cell.polygon.map((ring) =>
            ring.map(([lng, lat]) => [lng, lat] as [number, number])
          ),
        },
        properties: {
          cellId: cell.id,
          status: cell.status,
          ownerId: cell.ownerId ?? null,
        },
      })),
    };
  }, []);

  // Sync cells into the map. Sets up layers once; updates data thereafter.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || cells.length === 0) return;

    const geojson = buildGeoJSON(cells);

    const applyData = () => {
      const existing = map.getSource(SOURCE_ID) as
        | { setData: (data: unknown) => void }
        | undefined;

      if (existing) {
        existing.setData(geojson);
        return;
      }

      map.addSource(SOURCE_ID, { type: "geojson", data: geojson });

      map.addLayer({
        id: LAYER_FILL,
        type: "fill",
        source: SOURCE_ID,
        paint: {
          "fill-color": [
            "case",
            ["==", ["get", "status"], "claimed"],
            "#f59e0b",
            ["==", ["get", "status"], "pending_claim"],
            "#3b82f6",
            "#22c55e",
          ],
          "fill-opacity": 0.3,
        },
      });

      map.addLayer({
        id: LAYER_OUTLINE,
        type: "line",
        source: SOURCE_ID,
        paint: {
          "line-color": [
            "case",
            ["==", ["get", "status"], "claimed"],
            "#d97706",
            "#16a34a",
          ],
          "line-width": 0.8,
          "line-opacity": 0.8,
        },
      });

      map.addLayer({
        id: LAYER_CLICK,
        type: "fill",
        source: SOURCE_ID,
        paint: { "fill-color": "transparent" },
      });

      map.addLayer({
        id: LAYER_SELECTED,
        type: "line",
        source: SOURCE_ID,
        paint: {
          "line-color": "#ef4444",
          "line-width": 3,
          "line-opacity": 1,
        },
        filter: ["==", "id", selectedCellId ?? ""],
      });
    };

    if (map.isStyleLoaded()) {
      applyData();
    } else {
      map.once("load", applyData);
    }
  }, [cells, buildGeoJSON, selectedCellId]);

  // Update selection filter without touching source/layers.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    if (!map.getLayer(LAYER_SELECTED)) return;
    try {
      map.setFilter(LAYER_SELECTED, ["==", "id", selectedCellId ?? ""]);
    } catch {
      /* map may be mid-teardown; ignore */
    }
  }, [selectedCellId]);

  // Center on player when location becomes available.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !playerLocation || !map.isStyleLoaded()) return;
    map.flyTo({
      center: [playerLocation.longitude, playerLocation.latitude],
      duration: 800,
      essential: true,
    });
  }, [playerLocation]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
