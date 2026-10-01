import * as maplibregl from "maplibre-gl";
import type { GameCell } from "@/features/world/types/gameCell";
import { useRef, useEffect } from "react";

const SOURCE_ID = "game-cells";
const FILL_LAYER_ID = "game-cells-fill";
const OUTLINE_LAYER_ID = "game-cells-outline";
const SELECTED_LAYER_ID = "game-cells-selected";
const CLICKABLE_LAYER_ID = "game-cells-click";

export interface CellLayerOptions {
  map: maplibregl.Map | null;
  cells: GameCell[];
  selectedCellId: string | null;
  onCellClick: (cellId: string) => void;
}

// Convert LngLat to GeoJSON-compatible coordinates
function polygonToGeoJSONCoords(polygon: [number, number][][]): number[][][] {
  return polygon.map(ring => ring.map(([lng, lat]): [number, number] => [lng, lat]));
}

function cellsToGeoJSON(cells: GameCell[]): object {
  return {
    type: "FeatureCollection",
    features: cells.map((cell) => ({
      type: "Feature" as const,
      id: cell.id,
      geometry: {
        type: "Polygon" as const,
        coordinates: polygonToGeoJSONCoords(cell.polygon),
      },
      properties: {
        cellId: cell.id,
        status: cell.status,
        ownerId: cell.ownerId ?? null,
      },
    })),
  };
}

export function useCellLayer(opts: CellLayerOptions) {
  const { map, cells, selectedCellId, onCellClick } = opts;

  // Stable callback refs — updated in useEffect only
  const clickHandlerRef = useRef(onCellClick);

  useEffect(() => {
    clickHandlerRef.current = onCellClick;
  }, [onCellClick]);

  useEffect(() => {
    if (!map) return;

    const addLayers = () => {
      if (map.getSource(SOURCE_ID)) return;

      map.addSource(SOURCE_ID, {
        type: "geojson",
        data: cellsToGeoJSON(cells) as unknown as string,
      });

      // Fill layer — color by status
      map.addLayer({
        id: FILL_LAYER_ID,
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

      // Outline layer
      map.addLayer({
        id: OUTLINE_LAYER_ID,
        type: "line",
        source: SOURCE_ID,
        paint: {
          "line-color": "rgba(255,255,255,0.6)",
          "line-width": 1,
          "line-opacity": 0.5,
        },
      });

      // Click target layer — invisible but interactive
      map.addLayer({
        id: CLICKABLE_LAYER_ID,
        type: "line",
        source: SOURCE_ID,
        paint: {
          "line-color": "transparent",
          "line-width": 5,
        },
      });

      // Selected highlight layer
      map.addLayer({
        id: SELECTED_LAYER_ID,
        type: "line",
        source: SOURCE_ID,
        paint: {
          "line-color": "#ef4444",
          "line-width": 3,
          "line-opacity": 0.9,
        },
        filter: ["==", "id", selectedCellId ?? ""],
      });
    };

    if (map.isStyleLoaded()) {
      addLayers();
    } else {
      map.once("load", addLayers);
    }

    const handleClick = (_e: maplibregl.MapLayerMouseEvent) => {
      const feature = _e.features?.[0];
      if (feature) {
        const cellId = String(feature.properties?.cellId ?? "");
        if (cellId) {
          clickHandlerRef.current(cellId);
        }
      }
    };

    map.on("click", CLICKABLE_LAYER_ID, handleClick);

    return () => {
      map.off("click", CLICKABLE_LAYER_ID, handleClick);
      map.off("load", addLayers);
    };
  }, [map]);

  // Update source data when cells change
  useEffect(() => {
    if (!map) return;
    const source = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    if (source) {
      source.setData(cellsToGeoJSON(cells) as unknown as string);
    }
  }, [map, cells]);

  // Update selection filter
  useEffect(() => {
    if (!map) return;
    const layer = map.getLayer(SELECTED_LAYER_ID);
    if (layer) {
      map.setFilter(SELECTED_LAYER_ID, ["==", "id", selectedCellId ?? ""]);
    }
  }, [map, selectedCellId]);
}
