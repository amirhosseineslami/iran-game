"use client";

import { useEffect, useState } from "react";

import {
  GeoJSONSource,
  type MapLayerMouseEvent,
} from "maplibre-gl";

import { useTranslations } from "next-intl";

import {
  useMapInstance,
} from "../../map/context/MapContext";

import {
  generateDeterministicCells,
} from "../services/generateBuildableCells";

import {
  cellsToGeoJSON,
} from "../services/cellsToGeoJSON";

import {
  claimCell,
} from "../services/claimCell";

import type { GameCell } from "../types/gameCell";

const SOURCE_ID = "game-cells";

const FILL_LAYER_ID =
  "game-cells-fill";

const OUTLINE_LAYER_ID =
  "game-cells-outline";

const DEMO_PLAYER_ID =
  "demo-player";

export default function BuildableGrid() {
  const map = useMapInstance();

  const t = useTranslations("World");

  const [cells, setCells] =
    useState<GameCell[]>(
      () =>
        generateDeterministicCells()
    );

  const [
    selectedCellId,
    setSelectedCellId,
  ] = useState<string | null>(null);

  const selectedCell =
    cells.find(
      (cell) =>
        cell.id === selectedCellId
    ) ?? null;

  useEffect(() => {
    if (!map) return;

    if (map.getSource(SOURCE_ID)) {
      return;
    }

    map.addSource(SOURCE_ID, {
      type: "geojson",
      data: cellsToGeoJSON(cells),
    });

    map.addLayer({
      id: FILL_LAYER_ID,
      type: "fill",
      source: SOURCE_ID,

      paint: {
        "fill-color": [
          "case",

          ["==", ["get", "status"], "claimed"],

          "#f59e0b",

          "#22c55e",
        ],

        "fill-opacity": 0.18,
      },
    });

    map.addLayer({
      id: OUTLINE_LAYER_ID,
      type: "line",
      source: SOURCE_ID,

      paint: {
        "line-color":
          "#ffffff",

        "line-width": 1,

        "line-opacity": 0.6,
      },
    });

    const handleClick = (
      event: MapLayerMouseEvent
    ) => {
      const feature =
        event.features?.[0];

      if (!feature) {
        return;
      }

      const cellId =
        feature.properties?.cellId;

      if (!cellId) {
        return;
      }

      setSelectedCellId(
        String(cellId)
      );
    };

    map.on(
      "click",
      FILL_LAYER_ID,
      handleClick
    );

    map.on(
      "mouseenter",
      FILL_LAYER_ID,
      () => {
        map.getCanvas().style.cursor =
          "pointer";
      }
    );

    map.on(
      "mouseleave",
      FILL_LAYER_ID,
      () => {
        map.getCanvas().style.cursor =
          "";
      }
    );

    return () => {
      map.off(
        "click",
        FILL_LAYER_ID,
        handleClick
      );

      if (
        map.getLayer(
          FILL_LAYER_ID
        )
      ) {
        map.removeLayer(
          FILL_LAYER_ID
        );
      }

      if (
        map.getLayer(
          OUTLINE_LAYER_ID
        )
      ) {
        map.removeLayer(
          OUTLINE_LAYER_ID
        );
      }

      if (
        map.getSource(
          SOURCE_ID
        )
      ) {
        map.removeSource(
          SOURCE_ID
        );
      }
    };
  }, [map]);

  useEffect(() => {
    if (!map) return;

    const source =
      map.getSource(
        SOURCE_ID
      ) as
        | GeoJSONSource
        | undefined;

    if (!source) return;

    source.setData(
      cellsToGeoJSON(cells)
    );
  }, [map, cells]);

  function handleClaim() {
    if (!selectedCell) {
      return;
    }

    const result = claimCell(
      selectedCell,
      DEMO_PLAYER_ID
    );

    if (!result.success || !result.cell) {
      return;
    }

    setCells(
      (currentCells) =>
        currentCells.map(
          (cell) =>
            cell.id ===
            selectedCell.id
              ? result.cell!
              : cell
        )
    );
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      <div className="absolute bottom-6 left-1/2 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2">
        {selectedCell ? (
          <div className="pointer-events-auto rounded-2xl bg-black/90 p-4 text-white shadow-2xl backdrop-blur">
            <div className="mb-2 text-sm text-gray-400">
              {t("gameCell")}
            </div>

            <div className="mb-3 text-lg font-bold">
              {selectedCell.id}
            </div>

            <div className="mb-4 text-sm">
              {t("status")}:{" "}
              {selectedCell.status ===
              "available"
                ? t("available")
                : t("claimed")}
            </div>

            {selectedCell.status ===
              "available" && (
              <button
                type="button"
                onClick={handleClaim}
                className="w-full rounded-xl bg-green-500 px-4 py-3 font-bold text-black transition hover:bg-green-400"
              >
                {t("claim")}
              </button>
            )}

            {selectedCell.status ===
              "claimed" &&
              selectedCell.ownerId ===
                DEMO_PLAYER_ID && (
                <div className="text-center text-sm text-green-400">
                  ✓ {t("claimed")}
                </div>
              )}
          </div>
        ) : (
          <div className="pointer-events-auto mx-auto w-fit rounded-full bg-black/80 px-4 py-2 text-sm text-white shadow-lg backdrop-blur">
            {t("selectCell")}
          </div>
        )}
      </div>
    </div>
  );
}
