"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { PlayerLocation } from "../types/playerLocation";
import { getFilteredPosition, applyHysteresis } from "../services/locationQuality";

interface UsePlayerLocationResult {
  location: PlayerLocation | null;
  loading: boolean;
  error: string | null;
  permissionDenied: boolean;
  confidence: number;
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
  const [confidence, setConfidence] = useState(0);

  const watchIdRef = useRef<number | null>(null);
  const lastPositionRef = useRef<{ lat: number; lng: number } | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const startedRef = useRef(false);

  const clearWatch = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const startWatching = useCallback(() => {
    if (!navigator.geolocation) {
      setError(t("errorNoGeolocation"));
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setPermissionDenied(false);
    startedRef.current = true;

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 5000,
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const filtered = getFilteredPosition(position);
        if (!filtered) return;

        const result = applyHysteresis(
          filtered.latitude,
          filtered.longitude,
          lastPositionRef.current?.lat ?? null,
          lastPositionRef.current?.lng ?? null,
          filtered.accuracy
        );

        lastPositionRef.current = { lat: result.latitude, lng: result.longitude };

        const playerLocation: PlayerLocation = {
          latitude: result.latitude,
          longitude: result.longitude,
          accuracy: filtered.accuracy,
          timestamp: position.timestamp,
        };

        setLocation(playerLocation);
        setConfidence(filtered.quality.confidence);
        setLoading(false);
      },
      (err) => {
        setLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setPermissionDenied(true);
        }
        setError(t(GEO_ERROR_KEYS[err.code] ?? "errorUnknown"));
      },
      options
    );

    timeoutRef.current = window.setTimeout(() => {
      if (startedRef.current && !location) {
        setLoading(false);
        setError(t("errorTimeout"));
      }
    }, 10000);
  }, [t, location]);

  const refresh = useCallback(() => {
    clearWatch();
    startedRef.current = false;
    startWatching();
  }, [clearWatch, startWatching]);

  // Start watching after a short delay to avoid blocking render
  useEffect(() => {
    const timer = setTimeout(() => {
      startWatching();
    }, 100);
    return () => {
      clearTimeout(timer);
      clearWatch();
    };
  }, [startWatching, clearWatch]);

  return { location, loading, error, permissionDenied, confidence, refresh };
}
