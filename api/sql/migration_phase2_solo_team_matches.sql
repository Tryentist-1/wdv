-- Phase 2: Solo & Team Olympic Match Database Schema
-- Created: November 17, 2025
-- Purpose: Add database support for Solo and Team Olympic matches
-- Mirrors: rounds/round_archers/end_events pattern from Ranking Rounds

-- ============================================================================
-- SOLO OLYMPIC MATCHES
-- ============================================================================

-- Main solo match table (mirrors: rounds)
CREATE TABLE IF NOT EXISTS solo_matches (
  id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  event_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT 'Parent event for coach visibility',
  match_type VARCHAR(20) NOT NULL DEFAULT 'SOLO_OLYMPIC' COMMENT 'Match format',
  date DATE NOT NULL,
  location VARCHAR(200) NULL COMMENT 'Venue name',
  status VARCHAR(20) DEFAULT 'Not Started' COMMENT 'Not Started, In Progress, Completed, Voided',
  max_sets INT NOT NULL DEFAULT 5 COMMENT 'Best of 5 (first to 3 wins)',
  shoot_off BOOLEAN DEFAULT FALSE COMMENT 'Whether match went to shoot-off',
  shoot_off_winner TINYINT NULL COMMENT '1 or 2 (archer position)',
  winner_archer_id CHAR(36) NULL COMMENT 'Reference to winning archer',
  locked BOOLEAN DEFAULT FALSE COMMENT 'Match locked after verification',
  card_status VARCHAR(16) NOT NULL DEFAULT 'PENDING' COMMENT 'PENDING, VER, VOID',
  verified_at TIMESTAMP NULL COMMENT 'When verified by coach',
  verified_by VARCHAR(100) NULL COMMENT 'Who verified (coach ID)',
  notes TEXT NULL COMMENT 'Match notes / void reason',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_solo_event (event_id),
  KEY idx_solo_date (date),
  KEY idx_solo_status (status),
  KEY idx_solo_locked (locked),
  CONSTRAINT fk_solo_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Solo match archers (mirrors: round_archers)
CREATE TABLE IF NOT EXISTS solo_match_archers (
  id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  match_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT 'Parent solo match',
  archer_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT 'Reference to archers table (optional)',
  archer_name VARCHAR(200) NOT NULL COMMENT 'Denormalized for performance',
  school VARCHAR(3) COMMENT '3-letter school code',
  level VARCHAR(3) COMMENT 'VAR or JV',
  gender VARCHAR(1) COMMENT 'M or F',
  position TINYINT NOT NULL COMMENT '1 or 2 (left/right)',
  sets_won INT DEFAULT 0 COMMENT 'Number of sets won',
  total_score INT DEFAULT 0 COMMENT 'Cumulative match score',
  winner BOOLEAN DEFAULT FALSE COMMENT 'TRUE if this archer won',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_solo_match_position (match_id, position),
  KEY idx_soma_match (match_id),
  KEY idx_soma_archer (archer_id),
  KEY idx_soma_winner (match_id, winner),
  CONSTRAINT fk_soma_match FOREIGN KEY (match_id) REFERENCES solo_matches(id) ON DELETE CASCADE,
  CONSTRAINT fk_soma_archer FOREIGN KEY (archer_id) REFERENCES archers(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Solo match sets (mirrors: end_events)
CREATE TABLE IF NOT EXISTS solo_match_sets (
  id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  match_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  match_archer_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  set_number INT NOT NULL COMMENT '1-5 (or 6 for shoot-off)',
  a1 VARCHAR(3) COMMENT 'Arrow 1 score',
  a2 VARCHAR(3) COMMENT 'Arrow 2 score',
  a3 VARCHAR(3) COMMENT 'Arrow 3 score',
  set_total INT COMMENT 'Total for this set (max 30)',
  set_points INT COMMENT '2 (win), 1 (tie), 0 (loss)',
  running_points INT COMMENT 'Cumulative set points',
  tens INT COMMENT 'Count of 10s/Xs in this set',
  xs INT COMMENT 'Count of Xs in this set',
  device_ts DATETIME NULL COMMENT 'Client device timestamp',
  server_ts DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_soma_set (match_archer_id, set_number),
  KEY idx_soms_match (match_id, set_number),
  KEY idx_soms_ts (server_ts),
  CONSTRAINT fk_soms_match FOREIGN KEY (match_id) REFERENCES solo_matches(id) ON DELETE CASCADE,
  CONSTRAINT fk_soms_archer FOREIGN KEY (match_archer_id) REFERENCES solo_match_archers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================================
-- TEAM OLYMPIC MATCHES
-- ============================================================================

-- Main team match table (mirrors: rounds)
CREATE TABLE IF NOT EXISTS team_matches (
  id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  event_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT 'Parent event for coach visibility',
  match_type VARCHAR(20) NOT NULL DEFAULT 'TEAM_OLYMPIC' COMMENT 'Match format',
  date DATE NOT NULL,
  location VARCHAR(200) NULL COMMENT 'Venue name',
  status VARCHAR(20) DEFAULT 'Not Started' COMMENT 'Not Started, In Progress, Completed, Voided',
  max_sets INT NOT NULL DEFAULT 4 COMMENT 'Best of 4 (first to 5 set points wins)',
  shoot_off BOOLEAN DEFAULT FALSE COMMENT 'Whether match went to shoot-off',
  shoot_off_winner TINYINT NULL COMMENT '1 or 2 (team position)',
  winner_team_id CHAR(36) NULL COMMENT 'Reference to winning team',
  locked BOOLEAN DEFAULT FALSE COMMENT 'Match locked after verification',
  card_status VARCHAR(16) NOT NULL DEFAULT 'PENDING' COMMENT 'PENDING, VER, VOID',
  verified_at TIMESTAMP NULL COMMENT 'When verified by coach',
  verified_by VARCHAR(100) NULL COMMENT 'Who verified (coach ID)',
  notes TEXT NULL COMMENT 'Match notes / void reason',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_team_event (event_id),
  KEY idx_team_date (date),
  KEY idx_team_status (status),
  KEY idx_team_locked (locked),
  CONSTRAINT fk_team_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Team definitions within a match
CREATE TABLE IF NOT EXISTS team_match_teams (
  id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  match_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  team_name VARCHAR(200) NULL COMMENT 'Optional team name',
  school VARCHAR(3) COMMENT '3-letter school code',
  position TINYINT NOT NULL COMMENT '1 or 2 (left/right)',
  sets_won INT DEFAULT 0 COMMENT 'Number of sets won',
  total_score INT DEFAULT 0 COMMENT 'Cumulative match score',
  winner BOOLEAN DEFAULT FALSE COMMENT 'TRUE if this team won',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_team_match_position (match_id, position),
  KEY idx_tmt_match (match_id),
  KEY idx_tmt_winner (match_id, winner),
  CONSTRAINT fk_tmt_match FOREIGN KEY (match_id) REFERENCES team_matches(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Team match archers (3 per team) (mirrors: round_archers)
CREATE TABLE IF NOT EXISTS team_match_archers (
  id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  match_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  team_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT 'Which team this archer is on',
  archer_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT 'Reference to archers table (optional)',
  archer_name VARCHAR(200) NOT NULL COMMENT 'Denormalized for performance',
  school VARCHAR(3) COMMENT '3-letter school code',
  level VARCHAR(3) COMMENT 'VAR or JV',
  gender VARCHAR(1) COMMENT 'M or F',
  position TINYINT COMMENT 'Position within team (1-3)',
  total_score INT DEFAULT 0 COMMENT 'Cumulative match score for this archer',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_tma_match (match_id),
  KEY idx_tma_team (team_id),
  KEY idx_tma_archer (archer_id),
  CONSTRAINT fk_tma_match FOREIGN KEY (match_id) REFERENCES team_matches(id) ON DELETE CASCADE,
  CONSTRAINT fk_tma_team FOREIGN KEY (team_id) REFERENCES team_match_teams(id) ON DELETE CASCADE,
  CONSTRAINT fk_tma_archer FOREIGN KEY (archer_id) REFERENCES archers(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Team match sets (mirrors: end_events)
-- Note: Each archer gets 1 arrow per set
CREATE TABLE IF NOT EXISTS team_match_sets (
  id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  match_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  team_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  match_archer_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  set_number INT NOT NULL COMMENT '1-4 (or 5 for shoot-off)',
  a1 VARCHAR(3) COMMENT 'Arrow score (1 arrow per archer per set)',
  set_total INT COMMENT 'Team total for this set (max 30 for 3 archers)',
  set_points INT COMMENT '2 (win), 1 (tie), 0 (loss) - stored per team',
  running_points INT COMMENT 'Cumulative set points for team',
  tens INT COMMENT 'Count of 10s/Xs for team in this set',
  xs INT COMMENT 'Count of Xs for team in this set',
  device_ts DATETIME NULL COMMENT 'Client device timestamp',
  server_ts DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tms_archer_set (match_archer_id, set_number),
  KEY idx_tms_match (match_id, set_number),
  KEY idx_tms_team (team_id, set_number),
  KEY idx_tms_ts (server_ts),
  CONSTRAINT fk_tms_match FOREIGN KEY (match_id) REFERENCES team_matches(id) ON DELETE CASCADE,
  CONSTRAINT fk_tms_team FOREIGN KEY (team_id) REFERENCES team_match_teams(id) ON DELETE CASCADE,
  CONSTRAINT fk_tms_archer FOREIGN KEY (match_archer_id) REFERENCES team_match_archers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Solo match leaderboards and coach console views
CREATE INDEX idx_solo_complete ON solo_matches(status, date DESC);
CREATE INDEX idx_solo_event_status ON solo_matches(event_id, status);

-- Team match leaderboards and coach console views
CREATE INDEX idx_team_complete ON team_matches(status, date DESC);
CREATE INDEX idx_team_event_status ON team_matches(event_id, status);

-- Quick lookup for match participants
CREATE INDEX idx_soma_name ON solo_match_archers(archer_name);
CREATE INDEX idx_tma_name ON team_match_archers(archer_name);

-- ============================================================================
-- COMMENTS
-- ============================================================================

-- Solo Olympic Match Scoring Rules:
-- - Best of 5 sets (first to 3 wins)
-- - Each set: 3 arrows per archer
-- - Highest total wins set: 2 points
-- - Tie: each archer gets 1 point
-- - First to 6 set points wins match
-- - If tied at 5-5, shoot-off (set 6)

-- Team Olympic Match Scoring Rules:
-- - Best of 4 sets (first to 5 set points wins)
-- - Each set: 1 arrow per archer (3 archers per team = 3 arrows total)
-- - Highest team total wins set: 2 points
-- - Tie: each team gets 1 point
-- - First to 5 set points wins match
-- - If tied at 4-4, shoot-off (set 5)

-- Verification Workflow (mirrors Ranking Rounds):
-- 1. Match created with status='Not Started'
-- 2. Archers score sets (status='In Progress')
-- 3. All sets completed (status='Completed')
-- 4. Coach reviews and locks (locked=TRUE, card_status='VER')
-- 5. Event closed (event status='Completed')
-- 6. After event closure, no edits allowed

-- Migration Notes:
-- - This schema mirrors the proven Ranking Round pattern
-- - Uses UUIDs for all IDs (not sequential)
-- - Includes verification fields for coach workflow
-- - Supports event integration for coach visibility
-- - Includes offline timestamp tracking (device_ts/server_ts)
-- - Foreign keys ensure referential integrity
-- - Indexes optimize common queries (leaderboards, coach console)

-- To apply this migration:
-- mysql -u root -p wdv_local < api/sql/migration_phase2_solo_team_matches.sql

