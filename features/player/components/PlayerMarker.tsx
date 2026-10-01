"use client";

import { useEffect, useRef, useState } from "react";
import { Marker } from "maplibre-gl";
import { useTranslations } from "next-intl";
import type { PlayerLocation } from "../types/playerLocation";
import { playerLocationToMapCoordinates } from "../services/locationUtils";

interface PlayerMarkerProps {
  location: PlayerLocation | null;
}

export default function PlayerMarker({ location }: PlayerMarkerProps) {
  const t = useTranslations("Player");
  const [show, setShow] = useState(false);
  const markerRef = useRef<Marker | null>(null);

  // Sync show state from location
  useEffect(() => {
    setShow(location !== null);
  }, [location]);

  // Create/remove marker
  useEffect(() => {
    // This is a placeholder - actual marker would need map instance from context
    // For now, we just track location availability
  }, [location]);

  if (!show) return null;

  return (
    <div className="absolute bottom-6 left-4 z-20">
      <div className="rounded-full bg-black/80 px-3 py-1.5 text-xs text-white/70 backdrop-blur border border-white/10">
        {t("locationActive")}
      </div>
    </div>
  );
}
