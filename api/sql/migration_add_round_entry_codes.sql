-- =====================================================
-- Migration: Add entry_code to rounds table
-- Date: 2025-12-01
-- Purpose: Enable standalone ranking rounds with entry codes
-- Phase: Ranking Round Event/Division Refactor
-- =====================================================

-- =====================================================
-- Step 1: Add entry_code column to rounds table
-- =====================================================
ALTER TABLE rounds 
ADD COLUMN IF NOT EXISTS entry_code VARCHAR(25) NULL 
COMMENT 'Entry code for standalone rounds (e.g., R300-60CM-1201-A2D)';

-- =====================================================
-- Step 2: Add unique index for entry_code lookups
-- =====================================================
ALTER TABLE rounds
ADD UNIQUE INDEX IF NOT EXISTS idx_rounds_entry_code (entry_code);

-- =====================================================
-- Step 3: Verify schema
-- =====================================================
SHOW COLUMNS FROM rounds;

-- Expected columns should include:
-- - id (CHAR(36) PRIMARY KEY)
-- - event_id (CHAR(36) NULL) -- Can be NULL for standalone rounds
-- - round_type (VARCHAR(20))
-- - division (VARCHAR(50))
-- - gender (VARCHAR(1))
-- - level (VARCHAR(3))
-- - date (DATE)
-- - status (VARCHAR(20))
-- - created_at (TIMESTAMP)
-- - entry_code (VARCHAR(25) NULL) -- NEW: For standalone rounds

-- =====================================================
-- NOTES:
-- =====================================================
-- 1. entry_code is NULL for event-linked rounds (use event entry_code)
-- 2. entry_code is set for standalone rounds (format: R300-60CM-1201-A2D)
-- 3. Format: R300-[TARGET_SIZE]-[MMDD]-[RANDOM]
--    - TARGET_SIZE: 40CM (VAR) or 60CM (JV)
--    - MMDD: Month and day (e.g., 1201 for Dec 1)
--    - RANDOM: 3-char alphanumeric suffix for uniqueness
-- 4. Unique constraint prevents duplicate entry codes
-- 5. Standalone rounds have event_id = NULL and entry_code set
-- 6. Event-linked rounds have event_id set and entry_code = NULL

-- =====================================================
-- ROLLBACK (if needed):
-- =====================================================
-- ALTER TABLE rounds DROP INDEX idx_rounds_entry_code;
-- ALTER TABLE rounds DROP COLUMN entry_code;

