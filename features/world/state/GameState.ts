import type { GameCell } from "../types/gameCell";
import { validateBuild } from "../services/buildability";

export interface GameState {
  id: string;
  cells: GameCell[];
  createdAt: number;
  updatedAt: number;
}

export class GameWorld {
  private state: GameState | null = null;
  private listeners: Set<() => void> = new Set();

  load(cells: GameCell[]): void {
    this.state = {
      id: crypto.randomUUID(),
      cells,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.notifyListeners();
  }

  getState(): GameState | null {
    return this.state;
  }

  getCellById(id: string): GameCell | null {
    return this.state?.cells.find((c) => c.id === id) ?? null;
  }

  getCellsForPlayer(playerId: string): GameCell[] {
    return this.state?.cells.filter(
      (c) => c.ownerId === playerId
    ) ?? [];
  }

  getNeighboringCells(
    cell: GameCell,
    radius: number = 1
  ): GameCell[] {
    if (!this.state) return [];

    return this.state.cells.filter(
      (other) =>
        Math.abs(other.row - cell.row) <= radius &&
        Math.abs(other.col - cell.col) <= radius
    );
  }

  buildCell(
    cellId: string,
    playerId: string
  ): { success: boolean; reason?: string } {
    if (!this.state) {
      return { success: false, reason: "no_state" };
    }

    const cell = this.getCellById(cellId);
    if (!cell) {
      return { success: false, reason: "cell_not_found" };
    }

    const neighbors = this.getNeighboringCells(cell);
    const validation = validateBuild(cell, playerId, neighbors);

    if (!validation.valid) {
      return {
        success: false,
        reason: validation.reason,
      };
    }

    const updatedCell = {
      ...cell,
      status: "under_construction" as const,
      constructionStartedAt: Date.now(),
    };

    this.state = {
      ...this.state,
      cells: this.state.cells.map((c) =>
        c.id === cellId ? updatedCell : c
      ),
      updatedAt: Date.now(),
    };

    this.notifyListeners();
    return { success: true };
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener());
  }
}
