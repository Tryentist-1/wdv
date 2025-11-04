-- Database Structure Inspector
-- Run in phpMyAdmin to see current indexes, constraints, and table structures
-- Compare output with schema.mysql.sql to identify drift

-- ==================================================================
-- TABLE STRUCTURES (Complete DDL)
-- ==================================================================

-- Shows the complete CREATE TABLE statement for each table
SHOW CREATE TABLE events;
SHOW CREATE TABLE rounds;
SHOW CREATE TABLE round_archers;
SHOW CREATE TABLE end_events;
SHOW CREATE TABLE archers;

-- ==================================================================
-- ALL INDEXES BY TABLE
-- ==================================================================

-- Events table indexes
SELECT 
    'events' AS table_name,
    INDEX_NAME,
    COLUMN_NAME,
    NON_UNIQUE,
    SEQ_IN_INDEX,
    INDEX_TYPE
FROM INFORMATION_SCHEMA.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'events'
ORDER BY INDEX_NAME, SEQ_IN_INDEX;

-- Rounds table indexes
SELECT 
    'rounds' AS table_name,
    INDEX_NAME,
    COLUMN_NAME,
    NON_UNIQUE,
    SEQ_IN_INDEX,
    INDEX_TYPE
FROM INFORMATION_SCHEMA.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'rounds'
ORDER BY INDEX_NAME, SEQ_IN_INDEX;

-- Round_archers table indexes
SELECT 
    'round_archers' AS table_name,
    INDEX_NAME,
    COLUMN_NAME,
    NON_UNIQUE,
    SEQ_IN_INDEX,
    INDEX_TYPE
FROM INFORMATION_SCHEMA.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'round_archers'
ORDER BY INDEX_NAME, SEQ_IN_INDEX;

-- End_events table indexes
SELECT 
    'end_events' AS table_name,
    INDEX_NAME,
    COLUMN_NAME,
    NON_UNIQUE,
    SEQ_IN_INDEX,
    INDEX_TYPE
FROM INFORMATION_SCHEMA.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'end_events'
ORDER BY INDEX_NAME, SEQ_IN_INDEX;

-- Archers table indexes
SELECT 
    'archers' AS table_name,
    INDEX_NAME,
    COLUMN_NAME,
    NON_UNIQUE,
    SEQ_IN_INDEX,
    INDEX_TYPE
FROM INFORMATION_SCHEMA.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'archers'
ORDER BY INDEX_NAME, SEQ_IN_INDEX;

-- ==================================================================
-- ALL FOREIGN KEY CONSTRAINTS
-- ==================================================================

SELECT 
    TABLE_NAME,
    CONSTRAINT_NAME,
    COLUMN_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME,
    UPDATE_RULE,
    DELETE_RULE
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
  AND REFERENCED_TABLE_NAME IS NOT NULL
ORDER BY TABLE_NAME, CONSTRAINT_NAME;

-- ==================================================================
-- SUMMARY: All Tables with Index/FK Counts
-- ==================================================================

SELECT 
    t.TABLE_NAME,
    t.TABLE_ROWS AS approx_rows,
    (SELECT COUNT(DISTINCT INDEX_NAME) 
     FROM INFORMATION_SCHEMA.STATISTICS s 
     WHERE s.TABLE_SCHEMA = t.TABLE_SCHEMA 
       AND s.TABLE_NAME = t.TABLE_NAME) AS index_count,
    (SELECT COUNT(*) 
     FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE k
     WHERE k.TABLE_SCHEMA = t.TABLE_SCHEMA 
       AND k.TABLE_NAME = t.TABLE_NAME
       AND k.REFERENCED_TABLE_NAME IS NOT NULL) AS fk_count
FROM INFORMATION_SCHEMA.TABLES t
WHERE t.TABLE_SCHEMA = DATABASE()
  AND t.TABLE_TYPE = 'BASE TABLE'
ORDER BY t.TABLE_NAME;

-- ==================================================================
-- DETAILED COLUMN INFORMATION
-- ==================================================================

SELECT 
    TABLE_NAME,
    COLUMN_NAME,
    COLUMN_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT,
    COLUMN_KEY,
    EXTRA
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('events', 'rounds', 'round_archers', 'end_events', 'archers')
ORDER BY TABLE_NAME, ORDINAL_POSITION;

