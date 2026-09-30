"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import type { GameCell } from "@/features/world/types/gameCell";

const DEMO_PLAYER_ID = "player-demo-001";

interface GameState {
  cells: GameCell[];
  selectedCellId: string | null;
  loading: boolean;
  claiming: boolean;
  claimError: string | null;
  ownedCount: number;
  stats: { total: number; claimed: number; available: number };
}

interface GameActions {
  selectCell: (cellId: string) => void;
  claimCell: () => Promise<void>;
  confirmClaim: (cellId: string) => Promise<void>;
  clearError: () => void;
}

export interface GameContextType extends GameState, GameActions {
  selectedCell: GameCell | null;
}

const GameContext = createContext<GameContextType | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [cells, setCells] = useState<GameCell[]>([]);
  const [selectedCellId, setSelectedCellId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [ownedCount, setOwnedCount] = useState(0);
  const [stats, setStats] = useState<{ total: number; claimed: number; available: number }>({
    total: 0,
    claimed: 0,
    available: 0,
  });

  // Load initial game data
  React.useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/claims");
        const data = await res.json();

        if (data.total_count > 0) {
          // Server has existing state
          setStats({
            total: data.total_count,
            claimed: data.claimed,
            available: data.available,
          });
          // TODO: Fetch actual cell data when DB-backed
        } else {
          // Generate fresh demo cells
          const generated = generateDemoCells();
          setCells(generated);
          setStats({
            total: generated.length,
            claimed: 0,
            available: generated.length,
          });
        }
      } catch (e) {
        console.error("Failed to load game state:", e);
        const generated = generateDemoCells();
        setCells(generated);
        setStats({
          total: generated.length,
          claimed: 0,
          available: generated.length,
        });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Update owned count
  React.useEffect(() => {
    const count = cells.filter(c => c.ownerId === DEMO_PLAYER_ID).length;
    setOwnedCount(count);
  }, [cells]);

  const generateDemoCells = (): GameCell[] => {
    const result: GameCell[] = [];
    const tileSize = 0.001;
    const centerLat = 35.6892; // Tehran
    const centerLng = 51.3890;
    const gridSize = 20;

    for (let row = -gridSize; row <= gridSize; row++) {
      for (let col = -gridSize; col <= gridSize; col++) {
        const lat = centerLat + row * tileSize;
        const lng = centerLng + col * tileSize;
        result.push({
          id: `${row}_${col}`,
          row,
          col,
          status: "available",
          ownerId: null,
          polygon: [[
            [lng, lat],
            [lng + tileSize, lat],
            [lng + tileSize, lat + tileSize],
            [lng, lat + tileSize],
            [lng, lat],
          ]],
        });
      }
    }
    return result;
  };

  const selectCell = useCallback((cellId: string) => {
    setSelectedCellId(prev => prev === cellId ? null : cellId);
    setClaimError(null);
  }, []);

  const claimCell = useCallback(async () => {
    const cell = cells.find(c => c.id === selectedCellId);
    if (!cell || cell.status !== "available") return;

    setClaiming(true);
    setClaimError(null);

    try {
      const res = await fetch("/api/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: crypto.randomUUID(),
          playerId: DEMO_PLAYER_ID,
          cellId: cell.id,
          timestamp: Date.now(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.reason) {
          setClaimError(data.reason);
        } else {
          setClaimError("claim_failed");
        }
        return;
      }

      // Update local state
      setCells(prev => prev.map(c =>
        c.id === cell.id
          ? { ...c, status: "pending_claim", ownerId: DEMO_PLAYER_ID, claimedAt: Date.now() }
          : c
      ));
      setStats(prev => ({ ...prev, claimed: prev.claimed + 1, available: prev.available - 1 }));
    } catch (e) {
      setClaimError("claim_network_error");
    } finally {
      setClaiming(false);
    }
  }, [cells, selectedCellId]);

  const confirmClaim = useCallback(async (cellId: string) => {
    try {
      const res = await fetch("/api/claims", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cellId, playerId: DEMO_PLAYER_ID }),
      });

      if (!res.ok) {
        setClaimError("confirm_failed");
        return;
      }

      setCells(prev => prev.map(c =>
        c.id === cellId
          ? { ...c, status: "claimed" }
          : c
      ));
    } catch (e) {
      setClaimError("confirm_network_error");
    }
  }, []);

  const clearError = useCallback(() => {
    setClaimError(null);
  }, []);

  return (
    <GameContext.Provider value={{
      cells,
      selectedCellId,
      selectedCell: cells.find(c => c.id === selectedCellId) ?? null,
      loading,
      claiming,
      claimError,
      ownedCount,
      stats,
      selectCell,
      claimCell,
      confirmClaim,
      clearError,
    }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
}
