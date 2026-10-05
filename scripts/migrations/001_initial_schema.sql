-- Iran Game Database Schema
-- PostgreSQL + PostGIS extension required
--
-- Domain alignment notes:
-- * game_cells.id is TEXT because domain cell ids are "cell-{row}-{col}".
-- * The game grid is global: cells are unique by (row_num, col_num).
-- * Player references are opaque TEXT ids (client-generated, e.g.
--   "player-1a2b3c4d"). There is no authentication system yet, so ownership
--   is enforced at the application layer and there is no FK to players.
--   players/game_sessions are kept for the future account system.

CREATE EXTENSION IF NOT EXISTS postgis;

-- Players table (reserved for the future account system)
CREATE TABLE players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(100),
    avatar_url TEXT,
    stats JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Game sessions table (reserved for the future account/auth system)
CREATE TABLE game_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'active', -- active, suspended, ended
    started_at TIMESTAMPTZ DEFAULT now(),
    last_active_at TIMESTAMPTZ DEFAULT now(),
    ended_at TIMESTAMPTZ
);

-- Game cells (territory claims)
CREATE TABLE game_cells (
    id TEXT PRIMARY KEY,

    -- Provenance of the claim (session_id is the idempotency token of the
    -- claim action that created the row state; nullable for unclaimed cells)
    session_id TEXT,
    player_id TEXT,

    -- Grid position
    row_num INTEGER NOT NULL,
    col_num INTEGER NOT NULL,

    -- Geometry
    geom GEOMETRY(Polygon, 4326) NOT NULL,
    center_point GEOGRAPHY(Point, 4326) NOT NULL,

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'available', -- available, claimed, pending_claim, under_construction

    -- Timing
    claimed_at TIMESTAMPTZ,
    construction_started_at TIMESTAMPTZ,

    -- Metadata (buildability, source provenance, ...)
    metadata JSONB NOT NULL DEFAULT '{}',

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT unique_cell_position UNIQUE (row_num, col_num)
);

-- Create spatial index on game cells
CREATE INDEX idx_game_cells_geom ON game_cells USING GIST (geom);
CREATE INDEX idx_game_cells_status ON game_cells (status);
CREATE INDEX idx_game_cells_player ON game_cells (player_id);

-- Claim idempotency: one row per processed claim session token.
-- Lets replayed/duplicated claim requests return the original outcome
-- instead of double-applying.
CREATE TABLE claim_requests (
    session_token TEXT PRIMARY KEY,
    cell_id TEXT NOT NULL REFERENCES game_cells(id) ON DELETE CASCADE,
    player_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_claim_requests_cell ON claim_requests (cell_id);

-- Player positions (for location tracking)
CREATE TABLE player_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id TEXT NOT NULL,
    session_id TEXT,

    -- Location
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(10, 8) NOT NULL,
    accuracy DECIMAL(10, 2) NOT NULL, -- meters
    altitude DECIMAL(10, 2),

    -- Quality metrics
    quality_score DECIMAL(5, 4), -- 0-1 confidence
    heading DECIMAL(10, 4),
    speed DECIMAL(10, 4),

    -- Timestamp
    recorded_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for position lookups
CREATE INDEX idx_player_positions_player ON player_positions (player_id);
CREATE INDEX idx_player_positions_session ON player_positions (session_id);
CREATE INDEX idx_player_positions_recorded ON player_positions (recorded_at DESC);

-- Build structures
CREATE TABLE build_structures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cell_id TEXT REFERENCES game_cells(id) ON DELETE CASCADE,
    structure_type VARCHAR(50) NOT NULL, -- house, shop, workshop, office, ...
    level INTEGER DEFAULT 1,
    hp INTEGER,
    max_hp INTEGER,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indices for queries
CREATE INDEX idx_build_structures_cell ON build_structures (cell_id);
CREATE INDEX idx_build_structures_type ON build_structures (structure_type);

-- Audit log
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT,
    player_id TEXT,
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50),
    entity_id TEXT,
    old_value JSONB,
    new_value JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_audit_log_session ON audit_log (session_id);
CREATE INDEX idx_audit_log_player ON audit_log (player_id);
CREATE INDEX idx_audit_log_created ON audit_log (created_at DESC);
