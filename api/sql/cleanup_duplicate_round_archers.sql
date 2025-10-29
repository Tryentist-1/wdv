-- Cleanup Script: Remove duplicate round_archers entries
-- Purpose: Fix entries where the same archer appears multiple times in the same round
--          (one with NULL bale/target, one with actual assignments)
-- Date: 2025-10-28
-- Run this AFTER deploying the fixed API

-- Step 1: Show duplicates before cleanup
SELECT 
    ra.archer_id,
    ra.archer_name,
    ra.round_id,
    COUNT(*) as duplicate_count,
    GROUP_CONCAT(ra.id SEPARATOR ', ') as scorecard_ids,
    GROUP_CONCAT(CONCAT('Bale:', IFNULL(ra.bale_number, 'NULL'), ' Target:', IFNULL(ra.target_assignment, 'NULL')) SEPARATOR ' | ') as assignments
FROM round_archers ra
WHERE ra.archer_id IS NOT NULL
GROUP BY ra.archer_id, ra.round_id, ra.archer_name
HAVING COUNT(*) > 1
ORDER BY ra.archer_name;

-- Step 2: Delete entries with NULL bale/target (keep the ones with actual assignments)
-- This will delete the "placeholder" entries created by coach console
DELETE FROM round_archers 
WHERE archer_id IS NOT NULL 
  AND (target_assignment IS NULL OR bale_number IS NULL)
  AND archer_id IN (
    -- Only delete if there's another entry for the same archer with actual assignments
    SELECT DISTINCT ra2.archer_id 
    FROM (SELECT * FROM round_archers) ra2
    WHERE ra2.target_assignment IS NOT NULL 
      AND ra2.bale_number IS NOT NULL
      AND ra2.archer_id = round_archers.archer_id
      AND ra2.round_id = round_archers.round_id
  );

-- Step 3: Verify no more duplicates
SELECT 
    ra.archer_id,
    ra.archer_name,
    ra.round_id,
    COUNT(*) as entry_count
FROM round_archers ra
WHERE ra.archer_id IS NOT NULL
GROUP BY ra.archer_id, ra.round_id
HAVING COUNT(*) > 1;

-- Should return no rows if cleanup successful

-- Step 4: Show summary
SELECT 
    'Total round_archers' AS metric,
    COUNT(*) AS count
FROM round_archers
UNION ALL
SELECT 
    'With NULL bale/target' AS metric,
    COUNT(*) AS count
FROM round_archers
WHERE target_assignment IS NULL OR bale_number IS NULL
UNION ALL
SELECT 
    'With valid assignments' AS metric,
    COUNT(*) AS count
FROM round_archers
WHERE target_assignment IS NOT NULL AND bale_number IS NOT NULL;

