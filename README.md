# Iran Game

A location-based territory game built on the real geography of Iran
(Next.js + TypeScript + MapLibre GL + PostgreSQL/PostGIS).

## Getting Started

### Prerequisites

- Node.js 20+ (the Hermes-bundled Node 22 works: `HOME=$HOME ~/.hermes/node/bin/node`)
- PostgreSQL 16 + PostGIS 3.4 — easiest via Docker:

```bash
docker run -d --name iran-game-db \
  -e POSTGRES_PASSWORD='***' \
  -e POSTGRES_DB=iran_game \
  -p 127.0.0.1:5432:5432 \
  --restart unless-stopped \
  postgis/postgis:16-3.4
```

### Configure

`.env.local` (gitignored):

```
DATABASE_URL=postgresql://postgres:***@localhost:5432/iran_game
TEST_DATABASE_URL=postgresql://postgres:***@localhost:5432/iran_game_test
```

### Set up the database

```bash
npm run db:setup      # creates the DB if missing + applies migrations
# test DB:
node scripts/setup-db.mjs postgresql://postgres:***@localhost:5432/iran_game_test
```

### Run

```bash
npm run dev
# or: HOME=$HOME ~/.hermes/node/bin/node ./node_modules/next/dist/bin/next dev -p 3000
```

Open http://localhost:3000.

## Persistence

The game state (cells + claims) is served through a single gateway
(`features/world/server/store.ts`) that resolves one of two backends at
startup:

| mode             | when                                        | claims survive restart? |
| ---------------- | ------------------------------------------- | ----------------------- |
| `postgres`       | `DATABASE_URL` set and reachable            | yes                     |
| `memory`         | `DATABASE_URL` not set                      | no (logged warning)     |
| `memory-fallback`| `DATABASE_URL` set but unreachable          | no (logged error)       |

The active mode is always visible at `GET /api/health`. The fallback is
never silent.

## API

- `GET /api/cells?bbox=minLng,minLat,maxLng,maxLat&limit=n` — viewport cells
- `GET /api/claims` — world stats
- `POST /api/claims` — claim a cell (`sessionId` = idempotency token)
- `DELETE /api/claims` — release a cell you own
- `GET /api/health` — persistence/diagnostics status

## Running with Postgres

The game persists claims in PostgreSQL (production path) and transparently
falls back to an in-memory store when no database is available (e.g. a
dev machine without Postgres). The two modes are never silent — the active
mode is always visible in `GET /api/health`.

### Setup

1. Install/start PostgreSQL (e.g. `sudo apt install postgresql` + start the
   service) and create a database:

   ```bash
   createdb iran_game
   ```

2. Configure `.env.local` (already git-ignored). At minimum:

   ```env
   DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/iran_game
   ```

   An optional `TEST_DATABASE_URL` may be set to point the backend-contract
   test suite at a separate schema.

3. Apply migrations and seed the world grid:

   ```bash
   npm run db:setup
   ```

   This creates the database if missing and applies `scripts/migrations/*.sql`
   idempotently (tracked via `schema_migrations`).

### How the backend is selected

- `DATABASE_URL` set **and reachable** → `mode: "postgres"` (claims persist).
- `DATABASE_URL` set but **unreachable** → `mode: "memory-fallback"`, logged
  as an ERROR (claims are volatile).
- `DATABASE_URL` **not set** → `mode: "memory"`, logged as a WARNING.

Check which mode is live at any time:

```bash
curl localhost:3000/api/health
```

### Env loading

- Next.js loads `.env.local` automatically for `npm run dev` / `npm run build`.
- Vitest loads `.env.local` via `vitest.config.ts` so `DATABASE_URL` and
  `TEST_DATABASE_URL` are visible to tests.
- Standalone Node scripts (`scripts/setup-db.mjs`) read `.env.local` directly.

Pure game-logic unit tests (`tests/api.test.ts`, `tests/store.test.ts`) pin the
deterministic in-memory backend (`IRAN_GAME_BACKEND=memory`) so they stay
isolated from a shared database; the real Postgres path is exercised by
`tests/persistence.test.ts` (backend contract suite).

## Tests

```bash
npm test
```

Unit + integration + backend contract tests. The contract suite runs the
same behavioral tests against the memory backend (always) and the
PostgreSQL backend (when `TEST_DATABASE_URL` resolves), including
concurrent-claim and restart-survival checks.
