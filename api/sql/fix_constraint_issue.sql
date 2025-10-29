-- =====================================================
-- Fix: Remove problematic unique constraint
-- =====================================================
-- The uq_ra_bale_target constraint is too strict
-- It prevents the API upsert logic from working correctly
-- =====================================================

-- Step 1: Check if constraint exists
SELECT CONSTRAINT_NAME, CONSTRAINT_TYPE, TABLE_NAME
FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'round_archers'
  AND CONSTRAINT_NAME LIKE '%bale%';

-- Step 2: Drop the problematic constraint
-- This allows the same (round_id, bale_number, target_assignment) 
-- with different archers
ALTER TABLE round_archers DROP INDEX IF EXISTS uq_ra_bale_target;

-- Step 3: Verify it's gone
SELECT CONSTRAINT_NAME, CONSTRAINT_TYPE, TABLE_NAME
FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'round_archers';

-- Step 4: Show existing indexes (should be OK now)
SHOW INDEXES FROM round_archers;

-- Note: The API's upsert logic will handle duplicates by checking:
-- 1. round_id + archer_id + bale_number (from Phase 0)
-- 2. round_id + archer_name (fallback for orphans)
-- This is more flexible than a database constraint

