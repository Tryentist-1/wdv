-- Migration: Add assignment field to archers table
-- Date: February 6, 2026
-- Purpose: Support team position assignments for Solo and Team bracket workflows

SET @schema := DATABASE();

-- =====================================================
-- 1. Add assignment column to archers table
-- =====================================================
SELECT IF(
    EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = @schema
          AND table_name = 'archers'
          AND column_name = 'assignment'
    ),
    'SELECT 1',
    'ALTER TABLE archers
        ADD COLUMN assignment ENUM(\'S1\',\'S2\',\'S3\',\'S4\',\'S5\',\'S6\',\'S7\',\'S8\',\'T1\',\'T2\',\'T3\',\'T4\',\'T5\',\'T6\',\'\') 
            NULL DEFAULT \'\'
            COMMENT \'Position assignment: S1-S8 for solo brackets, T1-T6 for team brackets\'
            AFTER level;'
) INTO @sql_assignment;
PREPARE stmt_assignment FROM @sql_assignment;
EXECUTE stmt_assignment;
DEALLOCATE PREPARE stmt_assignment;

-- =====================================================
-- 2. Add index for filtering by assignment
-- =====================================================
SELECT IF(
    EXISTS (
        SELECT 1 FROM information_schema.statistics
        WHERE table_schema = @schema
          AND table_name = 'archers'
          AND index_name = 'idx_archers_assignment'
    ),
    'SELECT 1',
    'ALTER TABLE archers
        ADD INDEX idx_archers_assignment (assignment);'
) INTO @sql_idx_assignment;
PREPARE stmt_idx_assignment FROM @sql_idx_assignment;
EXECUTE stmt_idx_assignment;
DEALLOCATE PREPARE stmt_idx_assignment;

-- =====================================================
-- Migration Complete
-- =====================================================
SELECT 'Assignment field migration complete' AS status;

-- =====================================================
-- Verification Queries
-- =====================================================
-- Run these to verify the migration:

-- Check column exists and structure
-- SELECT COLUMN_NAME, COLUMN_TYPE, COLUMN_DEFAULT, COLUMN_COMMENT 
-- FROM information_schema.columns 
-- WHERE table_schema = DATABASE() 
--   AND table_name = 'archers' 
--   AND column_name = 'assignment';

-- View sample data
-- SELECT id, first_name, last_name, gender, level, assignment, status 
-- FROM archers 
-- LIMIT 10;

-- Count archers by assignment
-- SELECT assignment, COUNT(*) as count 
-- FROM archers 
-- GROUP BY assignment 
-- ORDER BY assignment;
