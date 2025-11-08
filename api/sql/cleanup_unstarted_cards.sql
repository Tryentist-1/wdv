-- Cleanup Script: Delete Unstarted/Empty Scorecards
-- Purpose: Remove round_archers entries that have no scoring data (0 ends)
-- Date: 2025-11-07
-- Safe to run multiple times (idempotent)
--
-- Use Case: Clean up cards created during round setup but never actually used
-- Example: Becky Yang showing multiple entries with 0 ends and 0 score

-- ==================================================================
-- STEP 1: Preview unstarted cards before deletion
-- ==================================================================

-- Show unstarted cards (no end_events recorded)
SELECT 
    'Unstarted Cards (No Ends)' AS issue_type,
    COUNT(*) AS count_affected,
    COUNT(DISTINCT ra.round_id) AS affected_rounds,
    COUNT(DISTINCT ra.archer_name) AS affected_archers
FROM round_archers ra
LEFT JOIN end_events ee ON ra.id = ee.round_archer_id
WHERE ee.id IS NULL;

-- Show detailed list of unstarted cards
SELECT 
    e.name AS event_name,
    e.date AS event_date,
    r.name AS round_name,
    ra.archer_name,
    ra.school,
    ra.level,
    ra.gender,
    ra.bale_number,
    ra.target_assignment,
    ra.card_status,
    ra.created_at,
    COUNT(ee.id) AS end_count,
    COALESCE(MAX(ee.running_total), 0) AS score
FROM round_archers ra
INNER JOIN rounds r ON ra.round_id = r.id
LEFT JOIN events e ON r.event_id = e.id
LEFT JOIN end_events ee ON ra.id = ee.round_archer_id
GROUP BY ra.id, e.name, e.date, r.name, ra.archer_name, ra.school, ra.level, ra.gender, 
         ra.bale_number, ra.target_assignment, ra.card_status, ra.created_at
HAVING end_count = 0
ORDER BY e.date DESC, ra.archer_name;

-- ==================================================================
-- STEP 2: Preview duplicate cards for same archer in same round
-- ==================================================================

-- Show archers with multiple cards in the same round (potential duplicates)
SELECT 
    e.name AS event_name,
    e.date AS event_date,
    r.name AS round_name,
    ra.archer_name,
    ra.school,
    COUNT(*) AS card_count,
    GROUP_CONCAT(ra.bale_number ORDER BY ra.bale_number SEPARATOR ', ') AS bales,
    GROUP_CONCAT(ra.target_assignment ORDER BY ra.target_assignment SEPARATOR ', ') AS targets,
    GROUP_CONCAT(
        CONCAT(COALESCE((SELECT COUNT(*) FROM end_events ee WHERE ee.round_archer_id = ra.id), 0), ' ends')
        ORDER BY ra.id SEPARATOR ', '
    ) AS end_counts
FROM round_archers ra
INNER JOIN rounds r ON ra.round_id = r.id
LEFT JOIN events e ON r.event_id = e.id
GROUP BY r.id, ra.archer_name, ra.school, e.name, e.date, r.name
HAVING card_count > 1
ORDER BY e.date DESC, ra.archer_name;

-- ==================================================================
-- STEP 3: Delete unstarted cards (CAUTION: This deletes data!)
-- ==================================================================

-- Option A: Delete ALL unstarted cards (no end_events)
-- Uncomment to execute:
/*
DELETE ra FROM round_archers ra
LEFT JOIN end_events ee ON ra.id = ee.round_archer_id
WHERE ee.id IS NULL;
*/

-- Option B: Delete only unstarted cards that are NOT verified/completed
-- (Safer - keeps cards that might have been manually marked as complete)
-- Uncomment to execute:
/*
DELETE ra FROM round_archers ra
LEFT JOIN end_events ee ON ra.id = ee.round_archer_id
WHERE ee.id IS NULL
  AND ra.completed = FALSE
  AND ra.card_status = 'PENDING';
*/

-- Option C: Delete unstarted cards older than a specific date
-- (Safest - only cleans up old data, keeps recent cards that might still be in use)
-- Uncomment and adjust date to execute:
/*
DELETE ra FROM round_archers ra
LEFT JOIN end_events ee ON ra.id = ee.round_archer_id
INNER JOIN rounds r ON ra.round_id = r.id
INNER JOIN events e ON r.event_id = e.id
WHERE ee.id IS NULL
  AND ra.completed = FALSE
  AND ra.card_status = 'PENDING'
  AND e.date < '2025-11-04';  -- Adjust this date as needed
*/

-- ==================================================================
-- STEP 4: Verify cleanup (should return 0 or expected count)
-- ==================================================================

SELECT 'Remaining Unstarted Cards' AS verification,
    COUNT(*) AS remaining_count
FROM round_archers ra
LEFT JOIN end_events ee ON ra.id = ee.round_archer_id
WHERE ee.id IS NULL;

-- ==================================================================
-- NOTES:
-- ==================================================================
-- 1. Unstarted cards are created when:
--    - Round setup assigns archers to bales/targets
--    - Archer never actually starts scoring (no end_events created)
--    - Duplicate assignments during troubleshooting
--
-- 2. These cards appear in archer history with:
--    - Ends: 0
--    - Score: 0
--    - 10s: 0
--    - Xs: 0
--
-- 3. Recommended approach:
--    - Run STEP 1 to preview what will be deleted
--    - Run STEP 2 to identify duplicate cards
--    - Choose Option B or C (safer than Option A)
--    - Run STEP 4 to verify cleanup
--
-- 4. To prevent future issues:
--    - Consider adding a cleanup job that removes unstarted cards older than 7 days
--    - Add UI warning when creating duplicate archer assignments
--    - Implement better round setup validation

