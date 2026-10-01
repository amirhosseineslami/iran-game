"use client";

import { useEffect, useCallback } from "react";
import { useGameStore } from "@/features/game/context/GameContext";

interface PlayerLocation {
  latitude: number;
  longitude: number;
}

export function useGameState() {
  const cells = useGameStore((s) => s.cells);
  const playerId = useGameStore((s) => s.playerId);
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

  // Initialize player on mount
  useEffect(() => {
    initPlayer();
    
    // Try to get real geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        () => {}, // Error callback - ignore
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    }
  }, [initPlayer, setLocation]);

  // Load demo data from API
  useEffect(() => {
    fetch("/api/cells")
      .then(res => res.json())
      .then(data => loadCells(data as any))
      .catch(console.error);
  }, [loadCells]);

  const selectedCell = cells.find(c => c.id === selectedCellId) ?? null;

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
