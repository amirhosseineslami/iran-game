"use client";

import {
  useRef,
  type ReactNode,
} from "react";

import { useTranslations } from "next-intl";

import { useGameMap } from "../hooks/useGameMap";
import { MapProvider } from "../context/MapContext";

interface GameMapProps {
  children?: ReactNode;
}

export default function GameMap({
  children,
}: GameMapProps) {
  const mapContainer =
    useRef<HTMLDivElement>(null);

  const mapInstance =
    useGameMap(mapContainer);

  const t = useTranslations("Map");

  return (
    <MapProvider map={mapInstance}>
      <div className="relative h-full w-full">
        <div
          ref={mapContainer}
          className="h-full w-full"
        />

        <div className="absolute left-4 top-4 z-10 rounded-xl bg-black/80 px-4 py-3 text-white shadow-lg backdrop-blur">
          <div className="text-lg font-bold">
            {t("title")}
          </div>

          <div className="text-sm text-gray-300">
            {t("beta")}
          </div>
        </div>

        {children}
      </div>
    </MapProvider>
  );
}
