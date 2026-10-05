import { Pool, type PoolClient, type QueryResultRow } from "pg";
import type { GameCell, GameCellStatus, LngLat } from "@/features/world/types/gameCell";
import { generateTestFeatures } from "@/features/world/services/__fixtures__/testGeography";
import { generateCellsFromGeography } from "@/features/world/services/generateBuildableCells";
import type { Bbox, CellBackend, ClaimAttempt, ClaimOutcome } from "./cellBackend";

/**
 * Production cell backend — PostgreSQL + PostGIS.
 *
 * - Claims are applied inside a transaction with row locking (SELECT ... FOR
 *   UPDATE), so concurrent claims on the same cell resolve to exactly one
 *   winner.
 * - Claim idempotency is persisted in `claim_requests`, so replayed requests
 *   survive server restarts.
 * - The world grid is seeded from the geography generator on first use when
 *   the table is empty; later starts load persisted state (incl. claims).
 * - Bbox queries use the GiST index on `geom` (&& prefilter) refined to
 *   center-in-bbox semantics matching the memory backend.
 */

const CELL_COLUMNS = `id, row_num, col_num, status, player_id,
  ST_AsGeoJSON(geom) AS polygon_json, metadata, created_at, claimed_at, construction_started_at`;

interface CellRow extends QueryResultRow {
  id: string;
  row_num: number;
  col_num: number;
  status: string;
  player_id: string | null;
  polygon_json: string;
  metadata: { buildability?: string } | null;
  created_at: Date | null;
  claimed_at: Date | null;
  construction_started_at: Date | null;
}

function rowToCell(r: CellRow): GameCell {
  const polygon = (
    typeof r.polygon_json === "string" ? JSON.parse(r.polygon_json) : r.polygon_json
  ) as { coordinates: LngLat[][] };

  const cell: GameCell = {
    id: r.id,
    row: r.row_num,
    col: r.col_num,
    status: r.status as GameCellStatus,
    ownerId: r.player_id,
    polygon: polygon.coordinates,
    createdAt: r.created_at ? r.created_at.getTime() : undefined,
    buildability: (r.metadata?.buildability as GameCell["buildability"]) ?? "buildable",
  };
  if (r.claimed_at) cell.claimedAt = r.claimed_at.getTime();
  if (r.construction_started_at) cell.constructionStartedAt = r.construction_started_at.getTime();
  return cell;
}

function polygonToWkt(polygon: LngLat[][]): string {
  const rings = polygon
    .map((ring) => `(${ring.map(([lng, lat]) => `${lng} ${lat}`).join(",")})`)
    .join(",");
  return `POLYGON(${rings})`;
}

export class PostgresCellBackend implements CellBackend {
  readonly kind = "postgres" as const;

  constructor(private readonly pool: Pool) {}

  /** Verify connectivity + schema, seed the world if the table is empty. */
  async init(): Promise<void> {
    await this.pool.query("SELECT 1");
    const schema = await this.pool.query("SELECT to_regclass('game_cells') AS t");
    if (!schema.rows[0].t) {
      throw new Error("game_cells table missing — run `npm run db:setup` first");
    }
    await this.seedIfEmpty();
  }

  private async seedIfEmpty(): Promise<void> {
    const { rows } = await this.pool.query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM game_cells"
    );
    if (Number(rows[0].count) > 0) return;

    const cells = generateCellsFromGeography(generateTestFeatures());
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const BATCH = 500;
      for (let i = 0; i < cells.length; i += BATCH) {
        const batch = cells.slice(i, i + BATCH);
        const placeholders: string[] = [];
        const params: unknown[] = [];
        batch.forEach((cell, j) => {
          const o = j * 7;
          placeholders.push(
            `($${o + 1}, $${o + 2}, $${o + 3}, ` +
              `ST_GeomFromText($${o + 4}, 4326), ` +
              `ST_Centroid(ST_GeomFromText($${o + 4}, 4326))::geography, ` +
              `$${o + 5}, $${o + 6}::jsonb, $${o + 7})`
          );
          params.push(
            cell.id,
            cell.row,
            cell.col,
            polygonToWkt(cell.polygon),
            cell.status,
            JSON.stringify({ buildability: cell.buildability }),
            new Date(cell.createdAt ?? Date.now())
          );
        });
        await client.query(
          `INSERT INTO game_cells
             (id, row_num, col_num, geom, center_point, status, metadata, created_at)
           VALUES ${placeholders.join(",")}
           ON CONFLICT (id) DO NOTHING`,
          params
        );
      }
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw err;
    } finally {
      client.release();
    }
  }

  async getAllCells(): Promise<GameCell[]> {
    const { rows } = await this.pool.query<CellRow>(
      `SELECT ${CELL_COLUMNS} FROM game_cells ORDER BY row_num, col_num`
    );
    return rows.map(rowToCell);
  }

  async getCellsInBbox(bbox: Bbox): Promise<GameCell[]> {
    const { rows } = await this.pool.query<CellRow>(
      `SELECT ${CELL_COLUMNS} FROM game_cells
       WHERE geom && ST_MakeEnvelope($1, $2, $3, $4, 4326)
         AND ST_X(center_point::geometry) BETWEEN $1 AND $3
         AND ST_Y(center_point::geometry) BETWEEN $2 AND $4
       ORDER BY row_num, col_num`,
      [bbox.minLng, bbox.minLat, bbox.maxLng, bbox.maxLat]
    );
    return rows.map(rowToCell);
  }

  async getCellById(id: string): Promise<GameCell | null> {
    const { rows } = await this.pool.query<CellRow>(
      `SELECT ${CELL_COLUMNS} FROM game_cells WHERE id = $1`,
      [id]
    );
    return rows[0] ? rowToCell(rows[0]) : null;
  }

  async getCellsForPlayer(playerId: string): Promise<GameCell[]> {
    const { rows } = await this.pool.query<CellRow>(
      `SELECT ${CELL_COLUMNS} FROM game_cells WHERE player_id = $1 ORDER BY row_num, col_num`,
      [playerId]
    );
    return rows.map(rowToCell);
  }

  async replaceCell(cell: GameCell): Promise<void> {
    await this.pool.query(
      `INSERT INTO game_cells
         (id, player_id, row_num, col_num, geom, center_point, status,
          claimed_at, construction_started_at, metadata, created_at, updated_at)
       VALUES (
         $1, $2, $3, $4,
         ST_GeomFromText($5, 4326),
         ST_Centroid(ST_GeomFromText($5, 4326))::geography,
         $6,
         $7::timestamptz, $8::timestamptz, $9::jsonb,
         to_timestamp($10::double precision / 1000.0), now()
       )
       ON CONFLICT (id) DO UPDATE SET
         player_id = EXCLUDED.player_id,
         geom = EXCLUDED.geom,
         center_point = EXCLUDED.center_point,
         status = EXCLUDED.status,
         claimed_at = EXCLUDED.claimed_at,
         construction_started_at = EXCLUDED.construction_started_at,
         metadata = EXCLUDED.metadata,
         updated_at = now()`,
      [
        cell.id,
        cell.ownerId,
        cell.row,
        cell.col,
        polygonToWkt(cell.polygon),
        cell.status,
        cell.claimedAt ? new Date(cell.claimedAt) : null,
        cell.constructionStartedAt ? new Date(cell.constructionStartedAt) : null,
        JSON.stringify({ buildability: cell.buildability ?? "buildable" }),
        cell.createdAt ?? Date.now(),
      ]
    );
  }

  async attemptClaim(input: ClaimAttempt): Promise<ClaimOutcome> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      // Idempotent replay: this session token was already processed.
      if (input.sessionId) {
        const dup = await client.query(
          "SELECT 1 FROM claim_requests WHERE session_token = $1",
          [input.sessionId]
        );
        if (dup.rowCount && dup.rowCount > 0) {
          const outcome = await this.duplicateOutcome(client, input);
          await client.query("COMMIT");
          return outcome;
        }
      }

      const { rows } = await client.query<CellRow>(
        `SELECT ${CELL_COLUMNS} FROM game_cells WHERE id = $1 FOR UPDATE`,
        [input.cellId]
      );
      if (!rows[0]) {
        await client.query("COMMIT");
        return { ok: false, reason: "CELL_NOT_FOUND", duplicate: false };
      }

      const cell = rowToCell(rows[0]);
      if (cell.status !== "available") {
        // A concurrent replay of the *same* session may have won the race;
        // report it as a duplicate instead of a plain conflict.
        if (input.sessionId) {
          const dup = await client.query(
            "SELECT 1 FROM claim_requests WHERE session_token = $1",
            [input.sessionId]
          );
          if (dup.rowCount && dup.rowCount > 0) {
            const outcome = await this.duplicateOutcome(client, input);
            await client.query("COMMIT");
            return outcome;
          }
        }
        await client.query("COMMIT");
        return { ok: false, reason: "CELL_NOT_AVAILABLE", duplicate: false };
      }
      if (cell.buildability === "non_buildable" || cell.buildability === "restricted") {
        await client.query("COMMIT");
        return { ok: false, reason: "CELL_NOT_BUILDABLE", duplicate: false };
      }

      await client.query(
        `UPDATE game_cells
         SET status = 'claimed', player_id = $2,
             claimed_at = to_timestamp($3::double precision / 1000.0),
             session_id = $4, updated_at = now()
         WHERE id = $1`,
        [input.cellId, input.playerId, input.timestamp, input.sessionId ?? null]
      );
      if (input.sessionId) {
        await client.query(
          `INSERT INTO claim_requests (session_token, cell_id, player_id)
           VALUES ($1, $2, $3) ON CONFLICT (session_token) DO NOTHING`,
          [input.sessionId, input.cellId, input.playerId]
        );
      }
      await client.query("COMMIT");

      return {
        ok: true,
        cell: { ...cell, status: "claimed", ownerId: input.playerId, claimedAt: input.timestamp },
        duplicate: false,
      };
    } catch (err) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw err;
    } finally {
      client.release();
    }
  }

  /** Reconstruct the outcome of an already-processed claim session. */
  private async duplicateOutcome(
    client: PoolClient,
    input: ClaimAttempt
  ): Promise<ClaimOutcome> {
    const { rows } = await client.query<CellRow>(
      `SELECT ${CELL_COLUMNS} FROM game_cells WHERE id = $1`,
      [input.cellId]
    );
    const cell = rows[0] ? rowToCell(rows[0]) : null;
    if (!cell) return { ok: false, reason: "CELL_NOT_FOUND", duplicate: false };
    if (cell.status === "claimed" && cell.ownerId === input.playerId) {
      return { ok: true, cell, duplicate: true };
    }
    // Token processed but cell no longer matches — mirror the memory backend
    // by falling through to a normal claim outcome.
    if (cell.status !== "available") {
      return { ok: false, reason: "CELL_NOT_AVAILABLE", duplicate: false };
    }
    if (cell.buildability === "non_buildable" || cell.buildability === "restricted") {
      return { ok: false, reason: "CELL_NOT_BUILDABLE", duplicate: false };
    }
    return { ok: false, reason: "CELL_NOT_AVAILABLE", duplicate: false };
  }

  async releaseClaim(cellId: string, playerId: string): Promise<boolean> {
    const res = await this.pool.query(
      `UPDATE game_cells
       SET status = 'available', player_id = NULL, claimed_at = NULL,
           session_id = NULL, updated_at = now()
       WHERE id = $1 AND player_id = $2 AND status = 'claimed'`,
      [cellId, playerId]
    );
    return (res.rowCount ?? 0) > 0;
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

/** Connect, verify schema and seed the world. Throws on any failure. */
export async function createPostgresCellBackend(databaseUrl: string): Promise<PostgresCellBackend> {
  const pool = new Pool({
    connectionString: databaseUrl,
    max: 10,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30_000,
  });
  pool.on("error", (err) => {
    console.error(`[persistence] postgres idle client error: ${err.message}`);
  });
  const backend = new PostgresCellBackend(pool);
  await backend.init();
  return backend;
}


