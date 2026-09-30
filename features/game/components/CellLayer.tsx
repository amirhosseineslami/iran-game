import React from "react";
import * as maplibregl from "maplibre-gl";
import type { GameCell } from "@/features/world/types/gameCell";

const SOURCE_ID = "game-cells";
const FILL_LAYER_ID = "game-cells-fill";
const OUTLINE_LAYER_ID = "game-cells-outline";
const SELECTED_LAYER_ID = "game-cells-selected";

export interface CellLayerOptions {
  map: maplibregl.Map | null;
  cells: GameCell[];
  selectedCellId: string | null;
  onCellClick: (cellId: string) => void;
}

export function useCellLayer(opts: CellLayerOptions) {
  const { map, cells, selectedCellId, onCellClick } = opts;

  const cellsRef = React.useRef(cells);
  cellsRef.current = cells;

  const selectedRef = React.useRef(selectedCellId);
  selectedRef.current = selectedCellId;

  const clickHandlerRef = React.useRef(onCellClick);
  clickHandlerRef.current = onCellClick;

  React.useEffect(() => {
    if (!map) return;

    const addLayers = () => {
      if (map.getSource(SOURCE_ID)) return;

      map.addSource(SOURCE_ID, {
        type: "geojson",
        data: cellsToGeoJSON(cells),
      });

      map.addLayer({
        id: FILL_LAYER_ID,
        type: "fill",
        source: SOURCE_ID,
        paint: {
          "fill-color": ["case",
            ["==", ["get", "status"], "claimed"], "#f59e0b",
            ["==", ["get", "status"], "pending_claim"], "#3b82f6",
            "#22c55e",
          ],
          "fill-opacity": 0.25,
        },
      });

      map.addLayer({
        id: OUTLINE_LAYER_ID,
        type: "line",
        source: SOURCE_ID,
        paint: {
          "line-color": "#ffffff",
          "line-width": 1,
          "line-opacity": 0.5,
        },
      });

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

    const handleClick = (e: maplibregl.MapLayerMouseEvent) => {
      const feature = e.features?.[0];
      if (feature) {
        const cellId = String(feature.properties?.cellId ?? "");
        if (cellId) {
          clickHandlerRef.current(cellId);
        }
      }
    };

    // MapLibre v6 uses on('click') with layer name
    map.on("click", FILL_LAYER_ID, handleClick);
    
    // Cursor change on hover
    map.getCanvas().addEventListener("mousedown", () => {
      map.getCanvas().style.cursor = "grabbing";
    });
    map.getCanvas().addEventListener("mouseup", () => {
      map.getCanvas().style.cursor = "";
    });

    return () => {
      map.off("click", FILL_LAYER_ID, handleClick);
      map.off("load", addLayers);
      
      // Clean up canvas event listeners
      const canvas = map.getCanvas();
      canvas.removeEventListener("mousedown", () => {});
      canvas.removeEventListener("mouseup", () => {});
    };
  }, [map]);

  // Update data when cells change
  React.useEffect(() => {
    if (!map) return;
    const source = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource;
    if (source) {
      source.setData(cellsToGeoJSON(cells));
    }
  }, [map, cells]);

  // Update selected highlight
  React.useEffect(() => {
    if (!map) return;
    const layer = map.getLayer(SELECTED_LAYER_ID);
    if (layer) {
      map.setFilter(SELECTED_LAYER_ID, ["==", "id", selectedCellId ?? ""]);
    }
  }, [map, selectedCellId]);
}

function cellsToGeoJSON(cells: GameCell[]) {
  const features = cells.map(cell => ({
    type: "Feature" as const,
    id: cell.id,
    geometry: {
      type: "Polygon" as const,
      coordinates: cell.polygon,
    },
    properties: {
      cellId: cell.id,
      status: cell.status,
      ownerId: cell.ownerId,
    },
  }));
  return { type: "FeatureCollection" as const, features };
}
