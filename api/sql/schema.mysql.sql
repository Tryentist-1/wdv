-- MySQL schema for WDV Live Updates
-- Updated: 2025-10-06 - Division-based event refactor

CREATE TABLE IF NOT EXISTS archers (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  ext_id VARCHAR(128) NULL COMMENT 'External ID for sync with localStorage',
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  school VARCHAR(3) NOT NULL COMMENT '3-letter school code (e.g., WIS, DVN)',
  level VARCHAR(3) NOT NULL COMMENT 'VAR or JV',
  gender VARCHAR(1) NOT NULL COMMENT 'M or F',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_archers_ext (ext_id),
  KEY idx_archers_name (last_name, first_name),
  KEY idx_archers_division (gender, level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS rounds (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  event_id CHAR(36) NULL COMMENT 'Parent event (1 event = 4 division rounds)',
  round_type VARCHAR(20) NOT NULL COMMENT 'R300 or R360',
  division VARCHAR(10) NOT NULL COMMENT 'BVAR, BJV, GVAR, GJV',
  gender VARCHAR(1) NOT NULL COMMENT 'M or F',
  level VARCHAR(3) NOT NULL COMMENT 'VAR or JV',
  date DATE NOT NULL,
  bale_number INT NULL COMMENT 'Deprecated - use round_archers.bale_number instead',
  status VARCHAR(20) DEFAULT 'Created' COMMENT 'Created, Active, Completed',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_rounds_event (event_id),
  KEY idx_rounds_date (date),
  KEY idx_rounds_division (event_id, division),
  KEY idx_rounds_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS events (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  name VARCHAR(200) NOT NULL,
  date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Planned' COMMENT 'Planned, Active, Completed',
  event_type VARCHAR(20) DEFAULT 'auto_assign' COMMENT 'auto_assign or self_select',
  entry_code VARCHAR(20) NULL COMMENT 'Optional entry code for archer access (e.g., for QR codes)',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_events_date (date),
  KEY idx_events_status (status),
  KEY idx_events_entry_code (entry_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS round_archers (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  round_id CHAR(36) NOT NULL COMMENT 'Division round this scorecard belongs to',
  archer_id CHAR(36) NULL COMMENT 'Reference to archers table (optional)',
  archer_name VARCHAR(200) NOT NULL COMMENT 'Denormalized for performance',
  school VARCHAR(3) COMMENT '3-letter school code',
  level VARCHAR(3) COMMENT 'VAR or JV',
  gender VARCHAR(1) COMMENT 'M or F',
  target_assignment VARCHAR(2) COMMENT 'A-H target letter',
  target_size INT NULL COMMENT 'Target face size in cm (80 or 122)',
  bale_number INT NULL COMMENT 'Assigned bale within event (continuous)',
  completed BOOLEAN DEFAULT FALSE COMMENT 'Scorecard verified and submitted',
  verified_at TIMESTAMP NULL COMMENT 'When verified',
  verified_by VARCHAR(100) NULL COMMENT 'Who verified (device ID)',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_ra_round (round_id),
  KEY idx_ra_bale (round_id, bale_number),
  KEY idx_ra_completed (round_id, completed),
  CONSTRAINT fk_ra_round FOREIGN KEY (round_id) REFERENCES rounds(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS end_events (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  round_id CHAR(36) NOT NULL,
  round_archer_id CHAR(36) NOT NULL,
  end_number INT NOT NULL,
  a1 VARCHAR(3),
  a2 VARCHAR(3),
  a3 VARCHAR(3),
  end_total INT,
  running_total INT,
  tens INT,
  xs INT,
  device_ts DATETIME NULL,
  server_ts DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_ra_end (round_archer_id, end_number),
  KEY idx_ev_round (round_id, end_number),
  KEY idx_ev_ts (server_ts),
  CONSTRAINT fk_ev_round FOREIGN KEY (round_id) REFERENCES rounds(id) ON DELETE CASCADE,
  CONSTRAINT fk_ev_ra FOREIGN KEY (round_archer_id) REFERENCES round_archers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;



