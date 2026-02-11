-- =============================================================================
-- PRODUCTION: Run this on your SHARED MySQL (phpMyAdmin / production DB)
-- =============================================================================
-- Purpose: Ensures columns required for GET /v1/archers and bracket/import features.
--
-- If you get 500 on /api/v1/archers, the usual cause is a missing column.
-- Run each statement below; skip any that report "Duplicate column" or "Duplicate key".
-- =============================================================================

-- 1. assignment (S1-S8 solo, T1-T6 team) - for position filter & Import Roster Games
--    Skip if: Duplicate column name 'assignment'
ALTER TABLE archers
  ADD COLUMN assignment VARCHAR(4) NULL DEFAULT '' COMMENT 'S1-S8 solo, T1-T6 team'
  AFTER level;

-- 2. ranking_avg - REQUIRED by GET /v1/archers (missing = 500)
--    Skip if: Duplicate column name 'ranking_avg'
ALTER TABLE archers ADD COLUMN ranking_avg DECIMAL(5,2) NULL COMMENT 'Ranking round average';

-- 3. Index for filtering by position (optional)
--    Skip if: Duplicate key name 'idx_archers_assignment'
ALTER TABLE archers ADD INDEX idx_archers_assignment (assignment);

-- =============================================================================
-- Verify (optional): check column exists
-- =============================================================================
-- DESCRIBE archers;
-- Or: SELECT COLUMN_NAME FROM information_schema.COLUMNS
--     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'archers' AND COLUMN_NAME = 'assignment';
