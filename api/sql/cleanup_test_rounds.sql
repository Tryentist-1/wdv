-- =====================================================
-- Clean Up Test Rounds and Scorecards
-- =====================================================
-- Use this to clean up after testing Phase 0
-- This removes all scoring data but keeps events and archers
-- =====================================================

-- OPTION 1: Clean specific round (safest)
-- Replace 'YOUR-ROUND-ID' with the round ID from console error
DELETE FROM end_events WHERE round_id = 'acac6dd1-147b-40e7-87a2-d366a5caa4da';
DELETE FROM round_archers WHERE round_id = 'acac6dd1-147b-40e7-87a2-d366a5caa4da';
DELETE FROM rounds WHERE id = 'acac6dd1-147b-40e7-87a2-d366a5caa4da';

-- OPTION 2: Clean specific event (removes all rounds for event)
-- Uncomment and replace 'YOUR-EVENT-ID' with actual event ID
-- DELETE FROM end_events WHERE round_id IN (SELECT id FROM rounds WHERE event_id = 'YOUR-EVENT-ID');
-- DELETE FROM round_archers WHERE round_id IN (SELECT id FROM rounds WHERE event_id = 'YOUR-EVENT-ID');
-- DELETE FROM rounds WHERE event_id = 'YOUR-EVENT-ID';

-- OPTION 3: Clean ALL test rounds (nuclear option - use carefully!)
-- Uncomment these lines ONLY if you want to delete EVERYTHING
-- DELETE FROM end_events;
-- DELETE FROM round_archers;
-- DELETE FROM rounds;

-- OPTION 4: Check what's in the database before deleting
-- Run these SELECT statements first to see what you have:

SELECT 'ROUNDS' as table_name, COUNT(*) as count FROM rounds
UNION ALL
SELECT 'ROUND_ARCHERS', COUNT(*) FROM round_archers
UNION ALL
SELECT 'END_EVENTS', COUNT(*) FROM end_events;

-- View recent rounds:
SELECT id, event_id, division, date, bale_number, created_at 
FROM rounds 
ORDER BY created_at DESC 
LIMIT 10;

-- View round_archers for problematic round:
SELECT id, round_id, archer_name, bale_number, target_assignment, created_at
FROM round_archers
WHERE round_id = 'acac6dd1-147b-40e7-87a2-d366a5caa4da'
ORDER BY bale_number, target_assignment;

