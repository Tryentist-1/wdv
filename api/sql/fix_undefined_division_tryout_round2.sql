-- Migration Script: Fix "Undefined" Division in Tryout Round 2
-- 
-- Problem: 18 archers ended up in a round with NULL division instead of OPEN
-- Solution: Move archers and their scores to the correct OPEN division round
--
-- ⚠️  SAFETY: This script is read-only by default. Review the SELECT statements first.
-- Uncomment the UPDATE/DELETE statements only after verifying the data is correct.
--
-- Event: Tryout Round 2 (87b0fdc6-8b0a-484b-9e15-cf58e2533e4d)
-- Undefined Round ID: 9319e5c5-1afb-4856-bb8c-b613105bfec0
-- Correct OPEN Round ID: fa473a27-989d-4f6a-ba6f-92ef36642364

-- ============================================================
-- STEP 1: VERIFY THE DATA (Read-only - safe to run)
-- ============================================================

-- Check the undefined round
SELECT 
    'UNDEFINED ROUND' as section,
    r.id as round_id,
    r.division,
    r.event_id,
    e.name as event_name,
    COUNT(DISTINCT ra.id) as archer_count,
    COUNT(DISTINCT ee.id) as score_count
FROM rounds r
JOIN events e ON e.id = r.event_id
LEFT JOIN round_archers ra ON ra.round_id = r.id
LEFT JOIN end_events ee ON ee.round_id = r.id
WHERE r.id = '9319e5c5-1afb-4856-bb8c-b613105bfec0'
GROUP BY r.id, r.division, r.event_id, e.name;

-- Check the correct OPEN round
SELECT 
    'OPEN ROUND' as section,
    r.id as round_id,
    r.division,
    r.event_id,
    e.name as event_name,
    COUNT(DISTINCT ra.id) as archer_count,
    COUNT(DISTINCT ee.id) as score_count
FROM rounds r
JOIN events e ON e.id = r.event_id
LEFT JOIN round_archers ra ON ra.round_id = r.id
LEFT JOIN end_events ee ON ee.round_id = r.id
WHERE r.id = 'fa473a27-989d-4f6a-ba6f-92ef36642364'
GROUP BY r.id, r.division, r.event_id, e.name;

-- List archers in undefined round
SELECT 
    'ARCHERS TO MOVE' as section,
    ra.id as round_archer_id,
    ra.archer_name,
    ra.school,
    ra.level,
    ra.gender,
    ra.bale_number,
    ra.target_assignment,
    COUNT(DISTINCT ee.id) as ends_scored
FROM round_archers ra
LEFT JOIN end_events ee ON ee.round_archer_id = ra.id
WHERE ra.round_id = '9319e5c5-1afb-4856-bb8c-b613105bfec0'
GROUP BY ra.id, ra.archer_name, ra.school, ra.level, ra.gender, ra.bale_number, ra.target_assignment
ORDER BY ra.bale_number, ra.target_assignment;

-- ============================================================
-- STEP 2: PREVIEW THE CHANGES (Read-only - safe to run)
-- ============================================================

-- Preview: round_archers that will be updated
SELECT 
    'PREVIEW: round_archers updates' as section,
    ra.id as round_archer_id,
    ra.archer_name,
    ra.round_id as current_round_id,
    'fa473a27-989d-4f6a-ba6f-92ef36642364' as new_round_id
FROM round_archers ra
WHERE ra.round_id = '9319e5c5-1afb-4856-bb8c-b613105bfec0';

-- Preview: end_events that will be updated
SELECT 
    'PREVIEW: end_events updates' as section,
    ee.id as end_event_id,
    ee.round_id as current_round_id,
    'fa473a27-989d-4f6a-ba6f-92ef36642364' as new_round_id,
    ee.round_archer_id,
    ee.end_number,
    ee.running_total
FROM end_events ee
WHERE ee.round_id = '9319e5c5-1afb-4856-bb8c-b613105bfec0'
ORDER BY ee.round_archer_id, ee.end_number;

-- ============================================================
-- STEP 3: EXECUTE THE MIGRATION (Uncomment after review)
-- ============================================================

-- Start transaction
-- START TRANSACTION;

-- Step 3a: Update round_archers to point to OPEN round
-- UPDATE round_archers 
-- SET round_id = 'fa473a27-989d-4f6a-ba6f-92ef36642364'
-- WHERE round_id = '9319e5c5-1afb-4856-bb8c-b613105bfec0';

-- Step 3b: Update end_events to point to OPEN round
-- UPDATE end_events 
-- SET round_id = 'fa473a27-989d-4f6a-ba6f-92ef36642364'
-- WHERE round_id = '9319e5c5-1afb-4856-bb8c-b613105bfec0';

-- Step 3c: Delete the empty undefined round
-- DELETE FROM rounds 
-- WHERE id = '9319e5c5-1afb-4856-bb8c-b613105bfec0';

-- Commit transaction
-- COMMIT;

-- ============================================================
-- STEP 4: VERIFY AFTER MIGRATION (Read-only - safe to run)
-- ============================================================

-- Verify OPEN round now has all archers
-- SELECT 
--     'VERIFICATION: OPEN round after migration' as section,
--     r.id as round_id,
--     r.division,
--     COUNT(DISTINCT ra.id) as archer_count,
--     COUNT(DISTINCT ee.id) as score_count
-- FROM rounds r
-- LEFT JOIN round_archers ra ON ra.round_id = r.id
-- LEFT JOIN end_events ee ON ee.round_id = r.id
-- WHERE r.id = 'fa473a27-989d-4f6a-ba6f-92ef36642364'
-- GROUP BY r.id, r.division;

-- Verify undefined round is gone
-- SELECT 
--     'VERIFICATION: Undefined round should be gone' as section,
--     COUNT(*) as round_count
-- FROM rounds 
-- WHERE id = '9319e5c5-1afb-4856-bb8c-b613105bfec0';
-- Should return 0

