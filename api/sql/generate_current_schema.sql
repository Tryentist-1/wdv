-- Generate Current Database Schema
-- Run in phpMyAdmin to get current CREATE TABLE statements
-- Compare output with schema.mysql.sql to identify drift

-- ==================================================================
-- USAGE:
-- 1. Run each SHOW CREATE TABLE query below
-- 2. Copy the results
-- 3. Compare with api/sql/schema.mysql.sql
-- 4. Identify differences in:
--    - Column definitions
--    - Indexes
--    - Foreign key constraints
--    - Default values
-- ==================================================================

-- Events table
SHOW CREATE TABLE events;

-- Rounds table  
SHOW CREATE TABLE rounds;

-- Round_archers table
SHOW CREATE TABLE round_archers;

-- End_events table
SHOW CREATE TABLE end_events;

-- Archers table
SHOW CREATE TABLE archers;

-- ==================================================================
-- QUICK COMPARISON: Column counts
-- ==================================================================

SELECT 
    'Schema Definition' AS source,
    'events' AS table_name,
    9 AS expected_columns,  -- From schema.mysql.sql
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'events') AS actual_columns,
    CASE 
        WHEN (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
              WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'events') = 9 
        THEN 'MATCH' 
        ELSE 'MISMATCH' 
    END AS status

UNION ALL

SELECT 
    'Schema Definition' AS source,
    'rounds' AS table_name,
    11 AS expected_columns,  -- From schema.mysql.sql
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'rounds') AS actual_columns,
    CASE 
        WHEN (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
              WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'rounds') = 11 
        THEN 'MATCH' 
        ELSE 'MISMATCH' 
    END AS status

UNION ALL

SELECT 
    'Schema Definition' AS source,
    'round_archers' AS table_name,
    14 AS expected_columns,  -- From schema.mysql.sql (note: id column missing in line 74-75)
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'round_archers') AS actual_columns,
    CASE 
        WHEN (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
              WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'round_archers') >= 13 
        THEN 'OK' 
        ELSE 'MISMATCH' 
    END AS status

UNION ALL

SELECT 
    'Schema Definition' AS source,
    'end_events' AS table_name,
    11 AS expected_columns,  -- From schema.mysql.sql
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'end_events') AS actual_columns,
    CASE 
        WHEN (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
              WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'end_events') = 11 
        THEN 'MATCH' 
        ELSE 'MISMATCH' 
    END AS status;

