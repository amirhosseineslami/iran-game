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

## Tests

```bash
npm test
```

Unit + integration + backend contract tests. The contract suite runs the
same behavioral tests against the memory backend (always) and the
PostgreSQL backend (when `TEST_DATABASE_URL` resolves), including
concurrent-claim and restart-survival checks.
