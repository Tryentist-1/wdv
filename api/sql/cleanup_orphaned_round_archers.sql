-- =====================================================
-- Cleanup Script: Orphaned round_archers Entries
-- Purpose: Fix dirty data issues in dev database
-- Date: 2025-01-21
-- =====================================================

-- =====================================================
-- Issue 1: Find round_archers with NULL archer_id
-- These are "test" or orphaned entries that shouldn't exist
-- =====================================================

-- View orphaned entries
SELECT 
    ra.id as round_archer_id,
    ra.round_id,
    ra.archer_id,
    ra.archer_name,
    r.event_id,
    r.division,
    r.round_type,
    r.date as round_date,
    ra.bale_number,
    ra.target_assignment,
    ra.created_at
FROM round_archers ra
JOIN rounds r ON r.id = ra.round_id
WHERE ra.archer_id IS NULL
ORDER BY ra.created_at DESC;

-- Count orphaned entries
SELECT COUNT(*) as orphaned_count
FROM round_archers
WHERE archer_id IS NULL;

-- =====================================================
-- Issue 2: Find standalone rounds with entries for multiple archers
-- Standalone rounds should only show for the archer who created them
-- =====================================================

-- View standalone rounds with multiple archer assignments
SELECT 
    r.id as round_id,
    r.event_id,
    r.division,
    r.round_type,
    r.date,
    COUNT(DISTINCT ra.archer_id) as archer_count,
    GROUP_CONCAT(DISTINCT ra.archer_id) as archer_ids,
    GROUP_CONCAT(DISTINCT ra.archer_name) as archer_names
FROM rounds r
JOIN round_archers ra ON ra.round_id = r.id
WHERE r.event_id IS NULL  -- Standalone rounds
  AND ra.archer_id IS NOT NULL
GROUP BY r.id, r.event_id, r.division, r.round_type, r.date
HAVING archer_count > 1
ORDER BY r.date DESC;

-- =====================================================
-- Issue 3: Find rounds with duplicate archer assignments
-- Same archer assigned multiple times to the same round
-- =====================================================

SELECT 
    ra.round_id,
    ra.archer_id,
    COUNT(*) as duplicate_count,
    GROUP_CONCAT(ra.id) as round_archer_ids,
    GROUP_CONCAT(ra.bale_number) as bale_numbers
FROM round_archers ra
WHERE ra.archer_id IS NOT NULL
GROUP BY ra.round_id, ra.archer_id
HAVING duplicate_count > 1
ORDER BY duplicate_count DESC;

-- =====================================================
-- CLEANUP OPERATIONS (Run with caution!)
-- =====================================================

-- Option 1: Delete orphaned entries (NULL archer_id)
-- WARNING: This will delete "test" entries. Make sure you want to do this!
/*
DELETE ra FROM round_archers ra
WHERE ra.archer_id IS NULL
  AND ra.created_at < DATE_SUB(NOW(), INTERVAL 1 DAY);  -- Only delete entries older than 1 day
*/

-- Option 2: Delete duplicate archer assignments (keep the one with bale/target)
-- WARNING: This will delete duplicate entries. Review the SELECT query above first!
/*
DELETE ra1 FROM round_archers ra1
INNER JOIN round_archers ra2 
WHERE ra1.round_id = ra2.round_id
  AND ra1.archer_id = ra2.archer_id
  AND ra1.archer_id IS NOT NULL
  AND ra1.id < ra2.id  -- Keep the first one (or use a different criteria)
  AND (ra1.bale_number IS NULL OR ra1.target_assignment IS NULL)  -- Prefer entries with bale/target
  AND (ra2.bale_number IS NOT NULL AND ra2.target_assignment IS NOT NULL);
*/

-- Option 3: Fix standalone rounds - remove archers who didn't create the round
-- This assumes the first archer (by created_at) is the creator
-- WARNING: Review the SELECT query above first to see what will be deleted!
/*
DELETE ra FROM round_archers ra
INNER JOIN (
    SELECT 
        r.id as round_id,
        MIN(ra2.created_at) as first_created,
        MIN(ra2.archer_id) as creator_archer_id
    FROM rounds r
    JOIN round_archers ra2 ON ra2.round_id = r.id
    WHERE r.event_id IS NULL  -- Standalone rounds
      AND ra2.archer_id IS NOT NULL
    GROUP BY r.id
) creator ON creator.round_id = ra.round_id
WHERE ra.round_id IN (
    SELECT id FROM rounds WHERE event_id IS NULL
)
AND ra.archer_id != creator.creator_archer_id;
*/

-- =====================================================
-- VERIFICATION QUERIES (Run after cleanup)
-- =====================================================

-- Verify no orphaned entries remain
SELECT COUNT(*) as remaining_orphaned
FROM round_archers
WHERE archer_id IS NULL;

-- Verify standalone rounds only have one archer
SELECT 
    r.id as round_id,
    COUNT(DISTINCT ra.archer_id) as archer_count
FROM rounds r
JOIN round_archers ra ON ra.round_id = r.id
WHERE r.event_id IS NULL
  AND ra.archer_id IS NOT NULL
GROUP BY r.id
HAVING archer_count > 1;

-- Verify no duplicate archer assignments
SELECT 
    ra.round_id,
    ra.archer_id,
    COUNT(*) as duplicate_count
FROM round_archers ra
WHERE ra.archer_id IS NOT NULL
GROUP BY ra.round_id, ra.archer_id
HAVING duplicate_count > 1;

