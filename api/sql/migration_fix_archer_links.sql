-- Migration: Fix archer_id links in round_archers
-- Purpose: Populate the archers master table from existing round_archers data
--          and link round_archers to archers via archer_id FK
-- Date: 2025-10-28
-- Run this ONCE after deploying the fixed API code

-- Step 1: Create master archer records from unique round_archers entries
-- This creates one archer per unique combination of first/last name + school
INSERT IGNORE INTO archers (id, first_name, last_name, school, level, gender, created_at)
SELECT 
    UUID() AS id,
    SUBSTRING_INDEX(archer_name, ' ', 1) AS first_name,
    TRIM(SUBSTRING(archer_name, LENGTH(SUBSTRING_INDEX(archer_name, ' ', 1)) + 2)) AS last_name,
    school,
    level,
    gender,
    MIN(created_at) AS created_at
FROM round_archers
WHERE archer_id IS NULL
  AND archer_name IS NOT NULL
  AND archer_name != ''
GROUP BY 
    SUBSTRING_INDEX(archer_name, ' ', 1),
    TRIM(SUBSTRING(archer_name, LENGTH(SUBSTRING_INDEX(archer_name, ' ', 1)) + 2)),
    school,
    level,
    gender;

-- Step 2: Link existing round_archers to newly created archers
-- Match by first_name, last_name, and school
UPDATE round_archers ra
JOIN archers a ON 
    SUBSTRING_INDEX(ra.archer_name, ' ', 1) = a.first_name
    AND TRIM(SUBSTRING(ra.archer_name, LENGTH(SUBSTRING_INDEX(ra.archer_name, ' ', 1)) + 2)) = a.last_name
    AND ra.school = a.school
SET ra.archer_id = a.id
WHERE ra.archer_id IS NULL
  AND ra.archer_name IS NOT NULL
  AND ra.archer_name != '';

-- Step 3: Verify the migration
-- This should return 0 if all round_archers are now linked
SELECT COUNT(*) AS orphaned_scorecards
FROM round_archers
WHERE archer_id IS NULL
  AND archer_name IS NOT NULL
  AND archer_name != '';

-- Step 4: Show summary
SELECT 
    (SELECT COUNT(*) FROM archers) AS total_archers,
    (SELECT COUNT(*) FROM round_archers WHERE archer_id IS NOT NULL) AS linked_scorecards,
    (SELECT COUNT(*) FROM round_archers WHERE archer_id IS NULL) AS orphaned_scorecards;

