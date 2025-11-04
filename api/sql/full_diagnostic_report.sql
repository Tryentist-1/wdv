-- COMPLETE DATABASE DIAGNOSTIC REPORT
-- Run this entire script in phpMyAdmin (SQL tab)
-- Copy ALL results and paste back for analysis

-- ==================================================================
-- PART 1: ORPHANED DATA CHECK
-- ==================================================================

SELECT '=== ORPHANED ROUNDS ===' as report_section, NULL as value1, NULL as value2, NULL as value3
UNION ALL
SELECT 'Orphaned Rounds (event_id → deleted event)', 
       CAST(COUNT(*) AS CHAR), 
       NULL,
       NULL
FROM rounds r
WHERE r.event_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM events e WHERE e.id = r.event_id)

UNION ALL
SELECT '=== ORPHANED END EVENTS ===' as report_section, NULL, NULL, NULL
UNION ALL
SELECT 'End Events missing round_archer', 
       CAST(COUNT(*) AS CHAR),
       CAST(MIN(server_ts) AS CHAR),
       CAST(MAX(server_ts) AS CHAR)
FROM end_events ee
WHERE NOT EXISTS (SELECT 1 FROM round_archers ra WHERE ra.id = ee.round_archer_id)

UNION ALL
SELECT 'End Events missing round',
       CAST(COUNT(*) AS CHAR),
       CAST(MIN(server_ts) AS CHAR),
       CAST(MAX(server_ts) AS CHAR)
FROM end_events ee
WHERE NOT EXISTS (SELECT 1 FROM rounds r WHERE r.id = ee.round_id)

UNION ALL
SELECT '=== ORPHANED ROUND ARCHERS ===' as report_section, NULL, NULL, NULL
UNION ALL
SELECT 'Round Archers missing round',
       CAST(COUNT(*) AS CHAR),
       NULL,
       NULL
FROM round_archers ra
WHERE NOT EXISTS (SELECT 1 FROM rounds r WHERE r.id = ra.round_id)

UNION ALL
SELECT '=== TABLE SIZES ===' as report_section, NULL, NULL, NULL
UNION ALL
SELECT 'events', CAST(COUNT(*) AS CHAR), NULL, NULL FROM events
UNION ALL
SELECT 'rounds', CAST(COUNT(*) AS CHAR), NULL, NULL FROM rounds
UNION ALL
SELECT 'round_archers', CAST(COUNT(*) AS CHAR), NULL, NULL FROM round_archers
UNION ALL
SELECT 'end_events', CAST(COUNT(*) AS CHAR), NULL, NULL FROM end_events
UNION ALL
SELECT 'archers', CAST(COUNT(*) AS CHAR), NULL, NULL FROM archers;

-- ==================================================================
-- PART 2: INDEXES CHECK
-- ==================================================================

SELECT '=== MISSING INDEXES CHECK ===' as report_section
UNION ALL
SELECT CONCAT(
    CASE WHEN EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'events' AND INDEX_NAME = 'idx_events_date') THEN '✓' ELSE '✗' END,
    ' events.idx_events_date'
)
UNION ALL
SELECT CONCAT(
    CASE WHEN EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'events' AND INDEX_NAME = 'idx_events_status') THEN '✓' ELSE '✗' END,
    ' events.idx_events_status'
)
UNION ALL
SELECT CONCAT(
    CASE WHEN EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'rounds' AND INDEX_NAME = 'idx_rounds_event') THEN '✓' ELSE '✗' END,
    ' rounds.idx_rounds_event'
)
UNION ALL
SELECT CONCAT(
    CASE WHEN EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'rounds' AND INDEX_NAME = 'idx_rounds_status') THEN '✓' ELSE '✗' END,
    ' rounds.idx_rounds_status'
)
UNION ALL
SELECT CONCAT(
    CASE WHEN EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'end_events' AND INDEX_NAME = 'uq_ra_end') THEN '✓' ELSE '✗' END,
    ' end_events.uq_ra_end (UNIQUE)'
);

-- ==================================================================
-- PART 3: FOREIGN KEYS CHECK
-- ==================================================================

SELECT '=== FOREIGN KEYS CHECK ===' as report_section
UNION ALL
SELECT CONCAT(
    CASE WHEN EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'round_archers' 
        AND CONSTRAINT_NAME = 'fk_ra_round'
    ) THEN '✓' ELSE '✗' END,
    ' round_archers.fk_ra_round → rounds(id)'
)
UNION ALL
SELECT CONCAT(
    CASE WHEN EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'end_events' 
        AND CONSTRAINT_NAME = 'fk_ev_round'
    ) THEN '✓' ELSE '✗' END,
    ' end_events.fk_ev_round → rounds(id)'
)
UNION ALL
SELECT CONCAT(
    CASE WHEN EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'end_events' 
        AND CONSTRAINT_NAME = 'fk_ev_ra'
    ) THEN '✓' ELSE '✗' END,
    ' end_events.fk_ev_ra → round_archers(id)'
);

