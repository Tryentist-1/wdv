-- Cleanup Script: Delete Orphaned Rounds and End Events
-- Purpose: Clean up data where parent Events have been deleted without proper cascade
-- Date: 2025-11-04
-- Safe to run multiple times (idempotent)

-- ==================================================================
-- STEP 1: Preview orphaned data before deletion
-- ==================================================================

-- Show orphaned rounds (event_id points to non-existent event)
SELECT 
    'Orphaned Rounds' AS issue_type,
    COUNT(*) AS count_affected,
    GROUP_CONCAT(DISTINCT DATE(r.date) ORDER BY r.date SEPARATOR ', ') AS affected_dates
FROM rounds r
WHERE r.event_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM events e WHERE e.id = r.event_id);

-- Show affected scorecards (round_archers) that will be cascade deleted
SELECT 
    'Affected Scorecards (via orphaned rounds)' AS issue_type,
    COUNT(*) AS count_affected,
    SUM(ra.completed) AS completed_scorecards,
    SUM(CASE WHEN ra.completed = 0 THEN 1 ELSE 0 END) AS incomplete_scorecards
FROM round_archers ra
INNER JOIN rounds r ON ra.round_id = r.id
WHERE r.event_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM events e WHERE e.id = r.event_id);

-- Show affected end_events that will be cascade deleted
SELECT 
    'Affected End Events (via orphaned rounds)' AS issue_type,
    COUNT(*) AS count_affected,
    MIN(ee.server_ts) AS oldest_event,
    MAX(ee.server_ts) AS newest_event
FROM end_events ee
INNER JOIN rounds r ON ee.round_id = r.id
WHERE r.event_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM events e WHERE e.id = r.event_id);

-- Show orphaned end_events where round_archer was deleted without cascade
SELECT 
    'Orphaned End Events (missing round_archer)' AS issue_type,
    COUNT(*) AS count_affected,
    MIN(ee.server_ts) AS oldest_event,
    MAX(ee.server_ts) AS newest_event
FROM end_events ee
WHERE NOT EXISTS (SELECT 1 FROM round_archers ra WHERE ra.id = ee.round_archer_id);

-- Show orphaned end_events where round was deleted without cascade
SELECT 
    'Orphaned End Events (missing round)' AS issue_type,
    COUNT(*) AS count_affected,
    MIN(ee.server_ts) AS oldest_event,
    MAX(ee.server_ts) AS newest_event
FROM end_events ee
WHERE NOT EXISTS (SELECT 1 FROM rounds r WHERE r.id = ee.round_id);

-- ==================================================================
-- STEP 2: Delete orphaned end_events (where FK constraints failed)
-- ==================================================================

-- Delete end_events where round_archer_id doesn't exist
DELETE FROM end_events
WHERE NOT EXISTS (
    SELECT 1 FROM round_archers ra WHERE ra.id = end_events.round_archer_id
);

-- Delete end_events where round_id doesn't exist
DELETE FROM end_events
WHERE NOT EXISTS (
    SELECT 1 FROM rounds r WHERE r.id = end_events.round_id
);

-- ==================================================================
-- STEP 3: Delete orphaned round_archers (where FK constraints failed)
-- ==================================================================

-- Delete round_archers where round_id doesn't exist
DELETE FROM round_archers
WHERE NOT EXISTS (
    SELECT 1 FROM rounds r WHERE r.id = round_archers.round_id
);

-- ==================================================================
-- STEP 4: Delete orphaned rounds (event_id points to deleted events)
-- ==================================================================

-- Delete rounds where event_id points to non-existent event
-- This will CASCADE delete related round_archers and end_events if FK constraints are working
DELETE FROM rounds
WHERE event_id IS NOT NULL 
  AND NOT EXISTS (
    SELECT 1 FROM events e WHERE e.id = rounds.event_id
);

-- ==================================================================
-- STEP 5: Verify cleanup (all should return 0)
-- ==================================================================

SELECT 'Orphaned Rounds Check' AS verification,
    COUNT(*) AS remaining_orphans
FROM rounds r
WHERE r.event_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM events e WHERE e.id = r.event_id)
UNION ALL
SELECT 'Orphaned End Events (missing round_archer)' AS verification,
    COUNT(*) AS remaining_orphans
FROM end_events ee
WHERE NOT EXISTS (SELECT 1 FROM round_archers ra WHERE ra.id = ee.round_archer_id)
UNION ALL
SELECT 'Orphaned End Events (missing round)' AS verification,
    COUNT(*) AS remaining_orphans
FROM end_events ee
WHERE NOT EXISTS (SELECT 1 FROM rounds r WHERE r.id = ee.round_id)
UNION ALL
SELECT 'Orphaned Round Archers (missing round)' AS verification,
    COUNT(*) AS remaining_orphans
FROM round_archers ra
WHERE NOT EXISTS (SELECT 1 FROM rounds r WHERE r.id = ra.round_id);

-- ==================================================================
-- NOTES:
-- ==================================================================
-- 1. This script handles orphaned data that may exist due to:
--    - Events deleted in UI without proper cleanup
--    - Failed foreign key cascade operations
--    - Manual database operations
--
-- 2. Deletion order is important:
--    - First: orphaned end_events (leaf nodes)
--    - Second: orphaned round_archers (middle nodes)
--    - Third: orphaned rounds (will cascade to any remaining children)
--
-- 3. The script is safe to run multiple times
--
-- 4. To prevent future orphans, consider adding a foreign key constraint:
--    ALTER TABLE rounds 
--    ADD CONSTRAINT fk_rounds_event 
--    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL;

