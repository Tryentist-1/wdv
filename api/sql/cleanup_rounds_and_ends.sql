-- Cleanup Script: Delete old rounds and ends data
-- Purpose: Start fresh with new archer-linked data structure
-- Date: 2025-10-28
-- WARNING: This will delete ALL scoring data! Run only if you're sure.

-- Step 1: Show what will be deleted (REVIEW THIS FIRST!)
SELECT 
    'rounds' AS table_name,
    COUNT(*) AS record_count,
    MIN(created_at) AS oldest_record,
    MAX(created_at) AS newest_record
FROM rounds
UNION ALL
SELECT 
    'round_archers' AS table_name,
    COUNT(*) AS record_count,
    MIN(created_at) AS oldest_record,
    MAX(created_at) AS newest_record
FROM round_archers
UNION ALL
SELECT 
    'end_events' AS table_name,
    COUNT(*) AS record_count,
    MIN(server_ts) AS oldest_record,
    MAX(server_ts) AS newest_record
FROM end_events;

-- Step 2: OPTIONAL - Backup to temporary table (if you want to keep a copy)
-- CREATE TABLE rounds_backup_20251028 AS SELECT * FROM rounds;
-- CREATE TABLE round_archers_backup_20251028 AS SELECT * FROM round_archers;
-- CREATE TABLE end_events_backup_20251028 AS SELECT * FROM end_events;

-- Step 3: Delete all end_events (scores)
DELETE FROM end_events;

-- Step 4: Delete all round_archers (scorecards)
DELETE FROM round_archers;

-- Step 5: Delete all rounds
DELETE FROM rounds;

-- Step 6: Verify deletion (should all return 0)
SELECT 
    'rounds' AS table_name,
    COUNT(*) AS remaining_records
FROM rounds
UNION ALL
SELECT 
    'round_archers' AS table_name,
    COUNT(*) AS remaining_records
FROM round_archers
UNION ALL
SELECT 
    'end_events' AS table_name,
    COUNT(*) AS remaining_records
FROM end_events;

-- Step 7: Show what we're keeping (archers master table and events)
SELECT 
    'archers' AS table_name,
    COUNT(*) AS record_count,
    'KEPT - Master archer registry' AS status
FROM archers
UNION ALL
SELECT 
    'events' AS table_name,
    COUNT(*) AS record_count,
    'KEPT - Event definitions' AS status
FROM events;

-- NEXT STEPS AFTER RUNNING THIS:
-- 1. Archers will start fresh with the new system
-- 2. When they score, archers table will be used for master records
-- 3. round_archers will link to archers via archer_id
-- 4. All archer lists will now be sorted by first name

