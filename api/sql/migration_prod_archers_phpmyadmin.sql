-- =============================================================================
-- PRODUCTION MIGRATION: Archers table columns for bracket/roster release
-- =============================================================================
-- Run this in phpMyAdmin on your shared server (production database).
--
-- HOW TO RUN:
-- 1. Open phpMyAdmin, select your WDV database.
-- 2. Go to the "SQL" tab.
-- 3. Copy and run the statements below ONE AT A TIME (or in small groups).
-- 4. If you see "Duplicate column name" or "Duplicate key name", that column
--    already exists — skip to the next statement.
-- 5. After all run, reload https://archery.tryentist.com/ — archers list
--    should load and the 500 error should be gone.
--
-- These columns are required by GET /api/v1/archers after the bracket workflow
-- deployment. Missing any of them causes a 500 on the home page.
-- =============================================================================

-- 1. assignment (S1–S8, T1–T6 for bracket positions)
ALTER TABLE archers ADD COLUMN assignment VARCHAR(4) NULL DEFAULT '' COMMENT 'S1-S8 solo, T1-T6 team';

-- 2. ranking_avg (for ranking round display)
ALTER TABLE archers ADD COLUMN ranking_avg DECIMAL(5,2) NULL;

-- 3. USA Archery / extended profile fields (run each; skip if "Duplicate column")
ALTER TABLE archers ADD COLUMN valid_from DATE NULL COMMENT 'USA Archery membership valid from';
ALTER TABLE archers ADD COLUMN club_state VARCHAR(50) NULL COMMENT 'Club state';
ALTER TABLE archers ADD COLUMN membership_type VARCHAR(100) NULL;
ALTER TABLE archers ADD COLUMN address_country VARCHAR(100) NULL DEFAULT 'USA';
ALTER TABLE archers ADD COLUMN address_line3 VARCHAR(255) NULL;
ALTER TABLE archers ADD COLUMN disability_list TEXT NULL;
ALTER TABLE archers ADD COLUMN military_service VARCHAR(10) NULL DEFAULT 'No';
ALTER TABLE archers ADD COLUMN introduction_source VARCHAR(100) NULL;
ALTER TABLE archers ADD COLUMN introduction_other VARCHAR(255) NULL;
ALTER TABLE archers ADD COLUMN nfaa_member_no VARCHAR(20) NULL;
ALTER TABLE archers ADD COLUMN school_type VARCHAR(20) NULL;
ALTER TABLE archers ADD COLUMN school_full_name VARCHAR(200) NULL;

-- 4. Shirt/pant/hat sizes (for roster)
ALTER TABLE archers ADD COLUMN shirt_size VARCHAR(10) NULL;
ALTER TABLE archers ADD COLUMN pant_size VARCHAR(10) NULL;
ALTER TABLE archers ADD COLUMN hat_size VARCHAR(10) NULL;

-- 5. Optional index for assignment filter (skip if "Duplicate key")
ALTER TABLE archers ADD INDEX idx_archers_assignment (assignment);

-- =============================================================================
-- VERIFY (optional): List archers columns to confirm all exist
-- =============================================================================
-- SELECT COLUMN_NAME FROM information_schema.COLUMNS
-- WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'archers'
-- ORDER BY ORDINAL_POSITION;
