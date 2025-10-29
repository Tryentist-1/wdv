-- =====================================================
-- OAS Ranking Online 3.0 - Phase 0 Migration
-- =====================================================
-- Description: Backend foundation improvements
-- - Support for "Mixed Open" default division
-- - Optimize bale group queries
-- - Cookie-based archer identification
-- - NO NEW TABLES (use existing schema)
-- Date: October 28, 2025
-- =====================================================

-- =====================================================
-- Step 1: Ensure division column supports "Mixed Open"
-- =====================================================

-- Expand division column to support longer division names
-- Existing: BVAR, GVAR, BJV, GJV
-- New: "Mixed Open" (default for practice rounds)
ALTER TABLE rounds 
  MODIFY COLUMN division VARCHAR(50) NULL;

-- =====================================================
-- Step 2: Add indexes for performance
-- =====================================================

-- Index for bale group queries
-- Speeds up: SELECT * FROM round_archers WHERE round_id=? AND bale_number=?
CREATE INDEX IF NOT EXISTS idx_round_bale 
  ON round_archers(round_id, bale_number);

-- Index for archer cookie lookups
-- Speeds up: SELECT * FROM archers WHERE ext_id=?
-- (ext_id stores the cookie value: oas_archer_id)
CREATE INDEX IF NOT EXISTS idx_archer_cookie
  ON archers(ext_id);

-- Index for faster end event queries
-- Speeds up scorecard retrieval
CREATE INDEX IF NOT EXISTS idx_end_round_archer
  ON end_events(round_archer_id, end_number);

-- =====================================================
-- Step 3: Optional constraints (commented out)
-- =====================================================

-- Prevent duplicate archer on same bale (if desired)
-- COMMENTED OUT: May want same archer on multiple bales for practice
-- ALTER TABLE round_archers 
--   ADD UNIQUE KEY unique_archer_bale (round_id, archer_id, bale_number);

-- =====================================================
-- Step 4: Verify schema integrity
-- =====================================================

-- Verify foreign keys are in place
-- (These should already exist from v2.0, but verify)

-- Events → Rounds
SELECT 
  CONSTRAINT_NAME, 
  TABLE_NAME, 
  COLUMN_NAME, 
  REFERENCED_TABLE_NAME, 
  REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'rounds'
  AND REFERENCED_TABLE_NAME = 'events';

-- Rounds → Round_Archers
SELECT 
  CONSTRAINT_NAME, 
  TABLE_NAME, 
  COLUMN_NAME, 
  REFERENCED_TABLE_NAME, 
  REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'round_archers'
  AND REFERENCED_TABLE_NAME = 'rounds';

-- Archers → Round_Archers
SELECT 
  CONSTRAINT_NAME, 
  TABLE_NAME, 
  COLUMN_NAME, 
  REFERENCED_TABLE_NAME, 
  REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'round_archers'
  AND REFERENCED_TABLE_NAME = 'archers';

-- Round_Archers → End_Events
SELECT 
  CONSTRAINT_NAME, 
  TABLE_NAME, 
  COLUMN_NAME, 
  REFERENCED_TABLE_NAME, 
  REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'end_events'
  AND REFERENCED_TABLE_NAME = 'round_archers';

-- =====================================================
-- Step 5: Summary
-- =====================================================

-- Changes Made:
-- ✅ Division column expanded to VARCHAR(50)
-- ✅ Added index: idx_round_bale (round_archers)
-- ✅ Added index: idx_archer_cookie (archers)
-- ✅ Added index: idx_end_round_archer (end_events)
-- ✅ Verified foreign key constraints

-- No New Tables Created
-- No Data Migration Required
-- Backwards Compatible with v2.0

-- =====================================================
-- Testing Queries
-- =====================================================

-- Test 1: Get all archers on Bale 3 for a round (should be fast)
-- SELECT ra.*, a.first_name, a.last_name
-- FROM round_archers ra
-- JOIN archers a ON a.id = ra.archer_id
-- WHERE ra.round_id = 'uuid-of-round'
--   AND ra.bale_number = 3
-- ORDER BY ra.target_assignment;

-- Test 2: Find archer by cookie (should be fast)
-- SELECT * FROM archers WHERE ext_id = 'cookie-uuid';

-- Test 3: Get all ends for an archer's scorecard (should be fast)
-- SELECT * 
-- FROM end_events 
-- WHERE round_archer_id = 'uuid-of-round-archer'
-- ORDER BY end_number;

-- =====================================================
-- Rollback (if needed)
-- =====================================================

-- To rollback this migration:
-- DROP INDEX IF EXISTS idx_round_bale ON round_archers;
-- DROP INDEX IF EXISTS idx_archer_cookie ON archers;
-- DROP INDEX IF EXISTS idx_end_round_archer ON end_events;
-- ALTER TABLE rounds MODIFY COLUMN division VARCHAR(10) NULL;

-- =====================================================
-- End of Migration
-- =====================================================

