import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import type { CellBackend } from "@/features/world/server/backends/cellBackend";
import {
  MemoryCellBackend,
  resetMemoryStore,
} from "@/features/world/server/backends/memoryCellBackend";
import { createPostgresCellBackend } from "@/features/world/server/backends/postgresCellBackend";

/**
 * Backend contract tests: the SAME behavioral suite runs against every
 * CellBackend implementation, so the memory fallback can never drift from
 * the production PostgreSQL path.
 *
 * - memory:   always (deterministic, no external deps).
 * - postgres: when TEST_DATABASE_URL is resolvable (env var or .env.local);
 *             the suite fails loudly if the URL is set but the DB is down,
 *             because opting in implies the DB should be reachable
 *             (npm run db:setup against the test URL first).
 */

function resolveTestDatabaseUrl(): string | null {
  if (process.env.TEST_DATABASE_URL) return process.env.TEST_DATABASE_URL;
  try {
    const env = readFileSync(path.resolve(process.cwd(), ".env.local"), "utf8");
    const m = env.match(/^TEST_DATABASE_URL=(.*)$/m);
    if (m && m[1].trim()) return m[1].trim();
  } catch {
    /* no .env.local */
  }
  return null;
}

interface ClaimRecord {
  cellId: string;
  playerId: string;
}

function runContract(
  label: string,
  hooks: {
    createBackend: () => Promise<CellBackend>;
    beforeEach?: () => void | Promise<void>;
    createSecondBackend?: () => Promise<CellBackend>;
  }
): void {
  describe(`CellBackend contract — ${label}`, () => {
    let backend: CellBackend;
    const claims: ClaimRecord[] = [];

    beforeAll(async () => {
      backend = await hooks.createBackend();
    }, 60_000);

    afterAll(async () => {
      await backend.close?.();
    });

    beforeEach(async () => {
      await hooks.beforeEach?.();
      claims.length = 0;
    });

    afterEach(async () => {
      // Always give claimed cells back so runs stay repeatable.
      for (const c of claims) {
        await backend.releaseClaim(c.cellId, c.playerId).catch(() => undefined);
      }
    });

    /** Claim a cell and register it for cleanup. */
    async function claim(cellId: string, playerId: string, sessionId?: string) {
      const out = await backend.attemptClaim({
        cellId,
        playerId,
        timestamp: Date.now(),
        sessionId,
      });
      if (out.ok) claims.push({ cellId, playerId });
      return out;
    }

    async function findBuildableCellId(): Promise<string> {
      const cells = await backend.getAllCells();
      const cell = cells.find(
        (c) => c.buildability === "buildable" && c.status === "available"
      );
      expect(cell).toBeDefined();
      return cell!.id;
    }

    async function findNonBuildableCellId(): Promise<string> {
      const cells = await backend.getAllCells();
      const cell = cells.find(
        (c) => c.buildability === "non_buildable" || c.buildability === "restricted"
      );
      expect(cell).toBeDefined();
      return cell!.id;
    }

    it("seeds the full 101x101 grid with the expected shape", async () => {
      const cells = await backend.getAllCells();
      expect(cells.length).toBe(10201);
      const [cell] = cells;
      expect(cell.id).toBeTruthy();
      expect(typeof cell.row).toBe("number");
      expect(typeof cell.col).toBe("number");
      expect(cell.polygon.length).toBeGreaterThan(0);
      expect(cell.polygon[0].length).toBeGreaterThanOrEqual(4);
      expect(cell.buildability).toBeTruthy();
    });

    it("getCellById returns known cells and null for unknown ids", async () => {
      const cell = await backend.getCellById("cell-0-0");
      expect(cell?.id).toBe("cell-0-0");
      expect(await backend.getCellById("does-not-exist")).toBeNull();
    });

    it("claims an available, buildable cell", async () => {
      const id = await findBuildableCellId();
      const out = await claim(id, "contract-player-a");
      expect(out.ok).toBe(true);
      if (out.ok) {
        expect(out.duplicate).toBe(false);
        expect(out.cell.status).toBe("claimed");
        expect(out.cell.ownerId).toBe("contract-player-a");
        expect(typeof out.cell.claimedAt).toBe("number");
      }
      const stored = await backend.getCellById(id);
      expect(stored?.status).toBe("claimed");
      expect(stored?.ownerId).toBe("contract-player-a");
    });

    it("rejects unknown, non-buildable and already-claimed cells", async () => {
      const missing = await backend.attemptClaim({
        cellId: "does-not-exist",
        playerId: "contract-player-a",
        timestamp: Date.now(),
      });
      expect(missing.ok).toBe(false);
      if (!missing.ok) expect(missing.reason).toBe("CELL_NOT_FOUND");

      const nbId = await findNonBuildableCellId();
      const nb = await backend.attemptClaim({
        cellId: nbId,
        playerId: "contract-player-a",
        timestamp: Date.now(),
      });
      expect(nb.ok).toBe(false);
      if (!nb.ok) expect(nb.reason).toBe("CELL_NOT_BUILDABLE");

      const id = await findBuildableCellId();
      const first = await claim(id, "contract-player-a");
      expect(first.ok).toBe(true);
      const second = await backend.attemptClaim({
        cellId: id,
        playerId: "contract-player-b",
        timestamp: Date.now(),
      });
      expect(second.ok).toBe(false);
      if (!second.ok) expect(second.reason).toBe("CELL_NOT_AVAILABLE");
    });

    it("replays the same claim session idempotently (duplicate flag)", async () => {
      const id = await findBuildableCellId();
      const sessionId = `contract-session-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      const first = await claim(id, "contract-player-a", sessionId);
      expect(first.ok).toBe(true);
      if (first.ok) expect(first.duplicate).toBe(false);

      const second = await backend.attemptClaim({
        cellId: id,
        playerId: "contract-player-a",
        timestamp: Date.now() + 1,
        sessionId,
      });
      expect(second.ok).toBe(true);
      if (second.ok) expect(second.duplicate).toBe(true);
    });

    it("releases cells for the owner only", async () => {
      const id = await findBuildableCellId();
      await claim(id, "contract-player-a");

      expect(await backend.releaseClaim(id, "contract-player-b")).toBe(false);
      expect((await backend.getCellById(id))?.status).toBe("claimed");

      expect(await backend.releaseClaim(id, "contract-player-a")).toBe(true);
      const released = await backend.getCellById(id);
      expect(released?.status).toBe("available");
      expect(released?.ownerId).toBeNull();

      expect(await backend.releaseClaim("does-not-exist", "contract-player-a")).toBe(false);
    });

    it("returns owned cells from getCellsForPlayer", async () => {
      const suffix = `${Date.now()}`;
      const playerA = `contract-a-${suffix}`;
      const playerB = `contract-b-${suffix}`;

      const id1 = await findBuildableCellId();
      await claim(id1, playerA);
      const id2 = await findBuildableCellId();
      expect(id2).not.toBe(id1); // id1 is claimed by now, so a different cell
      await claim(id2, playerA);
      const id3 = await findBuildableCellId();
      expect(id3).not.toBe(id1);
      expect(id3).not.toBe(id2);
      await claim(id3, playerB);

      const aCells = await backend.getCellsForPlayer(playerA);
      expect(aCells.length).toBe(2);
      expect(aCells.every((c) => c.ownerId === playerA)).toBe(true);

      const bCells = await backend.getCellsForPlayer(playerB);
      expect(bCells.length).toBe(1);
      expect(bCells[0].id).toBe(id3);

      expect((await backend.getCellsForPlayer("nobody")).length).toBe(0);
    });

    it("returns only cells whose center is inside the bbox", async () => {
      const bbox = { minLng: 51.38, minLat: 35.68, maxLng: 51.42, maxLat: 35.72 };
      const all = await backend.getAllCells();
      const inBbox = await backend.getCellsInBbox(bbox);
      expect(inBbox.length).toBeGreaterThan(0);
      expect(inBbox.length).toBeLessThan(all.length);
      for (const cell of inBbox) {
        const ring = cell.polygon[0];
        let sumLng = 0;
        let sumLat = 0;
        for (const [lng, lat] of ring) {
          sumLng += lng;
          sumLat += lat;
        }
        const cLng = sumLng / ring.length;
        const cLat = sumLat / ring.length;
        expect(cLng).toBeGreaterThanOrEqual(bbox.minLng);
        expect(cLng).toBeLessThanOrEqual(bbox.maxLng);
        expect(cLat).toBeGreaterThanOrEqual(bbox.minLat);
        expect(cLat).toBeLessThanOrEqual(bbox.maxLat);
      }
    });

    it("resolves concurrent claims on one cell to exactly one winner", async () => {
      const id = await findBuildableCellId();
      const results = await Promise.all([
        backend.attemptClaim({
          cellId: id,
          playerId: "race-a",
          timestamp: Date.now(),
          sessionId: `race-a-${Date.now()}`,
        }),
        backend.attemptClaim({
          cellId: id,
          playerId: "race-b",
          timestamp: Date.now(),
          sessionId: `race-b-${Date.now()}`,
        }),
      ]);
      const winners = results.filter((r) => r.ok);
      expect(winners.length).toBe(1);
      if (winners[0] && winners[0].ok) {
        claims.push({ cellId: id, playerId: winners[0].cell.ownerId! });
      }
      const stored = await backend.getCellById(id);
      expect(stored?.status).toBe("claimed");
      expect(winners[0] && winners[0].ok).toBe(true);
      if (winners[0] && winners[0].ok) {
        expect(stored?.ownerId).toBe(winners[0].cell.ownerId);
      }
    });
  });
}

// ---------------------------------------------------------------------------
// memory backend — always runs (deterministic fallback + test double)
// ---------------------------------------------------------------------------
runContract("memory", {
  createBackend: async () => new MemoryCellBackend(),
  beforeEach: () => {
    resetMemoryStore();
  },
});

// ---------------------------------------------------------------------------
// postgres backend — runs when TEST_DATABASE_URL resolves (env or .env.local)
// ---------------------------------------------------------------------------
const testDatabaseUrl = resolveTestDatabaseUrl();

if (testDatabaseUrl) {
  runContract("postgres", {
    createBackend: () => createPostgresCellBackend(testDatabaseUrl),
  });

  describe("CellBackend contract — postgres restart survival", () => {
    it("claims made through one backend instance are visible to a fresh instance", async () => {
      const backendA = await createPostgresCellBackend(testDatabaseUrl);
      try {
        const cells = await backendA.getAllCells();
        const target = cells.find(
          (c) => c.buildability === "buildable" && c.status === "available"
        );
        expect(target).toBeDefined();

        const out = await backendA.attemptClaim({
          cellId: target!.id,
          playerId: "restart-survivor",
          timestamp: Date.now(),
          sessionId: `restart-${Date.now()}`,
        });
        expect(out.ok).toBe(true);

        // Simulate a server restart: brand-new pool, no shared state.
        const backendB = await createPostgresCellBackend(testDatabaseUrl);
        try {
          const reloaded = await backendB.getCellById(target!.id);
          expect(reloaded?.status).toBe("claimed");
          expect(reloaded?.ownerId).toBe("restart-survivor");

          // A different session token on the already-claimed cell conflicts.
          const replay = await backendB.attemptClaim({
            cellId: target!.id,
            playerId: "restart-survivor",
            timestamp: Date.now() + 1,
            sessionId: `restart-${Date.now()}-other`,
          });
          expect(replay.ok).toBe(false);
          if (!replay.ok) expect(replay.reason).toBe("CELL_NOT_AVAILABLE");

          await backendB.releaseClaim(target!.id, "restart-survivor");
        } finally {
          await backendB.close?.();
        }
      } finally {
        await backendA.close?.();
      }
    }, 60_000);
  });
}

