-- Database Orphan Status Check
-- Run this in phpMyAdmin to see what orphaned data exists
-- Safe to run - this only reads data, doesn't modify anything

-- ==================================================================
-- CHECK 1: Orphaned rounds (event_id points to deleted events)
-- ==================================================================
SELECT 
    'Orphaned Rounds' AS issue_type,
    COUNT(*) AS count_affected,
    GROUP_CONCAT(DISTINCT DATE(r.date) ORDER BY r.date SEPARATOR ', ') AS affected_dates
FROM rounds r
WHERE r.event_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM events e WHERE e.id = r.event_id);

-- ==================================================================
-- CHECK 2: Affected scorecards (will be cascade deleted with orphaned rounds)
-- ==================================================================
SELECT 
    'Affected Scorecards' AS issue_type,
    COUNT(*) AS total_scorecards,
    SUM(ra.completed) AS completed_scorecards,
    SUM(CASE WHEN ra.completed = 0 THEN 1 ELSE 0 END) AS incomplete_scorecards
FROM round_archers ra
INNER JOIN rounds r ON ra.round_id = r.id
WHERE r.event_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM events e WHERE e.id = r.event_id);

-- ==================================================================
-- CHECK 3: Affected end events via orphaned rounds
-- ==================================================================
SELECT 
    'Affected End Events (via orphaned rounds)' AS issue_type,
    COUNT(*) AS count_affected,
    MIN(ee.server_ts) AS oldest_event,
    MAX(ee.server_ts) AS newest_event
FROM end_events ee
INNER JOIN rounds r ON ee.round_id = r.id
WHERE r.event_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM events e WHERE e.id = r.event_id);

-- ==================================================================
-- CHECK 4: Orphaned end_events (missing round_archer)
-- ==================================================================
SELECT 
    'Orphaned End Events (missing round_archer)' AS issue_type,
    COUNT(*) AS count_affected,
    MIN(ee.server_ts) AS oldest_event,
    MAX(ee.server_ts) AS newest_event
FROM end_events ee
WHERE NOT EXISTS (SELECT 1 FROM round_archers ra WHERE ra.id = ee.round_archer_id);

-- ==================================================================
-- CHECK 5: Orphaned end_events (missing round)
-- ==================================================================
SELECT 
    'Orphaned End Events (missing round)' AS issue_type,
    COUNT(*) AS count_affected,
    MIN(ee.server_ts) AS oldest_event,
    MAX(ee.server_ts) AS newest_event
FROM end_events ee
WHERE NOT EXISTS (SELECT 1 FROM rounds r WHERE r.id = ee.round_id);

-- ==================================================================
-- CHECK 6: Orphaned round_archers (missing round)
-- ==================================================================
SELECT 
    'Orphaned Round Archers (missing round)' AS issue_type,
    COUNT(*) AS count_affected
FROM round_archers ra
WHERE NOT EXISTS (SELECT 1 FROM rounds r WHERE r.id = ra.round_id);

-- ==================================================================
-- CURRENT TABLE SIZES
-- ==================================================================
SELECT 'events' AS table_name, COUNT(*) AS total_records FROM events
UNION ALL
SELECT 'rounds' AS table_name, COUNT(*) AS total_records FROM rounds
UNION ALL
SELECT 'round_archers' AS table_name, COUNT(*) AS total_records FROM round_archers
UNION ALL
SELECT 'end_events' AS table_name, COUNT(*) AS total_records FROM end_events;

