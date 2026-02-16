-- Migration: Add bale/target/wave fields for Games Event support
-- Date: February 15, 2026
-- Purpose: Support bale and target assignment on matches for Games Events
--          Add event-level bale configuration and event format field
-- Safety: All new columns are nullable with defaults. Idempotent (safe to run multiple times).

SET @schema := DATABASE();

-- =====================================================
-- 1. Add event_format to events table
-- =====================================================
SELECT IF(
    EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = @schema
          AND table_name = 'events'
          AND column_name = 'event_format'
    ),
    'SELECT 1',
    'ALTER TABLE events
        ADD COLUMN event_format VARCHAR(20) NULL DEFAULT NULL
            COMMENT \'Event format: GAMES or SANCTIONED (NULL for legacy)\'
            AFTER event_type;'
) INTO @sql_event_format;
PREPARE stmt_event_format FROM @sql_event_format;
EXECUTE stmt_event_format;
DEALLOCATE PREPARE stmt_event_format;

-- =====================================================
-- 2. Add total_bales to events table
-- =====================================================
SELECT IF(
    EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = @schema
          AND table_name = 'events'
          AND column_name = 'total_bales'
    ),
    'SELECT 1',
    'ALTER TABLE events
        ADD COLUMN total_bales INT NULL DEFAULT NULL
            COMMENT \'Number of bales available for this event\'
            AFTER event_format;'
) INTO @sql_total_bales;
PREPARE stmt_total_bales FROM @sql_total_bales;
EXECUTE stmt_total_bales;
DEALLOCATE PREPARE stmt_total_bales;

-- =====================================================
-- 3. Add targets_per_bale to events table
-- =====================================================
SELECT IF(
    EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = @schema
          AND table_name = 'events'
          AND column_name = 'targets_per_bale'
    ),
    'SELECT 1',
    'ALTER TABLE events
        ADD COLUMN targets_per_bale INT NULL DEFAULT 4
            COMMENT \'Number of targets per bale (default 4: A, B, C, D)\'
            AFTER total_bales;'
) INTO @sql_targets_per_bale;
PREPARE stmt_targets_per_bale FROM @sql_targets_per_bale;
EXECUTE stmt_targets_per_bale;
DEALLOCATE PREPARE stmt_targets_per_bale;

-- =====================================================
-- 4. Add bale_number to solo_matches
-- =====================================================
SELECT IF(
    EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = @schema
          AND table_name = 'solo_matches'
          AND column_name = 'bale_number'
    ),
    'SELECT 1',
    'ALTER TABLE solo_matches
        ADD COLUMN bale_number INT NULL DEFAULT NULL
            COMMENT \'Bale number for this match\'
            AFTER bracket_match_id;'
) INTO @sql_solo_bale;
PREPARE stmt_solo_bale FROM @sql_solo_bale;
EXECUTE stmt_solo_bale;
DEALLOCATE PREPARE stmt_solo_bale;

-- =====================================================
-- 5. Add line_number to solo_matches
-- =====================================================
SELECT IF(
    EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = @schema
          AND table_name = 'solo_matches'
          AND column_name = 'line_number'
    ),
    'SELECT 1',
    'ALTER TABLE solo_matches
        ADD COLUMN line_number TINYINT NULL DEFAULT NULL
            COMMENT \'Line number: 1 (targets A,B) or 2 (targets C,D)\'
            AFTER bale_number;'
) INTO @sql_solo_line;
PREPARE stmt_solo_line FROM @sql_solo_line;
EXECUTE stmt_solo_line;
DEALLOCATE PREPARE stmt_solo_line;

-- =====================================================
-- 6. Add wave to solo_matches
-- =====================================================
SELECT IF(
    EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = @schema
          AND table_name = 'solo_matches'
          AND column_name = 'wave'
    ),
    'SELECT 1',
    'ALTER TABLE solo_matches
        ADD COLUMN wave VARCHAR(1) NULL DEFAULT NULL
            COMMENT \'Wave identifier: A or B (NULL if single wave)\'
            AFTER line_number;'
) INTO @sql_solo_wave;
PREPARE stmt_solo_wave FROM @sql_solo_wave;
EXECUTE stmt_solo_wave;
DEALLOCATE PREPARE stmt_solo_wave;

-- =====================================================
-- 7. Add target_assignment to solo_match_archers
-- =====================================================
SELECT IF(
    EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = @schema
          AND table_name = 'solo_match_archers'
          AND column_name = 'target_assignment'
    ),
    'SELECT 1',
    'ALTER TABLE solo_match_archers
        ADD COLUMN target_assignment VARCHAR(1) NULL DEFAULT NULL
            COMMENT \'Target letter: A, B, C, or D\'
            AFTER position;'
) INTO @sql_solo_archer_target;
PREPARE stmt_solo_archer_target FROM @sql_solo_archer_target;
EXECUTE stmt_solo_archer_target;
DEALLOCATE PREPARE stmt_solo_archer_target;

-- =====================================================
-- 8. Add bale_number to team_matches
-- =====================================================
SELECT IF(
    EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = @schema
          AND table_name = 'team_matches'
          AND column_name = 'bale_number'
    ),
    'SELECT 1',
    'ALTER TABLE team_matches
        ADD COLUMN bale_number INT NULL DEFAULT NULL
            COMMENT \'Bale number for this match\'
            AFTER bracket_match_id;'
) INTO @sql_team_bale;
PREPARE stmt_team_bale FROM @sql_team_bale;
EXECUTE stmt_team_bale;
DEALLOCATE PREPARE stmt_team_bale;

-- =====================================================
-- 9. Add line_number to team_matches
-- =====================================================
SELECT IF(
    EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = @schema
          AND table_name = 'team_matches'
          AND column_name = 'line_number'
    ),
    'SELECT 1',
    'ALTER TABLE team_matches
        ADD COLUMN line_number TINYINT NULL DEFAULT NULL
            COMMENT \'Line number: 1 (targets A,B) or 2 (targets C,D)\'
            AFTER bale_number;'
) INTO @sql_team_line;
PREPARE stmt_team_line FROM @sql_team_line;
EXECUTE stmt_team_line;
DEALLOCATE PREPARE stmt_team_line;

-- =====================================================
-- 10. Add wave to team_matches
-- =====================================================
SELECT IF(
    EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = @schema
          AND table_name = 'team_matches'
          AND column_name = 'wave'
    ),
    'SELECT 1',
    'ALTER TABLE team_matches
        ADD COLUMN wave VARCHAR(1) NULL DEFAULT NULL
            COMMENT \'Wave identifier: A or B (NULL if single wave)\'
            AFTER line_number;'
) INTO @sql_team_wave;
PREPARE stmt_team_wave FROM @sql_team_wave;
EXECUTE stmt_team_wave;
DEALLOCATE PREPARE stmt_team_wave;

-- =====================================================
-- 11. Add target_assignment to team_match_teams
-- =====================================================
SELECT IF(
    EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = @schema
          AND table_name = 'team_match_teams'
          AND column_name = 'target_assignment'
    ),
    'SELECT 1',
    'ALTER TABLE team_match_teams
        ADD COLUMN target_assignment VARCHAR(1) NULL DEFAULT NULL
            COMMENT \'Target letter: A, B, C, or D\'
            AFTER position;'
) INTO @sql_team_target;
PREPARE stmt_team_target FROM @sql_team_target;
EXECUTE stmt_team_target;
DEALLOCATE PREPARE stmt_team_target;

-- =====================================================
-- 12. Add indexes for bale queries
-- =====================================================
SELECT IF(
    EXISTS (
        SELECT 1 FROM information_schema.statistics
        WHERE table_schema = @schema
          AND table_name = 'solo_matches'
          AND index_name = 'idx_solo_matches_bale'
    ),
    'SELECT 1',
    'ALTER TABLE solo_matches
        ADD INDEX idx_solo_matches_bale (bale_number);'
) INTO @sql_idx_solo_bale;
PREPARE stmt_idx_solo_bale FROM @sql_idx_solo_bale;
EXECUTE stmt_idx_solo_bale;
DEALLOCATE PREPARE stmt_idx_solo_bale;

SELECT IF(
    EXISTS (
        SELECT 1 FROM information_schema.statistics
        WHERE table_schema = @schema
          AND table_name = 'team_matches'
          AND index_name = 'idx_team_matches_bale'
    ),
    'SELECT 1',
    'ALTER TABLE team_matches
        ADD INDEX idx_team_matches_bale (bale_number);'
) INTO @sql_idx_team_bale;
PREPARE stmt_idx_team_bale FROM @sql_idx_team_bale;
EXECUTE stmt_idx_team_bale;
DEALLOCATE PREPARE stmt_idx_team_bale;

-- =====================================================
-- Migration Complete
-- =====================================================
SELECT 'Games event bale assignment migration complete' AS status;

-- =====================================================
-- Verification Queries (run manually to confirm)
-- =====================================================

-- Check events table new columns
-- SELECT COLUMN_NAME, COLUMN_TYPE, COLUMN_DEFAULT, COLUMN_COMMENT
-- FROM information_schema.columns
-- WHERE table_schema = DATABASE()
--   AND table_name = 'events'
--   AND column_name IN ('event_format', 'total_bales', 'targets_per_bale');

-- Check solo_matches new columns
-- SELECT COLUMN_NAME, COLUMN_TYPE, COLUMN_DEFAULT, COLUMN_COMMENT
-- FROM information_schema.columns
-- WHERE table_schema = DATABASE()
--   AND table_name = 'solo_matches'
--   AND column_name IN ('bale_number', 'line_number', 'wave');

-- Check solo_match_archers new column
-- SELECT COLUMN_NAME, COLUMN_TYPE, COLUMN_DEFAULT, COLUMN_COMMENT
-- FROM information_schema.columns
-- WHERE table_schema = DATABASE()
--   AND table_name = 'solo_match_archers'
--   AND column_name = 'target_assignment';

-- Check team_matches new columns
-- SELECT COLUMN_NAME, COLUMN_TYPE, COLUMN_DEFAULT, COLUMN_COMMENT
-- FROM information_schema.columns
-- WHERE table_schema = DATABASE()
--   AND table_name = 'team_matches'
--   AND column_name IN ('bale_number', 'line_number', 'wave');

-- Check team_match_teams new column
-- SELECT COLUMN_NAME, COLUMN_TYPE, COLUMN_DEFAULT, COLUMN_COMMENT
-- FROM information_schema.columns
-- WHERE table_schema = DATABASE()
--   AND table_name = 'team_match_teams'
--   AND column_name = 'target_assignment';

-- Verify existing data is unaffected (all new fields should be NULL)
-- SELECT COUNT(*) as total, COUNT(bale_number) as with_bale FROM solo_matches;
-- SELECT COUNT(*) as total, COUNT(bale_number) as with_bale FROM team_matches;
