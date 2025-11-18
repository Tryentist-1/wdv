-- Migration: Add lock_history field to solo_matches and team_matches
-- Date: November 17, 2025
-- Purpose: Support audit trail for match verification (lock/unlock/void actions)
-- Mirrors: round_archers.lock_history pattern

SET @schema := DATABASE();

-- Add lock_history to solo_matches
SELECT IF(
    EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = @schema
          AND table_name = 'solo_matches'
          AND column_name = 'lock_history'
    ),
    'SELECT 1',
    'ALTER TABLE solo_matches
        ADD COLUMN lock_history TEXT NULL
            COMMENT \"JSON array of lock/unlock/void events\" AFTER notes;'
) INTO @sql_solo_history;
PREPARE stmt_solo_history FROM @sql_solo_history;
EXECUTE stmt_solo_history;
DEALLOCATE PREPARE stmt_solo_history;

-- Add lock_history to team_matches
SELECT IF(
    EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = @schema
          AND table_name = 'team_matches'
          AND column_name = 'lock_history'
    ),
    'SELECT 1',
    'ALTER TABLE team_matches
        ADD COLUMN lock_history TEXT NULL
            COMMENT \"JSON array of lock/unlock/void events\" AFTER notes;'
) INTO @sql_team_history;
PREPARE stmt_team_history FROM @sql_team_history;
EXECUTE stmt_team_history;
DEALLOCATE PREPARE stmt_team_history;

