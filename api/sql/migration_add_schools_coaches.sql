-- Migration: Add Schools/Clubs and Coaches feature
-- Created: 2025-11-06
-- Status: DRAFT - PENDING REVIEW
-- Description: Adds support for Clubs/Schools and Coaches with many-to-many relationships
-- Related: See docs/SCHOOLS_COACHES_FEATURE_ANALYSIS.md for full analysis and implementation plan

-- ============================================================================
-- SCHOOLS/CLUBS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS schools (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  code VARCHAR(3) NOT NULL COMMENT '1-3 letter school/club code (e.g., WIS, DVN)',
  name VARCHAR(200) NOT NULL COMMENT 'Full name of school/club',
  type ENUM('SCHOOL', 'CLUB') NOT NULL DEFAULT 'SCHOOL' COMMENT 'Type of organization',
  address VARCHAR(255) NULL,
  city VARCHAR(100) NULL,
  state VARCHAR(50) NULL,
  zip VARCHAR(20) NULL,
  phone VARCHAR(20) NULL,
  email VARCHAR(200) NULL,
  website VARCHAR(255) NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'active' COMMENT 'active or inactive',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_schools_code (code),
  KEY idx_schools_name (name),
  KEY idx_schools_type (type),
  KEY idx_schools_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================================
-- COACHES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS coaches (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  nickname VARCHAR(100) NULL,
  email VARCHAR(200) NULL,
  phone VARCHAR(20) NULL,
  photo_url VARCHAR(255) NULL,
  notes TEXT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'active' COMMENT 'active or inactive',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_coaches_name (last_name, first_name),
  KEY idx_coaches_status (status),
  KEY idx_coaches_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================================
-- SCHOOL-COACH RELATIONSHIPS (Many-to-Many)
-- ============================================================================

CREATE TABLE IF NOT EXISTS school_coaches (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  school_id CHAR(36) NOT NULL,
  coach_id CHAR(36) NOT NULL,
  role VARCHAR(50) NULL COMMENT 'e.g., Head Coach, Assistant Coach, Volunteer',
  status VARCHAR(16) NOT NULL DEFAULT 'active' COMMENT 'active or inactive',
  start_date DATE NULL COMMENT 'When coach started at this school',
  end_date DATE NULL COMMENT 'When coach left this school (NULL if still active)',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_school_coach (school_id, coach_id),
  KEY idx_sc_school (school_id),
  KEY idx_sc_coach (coach_id),
  KEY idx_sc_status (status),
  CONSTRAINT fk_sc_school FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
  CONSTRAINT fk_sc_coach FOREIGN KEY (coach_id) REFERENCES coaches(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================================
-- ARCHER-SCHOOL RELATIONSHIPS (Many-to-Many)
-- ============================================================================

CREATE TABLE IF NOT EXISTS archer_schools (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  archer_id CHAR(36) NOT NULL,
  school_id CHAR(36) NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'active' COMMENT 'active or inactive',
  start_date DATE NULL COMMENT 'When archer joined this school/club',
  end_date DATE NULL COMMENT 'When archer left this school/club (NULL if still active)',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_as_archer (archer_id),
  KEY idx_as_school (school_id),
  KEY idx_as_status (status),
  KEY idx_as_dates (start_date, end_date),
  CONSTRAINT fk_as_archer FOREIGN KEY (archer_id) REFERENCES archers(id) ON DELETE CASCADE,
  CONSTRAINT fk_as_school FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================================
-- ARCHER-COACH RELATIONSHIPS (Many-to-Many)
-- ============================================================================

CREATE TABLE IF NOT EXISTS archer_coaches (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  archer_id CHAR(36) NOT NULL,
  coach_id CHAR(36) NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'active' COMMENT 'active or inactive',
  start_date DATE NULL COMMENT 'When archer started with this coach',
  end_date DATE NULL COMMENT 'When archer stopped with this coach (NULL if still active)',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_ac_archer (archer_id),
  KEY idx_ac_coach (coach_id),
  KEY idx_ac_status (status),
  KEY idx_ac_dates (start_date, end_date),
  CONSTRAINT fk_ac_archer FOREIGN KEY (archer_id) REFERENCES archers(id) ON DELETE CASCADE,
  CONSTRAINT fk_ac_coach FOREIGN KEY (coach_id) REFERENCES coaches(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================================
-- DATA MIGRATION: Populate schools table from existing archer school codes
-- ============================================================================

-- Insert unique school codes from archers table into schools table
INSERT INTO schools (id, code, name, type, created_at)
SELECT 
    UUID() as id,
    school as code,
    CONCAT(school, ' School/Club') as name,
    'SCHOOL' as type,
    NOW() as created_at
FROM (
    SELECT DISTINCT school 
    FROM archers 
    WHERE school IS NOT NULL AND school != ''
) AS unique_schools
ON DUPLICATE KEY UPDATE code=code;  -- Skip if code already exists

-- Create archer_school relationships for existing archers
INSERT INTO archer_schools (id, archer_id, school_id, status, created_at)
SELECT 
    UUID() as id,
    a.id as archer_id,
    s.id as school_id,
    'active' as status,
    NOW() as created_at
FROM archers a
INNER JOIN schools s ON a.school = s.code
WHERE a.school IS NOT NULL AND a.school != ''
ON DUPLICATE KEY UPDATE archer_id=archer_id;  -- Skip duplicates

-- ============================================================================
-- NOTES
-- ============================================================================

-- The existing 'school' VARCHAR(3) field on archers table is preserved for backward compatibility
-- New relationships should use the archer_schools junction table for many-to-many support
-- The school code can still be used for quick lookups, but full school details are in schools table

