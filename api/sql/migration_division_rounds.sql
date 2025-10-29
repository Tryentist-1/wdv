-- =====================================================
-- Migration: Division Rounds (Remove bale_number from rounds)
-- Date: 2025-10-29
-- Phase: OAS Ranking Online 3.0 - Phase 0
-- =====================================================

-- IMPORTANT: This is a DESTRUCTIVE migration
-- Run this ONLY on a clean database or when ready to start fresh
-- Existing rounds data will need consolidation

-- =====================================================
-- Step 1: Backup existing rounds table
-- =====================================================
CREATE TABLE IF NOT EXISTS rounds_backup_20251029 AS SELECT * FROM rounds;

-- =====================================================
-- Step 2: Clean up - Start fresh (no data migration)
-- =====================================================
-- Delete all existing data (as per user request)
DELETE FROM end_events;
DELETE FROM round_archers;
DELETE FROM rounds;

-- =====================================================
-- Step 3: Drop bale_number column from rounds
-- =====================================================
ALTER TABLE rounds DROP COLUMN IF EXISTS bale_number;

-- =====================================================
-- Step 4: Ensure division column can handle "OPEN"
-- =====================================================
ALTER TABLE rounds MODIFY COLUMN division VARCHAR(50);

-- =====================================================
-- Step 5: Add unique constraint (one round per division per event)
-- =====================================================
-- Drop existing constraint if it exists
ALTER TABLE rounds DROP INDEX IF EXISTS uq_event_division;

-- Add new constraint
ALTER TABLE rounds ADD UNIQUE KEY uq_event_division (event_id, division);

-- =====================================================
-- Step 6: Verify schema
-- =====================================================
SHOW COLUMNS FROM rounds;

-- Expected columns:
-- - id (CHAR(36) PRIMARY KEY)
-- - event_id (CHAR(36))
-- - division (VARCHAR(50)) -- Can be "OPEN", "BVAR", "GVAR", "BJV", "GJV"
-- - round_type (VARCHAR(10))
-- - date (DATE)
-- - status (VARCHAR(20))
-- - created_at (TIMESTAMP)
-- - NO bale_number! (removed)

-- =====================================================
-- Step 7: Verify round_archers still has bale_number
-- =====================================================
SHOW COLUMNS FROM round_archers;

-- Expected columns should include:
-- - bale_number (INT) -- This stays! Bale assignment per archer
-- - target_assignment (VARCHAR(5))

-- =====================================================
-- NOTES:
-- =====================================================
-- 1. rounds table now has ONE row per division per event
-- 2. bale_number moved exclusively to round_archers
-- 3. Bale numbers are GLOBAL across event (1, 2, 3, 4...)
-- 4. Division "OPEN" is default for mixed-level practices
-- 5. Unique constraint prevents duplicate division rounds

-- =====================================================
-- ROLLBACK (if needed):
-- =====================================================
-- DROP TABLE rounds;
-- CREATE TABLE rounds AS SELECT * FROM rounds_backup_20251029;
-- ALTER TABLE rounds DROP INDEX uq_event_division;

