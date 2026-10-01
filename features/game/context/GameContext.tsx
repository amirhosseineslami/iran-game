import { create } from "zustand";
import type { GameCell, GameCellStatus } from "@/features/world/types/gameCell";

interface GameStats {
  total: number;
  claimed: number;
  available: number;
  pending: number;
}

interface PlayerLocation {
  latitude: number;
  longitude: number;
}

interface GameState {
  cells: GameCell[];
  playerId: string;
  selectedCellId: string | null;
  loading: boolean;
  claiming: boolean;
  claimError: string | null;
  loadError: string | null;
  ownedCount: number;
  stats: GameStats;
  initialized: boolean;
  playerLocation: PlayerLocation | null;
  playerClaims: string[];

  initPlayer: () => void;
  loadCells: (cells: GameCell[]) => void;
  setLoadError: (error: string | null) => void;
  selectCell: (cellId: string | null) => void;
  claimCell: (cellId: string) => Promise<void>;
  refreshState: () => Promise<void>;
  setClaimError: (error: string | null) => void;
  setLocation: (location: PlayerLocation) => void;
  addPlayerClaim: (cellId: string) => void;
}

function getOrCreatePlayerId(): string {
  if (typeof window === "undefined") return `player-${Date.now()}`;
  let id = localStorage.getItem("iran-game-player-id");
  if (!id) {
    id = `player-${crypto.randomUUID().slice(0, 8)}`;
    localStorage.setItem("iran-game-player-id", id);
  }
  return id;
}

const emptyStats: GameStats = { total: 0, claimed: 0, available: 0, pending: 0 };

export const useGameStore = create<GameState>((set, get) => ({
  cells: [],
  playerId: "",
  selectedCellId: null,
  loading: true,
  claiming: false,
  claimError: null,
  loadError: null,
  ownedCount: 0,
  stats: emptyStats,
  initialized: false,
  playerLocation: null,
  playerClaims: [],

  initPlayer: () => {
    const playerId = getOrCreatePlayerId();
    set({ playerId, initialized: true });
  },

  loadCells: (cells) => {
    const state = get();
    const ownedCount = cells.filter((c) => c.ownerId === state.playerId).length;
    const claimed = cells.filter((c) => c.status === "claimed").length;
    const pending = cells.filter((c) => c.status === "pending_claim").length;
    const available = cells.filter((c) => c.status === "available").length;
    set({
      cells,
      ownedCount,
      stats: { total: cells.length, claimed, available, pending },
      loading: false,
      loadError: null,
    });
  },

  setLoadError: (error) =>
    set({ loading: false, loadError: error ?? "cells_load_failed" }),

  selectCell: (cellId) => set({ selectedCellId: cellId, claimError: null }),
  setClaimError: (error) => set({ claimError: error }),
  setLocation: (location) => set({ playerLocation: location }),
  addPlayerClaim: (cellId) =>
    set((state) => ({ playerClaims: [...state.playerClaims, cellId] })),

  claimCell: async (cellId) => {
    const state = get();
    const { playerId, cells } = state;
    if (!playerId) return;

    const cell = cells.find((c) => c.id === cellId);
    if (!cell || cell.status !== "available") return;

    set({ claiming: true, claimError: null });

    try {
      const res = await fetch("/api/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: crypto.randomUUID(),
          playerId,
          cellId,
          timestamp: Date.now(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        set({ claimError: data.reason || "claim_failed", claiming: false });
        return;
      }

      const updatedCells = cells.map((c) =>
        c.id === cellId
          ? { ...c, status: "claimed" as GameCellStatus, ownerId: playerId }
          : c
      );
      const ownedCount = updatedCells.filter((c) => c.ownerId === playerId).length;
      const claimed = updatedCells.filter((c) => c.status === "claimed").length;
      const available = updatedCells.filter((c) => c.status === "available").length;

      set({
        cells: updatedCells,
        ownedCount,
        stats: { total: updatedCells.length, claimed, available, pending: 0 },
        claimError: null,
        claiming: false,
        playerClaims: [...get().playerClaims, cellId],
      });
    } catch {
      set({ claimError: "claim_network_error", claiming: false });
    }
  },

  refreshState: async () => {
    set({ loading: true });
    try {
      const res = await fetch("/api/claims");
      if (res.ok) {
        const data = await res.json();
        set({
          stats: {
            total: data.total_count,
            claimed: data.claimed,
            available: data.available,
            pending: data.pending || 0,
          },
          loading: false,
        });
      }
    } catch {
      set({ loading: false });
    }
  },
}));

export function useGame() {
  const cells = useGameStore((s) => s.cells);
  const playerId = useGameStore((s) => s.playerId);
  const selectedCellId = useGameStore((s) => s.selectedCellId);
  const loading = useGameStore((s) => s.loading);
  const claiming = useGameStore((s) => s.claiming);
  const claimError = useGameStore((s) => s.claimError);
  const ownedCount = useGameStore((s) => s.ownedCount);
  const stats = useGameStore((s) => s.stats);
  const playerLocation = useGameStore((s) => s.playerLocation);
  const playerClaims = useGameStore((s) => s.playerClaims);

  const selectedCell = cells.find((c) => c.id === selectedCellId) ?? null;

  return {
    cells,
    playerId,
    selectedCellId,
    selectedCell,
    loading,
    claiming,
    claimError,
    ownedCount,
    stats,
    playerLocation,
    playerClaims,
    selectCell: (id: string | null) => useGameStore.getState().selectCell(id),
    claimCell: (id: string) => useGameStore.getState().claimCell(id),
    refreshState: () => useGameStore.getState().refreshState(),
    initPlayer: () => useGameStore.getState().initPlayer(),
    setLocation: (loc: PlayerLocation) => useGameStore.getState().setLocation(loc),
    addPlayerClaim: (id: string) => useGameStore.getState().addPlayerClaim(id),
  };
}
