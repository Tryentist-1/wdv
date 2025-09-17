-- MySQL schema for WDV Live Updates

CREATE TABLE IF NOT EXISTS archers (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  ext_id VARCHAR(128) NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  school VARCHAR(100),
  level VARCHAR(50),
  gender VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_archers_ext (ext_id),
  KEY idx_archers_name (last_name, first_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS rounds (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  event_id CHAR(36) NULL,
  round_type VARCHAR(20) NOT NULL,
  date DATE NOT NULL,
  bale_number INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_rounds_event (event_id),
  KEY idx_rounds_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS events (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  name VARCHAR(200) NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_events_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS round_archers (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  round_id CHAR(36) NOT NULL,
  archer_id CHAR(36) NULL,
  archer_name VARCHAR(200) NOT NULL,
  school VARCHAR(100),
  level VARCHAR(50),
  gender VARCHAR(20),
  target_assignment VARCHAR(2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_ra_round (round_id),
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



