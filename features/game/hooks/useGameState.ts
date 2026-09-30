import { useState, useEffect, useCallback } from "react";
import type { GameCell } from "@/features/world/types/gameCell";

const DEMO_PLAYER_ID = "player-demo-001";
const CELLS_PER_REQUEST = 100;

interface GameOptions {
  centerLat: number;
  centerLng: number;
  gridSize: number;
  tileSize: number;
}

export function useGameState(opts?: Partial<GameOptions>) {
  const [cells, setCells] = useState<GameCell[]>([]);
  const [selectedCellId, setSelectedCellId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [ownedCount, setOwnedCount] = useState(0);
  const [stats, setStats] = useState<{ total: number; claimed: number; available: number }>({ total: 0, claimed: 0, available: 0 });

  const centerLat = opts?.centerLat ?? 35.6892;
  const centerLng = opts?.centerLng ?? 51.3890;
  const gridSize = opts?.gridSize ?? 20;
  const tileSize = opts?.tileSize ?? 0.001;

  // Generate initial cells if not loaded from server
  const generateCells = useCallback((): GameCell[] => {
    const result: GameCell[] = [];
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
  }, [centerLat, centerLng, gridSize, tileSize]);

  // Load game data
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/claims");
        const data = await res.json();
        
        if (data.total_count > 0) {
          // Server has cells - use them
          setStats({ total: data.total_count, claimed: data.claimed, available: data.available });
        } else {
          // Generate fresh cells
          const generated = generateCells();
          setCells(generated);
          setStats({ total: generated.length, claimed: 0, available: generated.length });
        }
      } catch (e) {
        console.error("Failed to load game state:", e);
        const generated = generateCells();
        setCells(generated);
        setStats({ total: generated.length, claimed: 0, available: generated.length });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [generateCells]);

  // Update owned count
  useEffect(() => {
    const count = cells.filter(c => c.ownerId === DEMO_PLAYER_ID).length;
    setOwnedCount(count);
  }, [cells]);

  const selectedCell = cells.find(c => c.id === selectedCellId) ?? null;

  const selectCell = useCallback((cellId: string) => {
    setSelectedCellId(prev => prev === cellId ? null : cellId);
    setClaimError(null);
  }, []);

  const claimCell = useCallback(async () => {
    if (!selectedCell || selectedCell.status !== "available") return;

    setClaiming(true);
    setClaimError(null);

    try {
      const res = await fetch("/api/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: crypto.randomUUID(),
          playerId: DEMO_PLAYER_ID,
          cellId: selectedCell.id,
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
        c.id === selectedCell.id
          ? { ...c, status: "pending_claim", ownerId: DEMO_PLAYER_ID, claimedAt: Date.now() }
          : c
      ));
      setStats(prev => ({ ...prev, claimed: prev.claimed + 1, available: prev.available - 1 }));
    } catch (e) {
      setClaimError("claim_network_error");
    } finally {
      setClaiming(false);
    }
  }, [selectedCell]);

  const confirmClaim = useCallback(async (cellId: string) => {
    try {
      const res = await fetch(`/api/claims`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cellId, playerId: DEMO_PLAYER_ID }),
      });

      if (!res.ok) {
        setClaimError("confirm_failed");
        return;
      }

      // Update local state
      setCells(prev => prev.map(c =>
        c.id === cellId
          ? { ...c, status: "claimed" }
          : c
      ));
    } catch (e) {
      setClaimError("confirm_network_error");
    }
  }, []);

  return {
    cells,
    selectedCell,
    selectedCellId,
    loading,
    claiming,
    claimError,
    ownedCount,
    stats,
    selectCell,
    claimCell,
    confirmClaim,
  };
}
