#!/usr/bin/env node
/**
 * Iran Game — database setup / migration runner.
 *
 * Usage:
 *   npm run db:setup                 # uses DATABASE_URL from env or .env.local
 *   node scripts/setup-db.mjs <url>   # explicit URL
 *
 * Safety:
 * - Only ever CREATES the database (if missing) and applies migrations that
 *   are recorded in `schema_migrations`. Never drops or truncates.
 * - Prints the target URL with the password redacted before doing anything.
 */

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function resolveDatabaseUrl() {
  const arg = process.argv[2];
  if (arg) return arg;
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  try {
    const env = readFileSync(path.join(root, ".env.local"), "utf8");
    const m = env.match(/^DATABASE_URL=(.*)$/m);
    if (m) return m[1].trim();
  } catch {
    /* no .env.local */
  }
  return null;
}

function redact(url) {
  return url.replace(/\/\/([^:/@]+):([^@]+)@/, "//$1:***@");
}

async function ensureDatabase(url) {
  const u = new URL(url);
  const dbName = u.pathname.replace(/^\//, "");
  if (!dbName) throw new Error("DATABASE_URL has no database name");
  if (!/^[a-z_][a-z0-9_]*$/.test(dbName)) {
    throw new Error(`invalid database name: ${dbName}`);
  }
  const adminUrl = new URL(url);
  adminUrl.pathname = "/postgres";
  const client = new pg.Client({ connectionString: adminUrl.toString() });
  await client.connect();
  try {
    const res = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [dbName]);
    if (res.rowCount === 0) {
      await client.query(`CREATE DATABASE ${dbName}`);
      console.log(`[db] created database "${dbName}"`);
    } else {
      console.log(`[db] database "${dbName}" already exists`);
    }
  } finally {
    await client.end();
  }
}

async function migrate(url) {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    await client.query(
      `CREATE TABLE IF NOT EXISTS schema_migrations (
         version TEXT PRIMARY KEY,
         applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
       )`
    );
    const dir = path.join(root, "scripts/migrations");
    const files = readdirSync(dir)
      .filter((f) => f.endsWith(".sql"))
      .sort();
    for (const file of files) {
      const applied = await client.query("SELECT 1 FROM schema_migrations WHERE version = $1", [
        file,
      ]);
      if (applied.rowCount > 0) {
        console.log(`[db] skip ${file} (already applied)`);
        continue;
      }
      const sql = readFileSync(path.join(dir, file), "utf8");
      try {
        await client.query("BEGIN");
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (version) VALUES ($1)", [file]);
        await client.query("COMMIT");
        console.log(`[db] applied ${file}`);
      } catch (err) {
        await client.query("ROLLBACK").catch(() => undefined);
        throw new Error(`${file} failed: ${err.message}`);
      }
    }
    console.log("[db] migrations up to date");
  } finally {
    await client.end();
  }
}

const url = resolveDatabaseUrl();
if (!url) {
  console.error("[db] no DATABASE_URL found (argument, env, or .env.local)");
  process.exit(1);
}
console.log(`[db] target: ${redact(url)}`);

try {
  await ensureDatabase(url);
  await migrate(url);
  console.log("[db] setup complete");
} catch (err) {
  console.error(`[db] setup FAILED: ${err.message}`);
  process.exit(1);
}
