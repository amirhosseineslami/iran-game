"use client";

import { useEffect, useRef, useCallback } from "react";
import { Map as MapLibreMap, NavigationControl, setWorkerUrl } from "maplibre-gl";
import type { MapLayerMouseEvent } from "maplibre-gl";
import type { GameCell } from "@/features/world/types/gameCell";

setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

const TEHRAN_CENTER = [51.389, 35.6892] as [number, number];
const INITIAL_ZOOM = 13;
const MAX_CELLS = 12_000; // safety cap; the current world has 10,201 cells
const DEBOUNCE_MS = 300;

const SOURCE_ID = "game-cells";
const PLAYER_SOURCE_ID = "player-location";
const LAYER_FILL = "game-cells-fill";
const LAYER_OUTLINE = "game-cells-outline";
const LAYER_CLICK = "game-cells-click";
const LAYER_SELECTED = "game-cells-selected";
const LAYER_PLAYER_ACCURACY = "player-accuracy";
const LAYER_PLAYER_RING = "player-marker-ring";
const LAYER_PLAYER = "player-marker";

interface GameMapProps {
  cells: GameCell[];
  selectedCellId: string | null;
  playerLocation: { latitude: number; longitude: number; accuracy?: number } | null;
  onCellClick: (cellId: string) => void;
  onViewportChange?: (bbox: string) => void;
}

export default function GameMap({
  cells,
  selectedCellId,
  playerLocation,
  onCellClick,
  onViewportChange,
}: GameMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const clickHandlerRef = useRef(onCellClick);
  const viewportChangeRef = useRef(onViewportChange);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    clickHandlerRef.current = onCellClick;
  }, [onCellClick]);

  useEffect(() => {
    viewportChangeRef.current = onViewportChange;
  }, [onViewportChange]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new MapLibreMap({
      container: containerRef.current,
      style: "/maplibre/style.json",
      center: TEHRAN_CENTER,
      zoom: INITIAL_ZOOM,
      attributionControl: false,
      pitchWithRotate: false,
    });

    map.addControl(new NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;

    const canvas = map.getCanvas();
    canvas.style.cursor = "grab";
    const onMouseDown = () => { canvas.style.cursor = "grabbing"; };
    const onMouseUp = () => { canvas.style.cursor = ""; };
    map.on("mousedown", onMouseDown);
    map.on("mouseup", onMouseUp);

    const onClick = (e: MapLayerMouseEvent) => {
      if (!map.getLayer(LAYER_CLICK)) return;
      const features = map.queryRenderedFeatures(e.point, { layers: [LAYER_CLICK] });
      if (features.length === 0) return;
      const cellId = String(features[0].properties?.cellId ?? "");
      if (cellId) clickHandlerRef.current(cellId);
    };
    map.on("click", onClick);

    // Viewport change handler — debounced
    const onMoveEnd = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const bounds = map.getBounds();
        const bbox = [
          bounds.getWest(),
          bounds.getSouth(),
          bounds.getEast(),
          bounds.getNorth(),
        ].join(",");
        viewportChangeRef.current?.(bbox);
      }, DEBOUNCE_MS);
    };
    map.on("moveend", onMoveEnd);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      map.off("mousedown", onMouseDown);
      map.off("mouseup", onMouseUp);
      map.off("click", onClick);
      map.off("moveend", onMoveEnd);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Build GeoJSON for territory rendering.
  //
  // Render ALL cells up to a high safety cap: MapLibre renders GeoJSON
  // sources on the GPU, and sampling used to leave gaps that made cells
  // impossible to click. If payloads ever exceed the cap, switch to
  // viewport-filtered data (TASK 21) instead of sampling.
  const buildGeoJSON = useCallback((cellList: GameCell[]) => {
    const sampled = cellList.length > MAX_CELLS ? cellList.slice(0, MAX_CELLS) : cellList;

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
          buildability: cell.buildability,
        },
      })),
    };
  }, []);

  // Sync territory cells into the map.
  //
  // Resilience: the game layer must NOT depend on external basemap tiles.
  // `map.isStyleLoaded()` / the 'load' event stay false while raster tiles
  // are pending (slow or blocked network), so we apply as soon as the style
  // JSON is parsed ('styledata') and keep retrying until it succeeds.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || cells.length === 0) return;

    const geojson = buildGeoJSON(cells);
    let cancelled = false;

    const applyData = (): boolean => {
      if (cancelled) return true;
      try {
        // Style JSON must be parsed before sources/layers can be added.
        if (!map.getStyle()) return false;

        const existing = map.getSource(SOURCE_ID) as
          | { setData: (data: unknown) => void }
          | undefined;
        if (existing) {
          existing.setData(geojson);
        } else {
          map.addSource(SOURCE_ID, { type: "geojson", data: geojson });
        }

        if (!map.getLayer(LAYER_FILL)) map.addLayer({
        id: LAYER_FILL,
        type: "fill",
        source: SOURCE_ID,
        paint: {
          "fill-color": [
            "case",
            ["==", ["get", "status"], "claimed"],
            "#f59e0b",
            ["==", ["get", "status"], "pending_claim"],
            "#60a5fa",
            "#22c55e",
          ],
          "fill-opacity": [
            "case",
            ["==", ["get", "status"], "claimed"],
            0.45,
            ["==", ["get", "status"], "available"],
            0.18,
            0.12,
          ],
          "fill-outline-color": "#0f172a",
        },
      });

      if (!map.getLayer(LAYER_OUTLINE)) map.addLayer({
        id: LAYER_OUTLINE,
        type: "line",
        source: SOURCE_ID,
        paint: {
          "line-color": [
            "case",
            ["==", ["get", "status"], "claimed"],
            "#d97706",
            "#15803d",
          ],
          "line-width": 0.6,
          "line-opacity": 0.6,
        },
      });

      if (!map.getLayer(LAYER_CLICK)) map.addLayer({
        id: LAYER_CLICK,
        type: "fill",
        source: SOURCE_ID,
        paint: { "fill-color": "transparent" },
        layout: { visibility: "visible" },
      });

      if (!map.getLayer(LAYER_SELECTED)) map.addLayer({
        id: LAYER_SELECTED,
        type: "line",
        source: SOURCE_ID,
        paint: {
          "line-color": "#ef4444",
          "line-width": 3,
          "line-opacity": 0.9,
          "line-blur": 2,
        },
        filter: ["==", "id", selectedCellId ?? ""],
      });
        return true;
      } catch {
        // Style not ready (or mid-teardown) — retried via styledata below.
        return false;
      }
    };

    if (applyData()) {
      return () => {
        cancelled = true;
      };
    }

    // Style JSON not parsed yet — retry on every styledata until applied.
    const onStyleData = () => {
      applyData();
    };
    map.on("styledata", onStyleData);
    map.once("load", onStyleData);
    return () => {
      cancelled = true;
      map.off("styledata", onStyleData);
      map.off("load", onStyleData);
    };
  }, [cells, buildGeoJSON, selectedCellId]);

  // Update selection filter efficiently.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    if (!map.getLayer(LAYER_SELECTED)) return;
    try {
      map.setFilter(LAYER_SELECTED, ["==", "id", selectedCellId ?? ""]);
    } catch {
      /* mid-teardown; ignore */
    }
  }, [selectedCellId]);

  // Player marker — update or create.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !playerLocation) return;

    const coords: [number, number] = [
      playerLocation.longitude,
      playerLocation.latitude,
    ];

    const addPlayerMarker = () => {
      if (map.getSource(PLAYER_SOURCE_ID)) return;

      map.addSource(PLAYER_SOURCE_ID, {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              geometry: { type: "Point", coordinates: coords },
              properties: { accuracy: playerLocation.accuracy ?? 10 },
            },
          ],
        },
      });

      // Accuracy circle — shows GPS uncertainty radius
      map.addLayer({
        id: LAYER_PLAYER_ACCURACY,
        type: "circle",
        source: PLAYER_SOURCE_ID,
        paint: {
          "circle-radius": [
            "interpolate", ["linear"], ["zoom"],
            10, 2,
            14, 8,
            18, 30,
          ],
          "circle-color": "#60a5fa",
          "circle-opacity": 0.08,
          "circle-stroke-width": 1,
          "circle-stroke-color": "#60a5fa",
          "circle-stroke-opacity": 0.15,
        },
      });

      // Outer glow ring
      map.addLayer({
        id: LAYER_PLAYER_RING,
        type: "circle",
        source: PLAYER_SOURCE_ID,
        paint: {
          "circle-radius": 14,
          "circle-color": "#60a5fa",
          "circle-opacity": 0.15,
          "circle-blur": 2,
        },
      });

      // Core dot
      map.addLayer({
        id: LAYER_PLAYER,
        type: "circle",
        source: PLAYER_SOURCE_ID,
        paint: {
          "circle-radius": 7,
          "circle-color": "#60a5fa",
          "circle-stroke-width": 2.5,
          "circle-stroke-color": "#0f172a",
        },
      });
    };

    if (map.isStyleLoaded()) {
      addPlayerMarker();
    } else {
      map.once("load", addPlayerMarker);
    }

    try {
      const src = map.getSource(PLAYER_SOURCE_ID) as
        | { setData: (d: unknown) => void }
        | undefined;
      if (src) {
        src.setData({
          type: "FeatureCollection",
          features: [{
            type: "Feature",
            geometry: { type: "Point", coordinates: coords },
            properties: { accuracy: playerLocation.accuracy ?? 10 },
          }],
        });
      }
    } catch { /* ignore */ }
  }, [playerLocation]);

  // Fly to player when location becomes available.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !playerLocation || !map.isStyleLoaded()) return;
    map.flyTo({
      center: [playerLocation.longitude, playerLocation.latitude],
      zoom: Math.max(map.getZoom(), 14),
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
