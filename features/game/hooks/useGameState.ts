"use client";

import { useEffect } from "react";
import { useGameStore } from "@/features/game/context/GameContext";

export function useGameState() {
  const cells = useGameStore((s) => s.cells);
  const selectedCellId = useGameStore((s) => s.selectedCellId);
  const loading = useGameStore((s) => s.loading);
  const claiming = useGameStore((s) => s.claiming);
  const claimError = useGameStore((s) => s.claimError);
  const ownedCount = useGameStore((s) => s.ownedCount);
  const stats = useGameStore((s) => s.stats);
  const playerLocation = useGameStore((s) => s.playerLocation);

  const selectCell = useGameStore((s) => s.selectCell);
  const claimCell = useGameStore((s) => s.claimCell);
  const initPlayer = useGameStore((s) => s.initPlayer);
  const setLocation = useGameStore((s) => s.setLocation);
  const loadCells = useGameStore((s) => s.loadCells);
  const setLoadError = useGameStore((s) => s.setLoadError);

  // One-shot player init + opportunistic geolocation.
  // Geolocation never gates the game: failure is swallowed by design.
  useEffect(() => {
    initPlayer();

    if (typeof navigator === "undefined" || !navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }),
      () => {
        /* location is optional; failure must not affect game loading */
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  }, [initPlayer, setLocation]);

  // Load cells exactly once. Every terminal path clears `loading`.
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function run() {
      try {
        const res = await fetch("/api/cells", { signal: controller.signal });
        if (!res.ok) {
          throw new Error(`cells request failed: ${res.status}`);
        }
        const data = await res.json();
        if (cancelled) return;
        loadCells(Array.isArray(data?.cells) ? data.cells : []);
      } catch (err) {
        if (cancelled) return;
        if ((err as { name?: string })?.name === "AbortError") return;
        console.error("Failed to load cells:", err);
        setLoadError("cells_load_failed");
      }
    }

    run();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  const selectedCell = cells.find((c) => c.id === selectedCellId) ?? null;

  return {
    cells,
    selectedCellId,
    selectedCell,
    loading,
    claiming,
    claimError,
    playerLocation,
    ownedCount,
    stats,
    selectCell,
    claimCell,
    initPlayer,
  };
}

export default useGameState;
