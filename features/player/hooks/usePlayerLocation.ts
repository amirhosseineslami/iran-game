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

const WATCH_TIMEOUT_MS = 12_000;
const START_DELAY_MS = 100;

/**
 * Fallback location for environments where the browser geolocation is
 * unavailable, denied, or times out (common in Iran where GPS/granting
 * permission to non-https localhost can be flaky). Using a fixed Tehran
 * center keeps the game fully playable — the player marker renders at the
 * map center and claiming still works.
 */
const TEHRAN_MOCK: PlayerLocation = {
  latitude: 35.6892,
  longitude: 51.389,
  accuracy: 1500,
  timestamp: Date.now(),
  isMock: true,
};

/** Geolocation error codes (spec) that should downgrade to the Tehran mock. */
// POSITION_UNAVAILABLE(2) and TIMEOUT(3) always downgrade to the mock; we
// keep a real error string so the user understands GPS is unavailable.

function makeMockLocation(): PlayerLocation {
  return { ...TEHRAN_MOCK, timestamp: Date.now() };
}

export function usePlayerLocation(): UsePlayerLocationResult {
  const t = useTranslations("Player");
  const [location, setLocation] = useState<PlayerLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [confidence, setConfidence] = useState(0);

  const watchIdRef = useRef<number | null>(null);
  const lastPositionRef = useRef<{ lat: number; lng: number } | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedRef = useRef(false);
  const locationRef = useRef<PlayerLocation | null>(null);

  // Keep ref in sync with state for use inside callbacks
  useEffect(() => {
    locationRef.current = location;
  }, [location]);

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
      timeout: 10_000,
      maximumAge: 5_000,
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
        // Graceful fallback: keep the game playable even without live GPS.
        // Permission denial keeps an informational flag set above, but a mock
        // location still lets the player marker render and claims proceed.
        setLocation(makeMockLocation());
        setConfidence(0.15);
      },
      options
    );

    // Timeout: if no location after WATCH_TIMEOUT_MS, fall back to the
    // Tehran mock so the game stays usable (GPS is unreliable in Iran).
    timeoutRef.current = setTimeout(() => {
      if (startedRef.current && !locationRef.current) {
        setLoading(false);
        setError(t("errorTimeout"));
        setLocation(makeMockLocation());
        setConfidence(0.15);
      }
    }, WATCH_TIMEOUT_MS);
  }, [t]);

  const refresh = useCallback(() => {
    clearWatch();
    startedRef.current = false;
    lastPositionRef.current = null;
    startWatching();
  }, [clearWatch, startWatching]);

  useEffect(() => {
    const timer = setTimeout(() => {
      startWatching();
    }, START_DELAY_MS);
    return () => {
      clearTimeout(timer);
      clearWatch();
    };
  }, [startWatching, clearWatch]);

  return { location, loading, error, permissionDenied, confidence, refresh };
}
