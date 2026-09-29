"use client";

import {
  useEffect,
  useState,
  type RefObject,
} from "react";

import {
  Map,
  NavigationControl,
  setWorkerUrl,
} from "maplibre-gl";

setWorkerUrl(
  "/maplibre/maplibre-gl-worker.mjs"
);

export function useGameMap(
  container: RefObject<HTMLDivElement | null>
) {
  const [mapInstance, setMapInstance] =
    useState<Map | null>(null);

  useEffect(() => {
    if (!container.current) {
      return;
    }

    const map = new Map({
      container: container.current,

      style:
        "https://demotiles.maplibre.org/style.json",

      center: [51.389, 35.6892],

      zoom: 12.5,
    });

    map.addControl(
      new NavigationControl(),
      "top-right"
    );

    map.once("load", () => {
      setMapInstance(map);
    });

    return () => {
      setMapInstance(null);
      map.remove();
    };
  }, [container]);

  return mapInstance;
}
