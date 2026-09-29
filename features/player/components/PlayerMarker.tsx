"use client";

import { useEffect, useRef } from "react";
import { Marker } from "maplibre-gl";

import {
  useMapInstance,
} from "../../map/context/MapContext";

import {
  playerLocationToMapCoordinates,
} from "../services/locationUtils";

import type { PlayerLocation } from "../types/playerLocation";

interface PlayerMarkerProps {
  location: PlayerLocation | null;
}

export default function PlayerMarker({
  location,
}: PlayerMarkerProps) {
  const map = useMapInstance();

  const markerRef =
    useRef<Marker | null>(null);

  useEffect(() => {
    if (!map || !location) {
      return;
    }

    const coordinates =
      playerLocationToMapCoordinates(location);

    if (!markerRef.current) {
      const element =
        document.createElement("div");

      element.className =
        "relative h-8 w-8";

      element.innerHTML = `
        <div
          style="
            position:absolute;
            inset:0;
            border-radius:9999px;
            background:rgba(59,130,246,0.20);
            animation:pulse 2s infinite;
          "
        ></div>

        <div
          style="
            position:absolute;
            left:50%;
            top:50%;
            width:16px;
            height:16px;
            transform:translate(-50%,-50%);
            border-radius:9999px;
            background:#2563eb;
            border:3px solid white;
            box-shadow:0 2px 8px rgba(0,0,0,0.35);
          "
        ></div>
      `;

      markerRef.current =
        new Marker({
          element,
          anchor: "center",
        })
          .setLngLat([
            coordinates.lng,
            coordinates.lat,
          ])
          .addTo(map);
    } else {
      markerRef.current.setLngLat([
        coordinates.lng,
        coordinates.lat,
      ]);
    }

    return () => {
      markerRef.current?.remove();
      markerRef.current = null;
    };
  }, [map, location]);

  return null;
}
