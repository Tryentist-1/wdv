-- Migrate Brandon Garcia's scorecard from TEST EVENT to Tryout Round 1
-- Date: 2025-11-04
-- Reason: Round ID contamination bug caused scores to save to wrong event

-- STEP 1: Verify the data we're working with
-- Brandon Garcia UUID: 632012a7-2645-481c-99cb-fae78be0a72f
-- TEST EVENT round: 6318bd0f-ae5d-46ee-ab9c-9f9d276cc977
-- Tryout Round 1 round: df29ec34-b9ac-4667-be49-86a118e4e73e

-- Check current state
SELECT 'Current Brandon round_archer records:' as status;
SELECT 
    ra.id as round_archer_id,
    ra.round_id,
    r.division,
    e.name as event_name,
    e.date as event_date,
    (SELECT COUNT(*) FROM end_events WHERE round_archer_id = ra.id) as end_count,
    (SELECT MAX(running_total) FROM end_events WHERE round_archer_id = ra.id) as final_score
FROM round_archers ra
JOIN rounds r ON ra.round_id = r.id
LEFT JOIN events e ON r.event_id = e.id
WHERE ra.archer_id = '632012a7-2645-481c-99cb-fae78be0a72f'
ORDER BY e.date DESC;

-- STEP 2: Get the round_archer_ids
SET @test_event_ra_id = (
    SELECT ra.id 
    FROM round_archers ra
    JOIN rounds r ON ra.round_id = r.id
    WHERE ra.archer_id = '632012a7-2645-481c-99cb-fae78be0a72f'
    AND r.round_id = '6318bd0f-ae5d-46ee-ab9c-9f9d276cc977'
    LIMIT 1
);

SET @tryout_round1_ra_id = (
    SELECT ra.id 
    FROM round_archers ra
    JOIN rounds r ON ra.round_id = r.id
    WHERE ra.archer_id = '632012a7-2645-481c-99cb-fae78be0a72f'
    AND r.round_id = 'df29ec34-b9ac-4667-be49-86a118e4e73e'
    LIMIT 1
);

SELECT 'IDs found:' as status;
SELECT @test_event_ra_id as test_event_ra_id, @tryout_round1_ra_id as tryout_round1_ra_id;

-- STEP 3: Move the end_events
-- Update the round_archer_id for all end_events from TEST EVENT to Tryout Round 1
UPDATE end_events
SET round_archer_id = @tryout_round1_ra_id
WHERE round_archer_id = @test_event_ra_id;

SELECT CONCAT('Migrated ', ROW_COUNT(), ' end_events') as status;

-- STEP 4: Verify the migration
SELECT 'After migration - Brandon round_archer records:' as status;
SELECT 
    ra.id as round_archer_id,
    ra.round_id,
    r.division,
    e.name as event_name,
    e.date as event_date,
    (SELECT COUNT(*) FROM end_events WHERE round_archer_id = ra.id) as end_count,
    (SELECT MAX(running_total) FROM end_events WHERE round_archer_id = ra.id) as final_score
FROM round_archers ra
JOIN rounds r ON ra.round_id = r.id
LEFT JOIN events e ON r.event_id = e.id
WHERE ra.archer_id = '632012a7-2645-481c-99cb-fae78be0a72f'
ORDER BY e.date DESC;

-- STEP 5: Optional cleanup - Delete the orphaned round_archer from TEST EVENT
-- (Uncomment if you want to clean up the old record)
-- DELETE FROM round_archers WHERE id = @test_event_ra_id;

SELECT 'Migration complete! Brandon Garcia scorecard moved from TEST EVENT to Tryout Round 1' as status;

