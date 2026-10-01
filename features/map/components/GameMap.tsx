"use client";

import { useEffect, useRef, useCallback } from "react";
import { Map as MapLibreMap, NavigationControl, setWorkerUrl } from "maplibre-gl";
import type { MapLayerMouseEvent } from "maplibre-gl";
import type { GameCell } from "@/features/world/types/gameCell";

setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

const TEHRAN_CENTER = [51.389, 35.6892] as [number, number];
const INITIAL_ZOOM = 13;
const MAX_CELLS = 500;

interface GameMapProps {
  cells: GameCell[];
  selectedCellId: string | null;
  playerLocation: { latitude: number; longitude: number } | null;
  onCellClick: (cellId: string) => void;
}

export default function GameMap({ cells, selectedCellId, playerLocation, onCellClick }: GameMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const clickHandlerRef = useRef(onCellClick);
  const lastSelectedRef = useRef<string | null>(null);
  const cellsRef = useRef<GameCell[]>([]);

  clickHandlerRef.current = onCellClick;
  lastSelectedRef.current = selectedCellId;
  cellsRef.current = cells;

  // Setup map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new MapLibreMap({
      container: containerRef.current,
      style: "https://demotiles.maplibre.org/style.json",
      center: TEHRAN_CENTER,
      zoom: INITIAL_ZOOM,
      attributionControl: false,
    });

    map.addControl(new NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;

    const canvas = map.getCanvas();
    canvas.style.cursor = "grab";
    map.on("mousedown", () => { canvas.style.cursor = "grabbing"; });
    map.on("mouseup", () => { canvas.style.cursor = ""; });
    map.on("load", () => console.log("Map loaded"));

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Build GeoJSON from cells
  const buildGeoJSON = useCallback((cellList: GameCell[]): any => {
    const sampled = cellList.length > MAX_CELLS 
      ? cellList.filter((_, i) => i % Math.ceil(cellList.length / MAX_CELLS) === 0).slice(0, MAX_CELLS)
      : cellList;
    
    return {
      type: "FeatureCollection",
      features: sampled.map((cell) => ({
        type: "Feature",
        id: cell.id,
        geometry: {
          type: "Polygon",
          coordinates: cell.polygon.map(ring => ring.map(([lng, lat]): [number, number] => [lng, lat])),
        },
        properties: { cellId: cell.id, status: cell.status, ownerId: cell.ownerId ?? null },
      })),
    };
  }, []);

  // Setup layers when cells change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !cells.length) return;

    const geojson = buildGeoJSON(cells);
    console.log("Setting up layers with", geojson.features.length, "cells");

    map.addSource("game-cells", { type: "geojson", data: geojson });

    map.addLayer({
      id: "game-cells-fill",
      type: "fill",
      source: "game-cells",
      paint: {
        "fill-color": ["case",
          ["==", ["get", "status"], "claimed"], "#f59e0b",
          ["==", ["get", "status"], "pending_claim"], "#3b82f6",
          "#22c55e",
        ],
        "fill-opacity": 0.3,
      },
    });

    map.addLayer({
      id: "game-cells-outline",
      type: "line",
      source: "game-cells",
      paint: {
        "line-color": ["case",
          ["==", ["get", "status"], "claimed"], "#d97706",
          "#16a34a",
        ],
        "line-width": 0.8,
        "line-opacity": 0.8,
      },
    });

    map.addLayer({
      id: "game-cells-click",
      type: "fill",
      source: "game-cells",
      paint: { "fill-color": "transparent" },
    });

    map.addLayer({
      id: "game-cells-selected",
      type: "line",
      source: "game-cells",
      paint: {
        "line-color": "#ef4444",
        "line-width": 3,
        "line-opacity": 1,
      },
      filter: ["==", "id", selectedCellId ?? ""],
    });

    map.on("click", "game-cells-click", (e: MapLayerMouseEvent) => {
      const feature = e.features?.[0];
      if (feature) {
        const cellId = String(feature.properties?.cellId ?? "");
        console.log("Clicked:", cellId);
        if (cellId) clickHandlerRef.current(cellId);
      }
    });

    console.log("Layers setup complete");
  }, [cells, buildGeoJSON, selectedCellId]);

  // Update selection when selectedCellId changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    try {
      map.setFilter("game-cells-selected", ["==", "id", selectedCellId ?? ""]);
    } catch {}
  }, [selectedCellId]);

  // Center on player
  useEffect(() => {
    if (!playerLocation || !mapRef.current || !mapRef.current.isStyleLoaded()) return;
    mapRef.current.flyTo({
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
