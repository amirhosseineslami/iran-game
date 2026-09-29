"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import type { PlayerLocation } from "../types/playerLocation";

interface UsePlayerLocationResult {
  location: PlayerLocation | null;
  loading: boolean;
  error: string | null;
  permissionDenied: boolean;
  refresh: () => void;
}

const GEO_ERROR_KEYS: Record<number, string> = {
  1: "errorPermissionDenied",
  2: "errorPositionUnavailable",
  3: "errorTimeout",
};

export function usePlayerLocation(): UsePlayerLocationResult {
  const t = useTranslations("Player");

  const [location, setLocation] = useState<PlayerLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError(t("errorNoGeolocation"));
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setPermissionDenied(false);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        });
        setLoading(false);
      },
      (positionError) => {
        setLoading(false);

        if (positionError.code === positionError.PERMISSION_DENIED) {
          setPermissionDenied(true);
        }

        setError(
          t(GEO_ERROR_KEYS[positionError.code] ?? "errorUnknown")
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      }
    );
  }, [t]);

  return {
    location,
    loading,
    error,
    permissionDenied,
    refresh: requestLocation,
  };
}
