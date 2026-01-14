-- Cleanup Script: Delete Orphaned Rounds from Event Deletion Bug
-- Purpose: Remove rounds that were orphaned when events were deleted
-- Date: 2025-01-XX
-- Issue: Event deletion endpoint was unlinking rounds instead of deleting them
-- 
-- WARNING: This will delete ALL rounds with event_id IS NULL
-- Some rounds may be legitimate standalone rounds (created without events)
-- Review the preview query results before running the deletion

-- ==================================================================
-- STEP 1: PREVIEW ORPHANED ROUNDS (RUN THIS FIRST!)
-- ==================================================================

-- Show all orphaned rounds with details
SELECT 
    r.id,
    r.round_type,
    r.division,
    r.status,
    r.created_at,
    COUNT(DISTINCT ra.id) as scorecard_count,
    COUNT(DISTINCT ee.id) as end_count,
    SUM(CASE WHEN ra.id IS NOT NULL THEN 1 ELSE 0 END) as has_scorecards,
    SUM(CASE WHEN ee.id IS NOT NULL THEN 1 ELSE 0 END) as has_ends
FROM rounds r
LEFT JOIN round_archers ra ON ra.round_id = r.id
LEFT JOIN end_events ee ON ee.round_id = r.id
WHERE r.event_id IS NULL
GROUP BY r.id, r.round_type, r.division, r.status, r.created_at
ORDER BY r.created_at DESC;

-- Summary statistics
SELECT 
    COUNT(DISTINCT r.id) as total_orphaned_rounds,
    COUNT(DISTINCT ra.id) as total_orphaned_scorecards,
    COUNT(DISTINCT ee.id) as total_orphaned_ends,
    MIN(r.created_at) as oldest_round,
    MAX(r.created_at) as newest_round
FROM rounds r
LEFT JOIN round_archers ra ON ra.round_id = r.id
LEFT JOIN end_events ee ON ee.round_id = r.id
WHERE r.event_id IS NULL;

-- ==================================================================
-- STEP 2: BACKUP (OPTIONAL - RECOMMENDED)
-- ==================================================================

-- Create backup tables before deletion (uncomment to use)
-- CREATE TABLE rounds_backup_orphaned_202501XX AS 
-- SELECT * FROM rounds WHERE event_id IS NULL;
-- 
-- CREATE TABLE round_archers_backup_orphaned_202501XX AS 
-- SELECT ra.* FROM round_archers ra
-- INNER JOIN rounds r ON r.id = ra.round_id
-- WHERE r.event_id IS NULL;
-- 
-- CREATE TABLE end_events_backup_orphaned_202501XX AS 
-- SELECT ee.* FROM end_events ee
-- INNER JOIN rounds r ON r.id = ee.round_id
-- WHERE r.event_id IS NULL;

-- ==================================================================
-- STEP 3: DELETE ORPHANED DATA
-- ==================================================================
-- 
-- IMPORTANT: Review Step 1 results before running!
-- This will delete ALL rounds with event_id IS NULL
-- CASCADE DELETE will automatically remove related round_archers and end_events
--
-- If you want to be more selective, you can add WHERE conditions:
-- WHERE r.event_id IS NULL AND r.created_at < '2025-01-01'  -- Only old rounds
-- WHERE r.event_id IS NULL AND r.status = 'Not Started'     -- Only unstarted rounds
--

-- Delete orphaned end_events first (scores)
DELETE ee FROM end_events ee
INNER JOIN rounds r ON r.id = ee.round_id
WHERE r.event_id IS NULL;

-- Delete orphaned round_archers second (scorecards)
DELETE ra FROM round_archers ra
INNER JOIN rounds r ON r.id = ra.round_id
WHERE r.event_id IS NULL;

-- Delete orphaned rounds third
DELETE FROM rounds WHERE event_id IS NULL;

-- ==================================================================
-- STEP 4: VERIFY CLEANUP (should all return 0)
-- ==================================================================

SELECT 
    'Orphaned Rounds' AS check_type,
    COUNT(*) AS remaining_count
FROM rounds
WHERE event_id IS NULL

UNION ALL

SELECT 
    'Orphaned Round Archers' AS check_type,
    COUNT(*) AS remaining_count
FROM round_archers ra
WHERE NOT EXISTS (
    SELECT 1 FROM rounds r WHERE r.id = ra.round_id
)

UNION ALL

SELECT 
    'Orphaned End Events' AS check_type,
    COUNT(*) AS remaining_count
FROM end_events ee
WHERE NOT EXISTS (
    SELECT 1 FROM rounds r WHERE r.id = ee.round_id
);

-- ==================================================================
-- STEP 5: RESTORE FROM BACKUP (IF NEEDED)
-- ==================================================================
-- 
-- If you need to restore from backup:
-- 
-- INSERT INTO rounds SELECT * FROM rounds_backup_orphaned_202501XX;
-- INSERT INTO round_archers SELECT * FROM round_archers_backup_orphaned_202501XX;
-- INSERT INTO end_events SELECT * FROM end_events_backup_orphaned_202501XX;
--
