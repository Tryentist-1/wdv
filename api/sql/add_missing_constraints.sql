-- Add Missing Foreign Key Constraints and Indexes
-- Based on schema.mysql.sql definitions
-- Run AFTER reviewing current structure with inspect_database_structure.sql

-- ==================================================================
-- IMPORTANT: Check what already exists before running!
-- Run inspect_database_structure.sql first to see current state
-- ==================================================================

-- ==================================================================
-- FOREIGN KEY CONSTRAINTS (from schema.mysql.sql)
-- ==================================================================

-- rounds.event_id -> events.id (RECOMMENDED but not in current schema)
-- This prevents orphaned rounds when events are deleted
-- NOTE: This is NOT in the original schema.mysql.sql but is highly recommended
-- Uncomment if you want to add this protection:
-- ALTER TABLE rounds 
-- ADD CONSTRAINT fk_rounds_event 
-- FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL;

-- round_archers.round_id -> rounds.id (CASCADE DELETE)
-- Check if this exists:
SELECT CONSTRAINT_NAME 
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'round_archers'
  AND CONSTRAINT_NAME = 'fk_ra_round';

-- If above returns empty, add it:
-- ALTER TABLE round_archers
-- ADD CONSTRAINT fk_ra_round 
-- FOREIGN KEY (round_id) REFERENCES rounds(id) ON DELETE CASCADE;

-- end_events.round_id -> rounds.id (CASCADE DELETE)
-- Check if this exists:
SELECT CONSTRAINT_NAME 
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'end_events'
  AND CONSTRAINT_NAME = 'fk_ev_round';

-- If above returns empty, add it:
-- ALTER TABLE end_events
-- ADD CONSTRAINT fk_ev_round 
-- FOREIGN KEY (round_id) REFERENCES rounds(id) ON DELETE CASCADE;

-- end_events.round_archer_id -> round_archers.id (CASCADE DELETE)
-- Check if this exists:
SELECT CONSTRAINT_NAME 
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'end_events'
  AND CONSTRAINT_NAME = 'fk_ev_ra';

-- If above returns empty, add it:
-- ALTER TABLE end_events
-- ADD CONSTRAINT fk_ev_ra 
-- FOREIGN KEY (round_archer_id) REFERENCES round_archers(id) ON DELETE CASCADE;

-- ==================================================================
-- INDEXES (from schema.mysql.sql)
-- ==================================================================

-- Check for missing indexes on events table
SELECT 'events.idx_events_date' AS index_check,
       CASE WHEN EXISTS (
           SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS 
           WHERE TABLE_SCHEMA = DATABASE() 
             AND TABLE_NAME = 'events' 
             AND INDEX_NAME = 'idx_events_date'
       ) THEN 'EXISTS' ELSE 'MISSING' END AS status;

SELECT 'events.idx_events_status' AS index_check,
       CASE WHEN EXISTS (
           SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS 
           WHERE TABLE_SCHEMA = DATABASE() 
             AND TABLE_NAME = 'events' 
             AND INDEX_NAME = 'idx_events_status'
       ) THEN 'EXISTS' ELSE 'MISSING' END AS status;

SELECT 'events.idx_events_entry_code' AS index_check,
       CASE WHEN EXISTS (
           SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS 
           WHERE TABLE_SCHEMA = DATABASE() 
             AND TABLE_NAME = 'events' 
             AND INDEX_NAME = 'idx_events_entry_code'
       ) THEN 'EXISTS' ELSE 'MISSING' END AS status;

-- Check for missing indexes on rounds table
SELECT 'rounds.idx_rounds_event' AS index_check,
       CASE WHEN EXISTS (
           SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS 
           WHERE TABLE_SCHEMA = DATABASE() 
             AND TABLE_NAME = 'rounds' 
             AND INDEX_NAME = 'idx_rounds_event'
       ) THEN 'EXISTS' ELSE 'MISSING' END AS status;

SELECT 'rounds.idx_rounds_date' AS index_check,
       CASE WHEN EXISTS (
           SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS 
           WHERE TABLE_SCHEMA = DATABASE() 
             AND TABLE_NAME = 'rounds' 
             AND INDEX_NAME = 'idx_rounds_date'
       ) THEN 'EXISTS' ELSE 'MISSING' END AS status;

SELECT 'rounds.idx_rounds_division' AS index_check,
       CASE WHEN EXISTS (
           SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS 
           WHERE TABLE_SCHEMA = DATABASE() 
             AND TABLE_NAME = 'rounds' 
             AND INDEX_NAME = 'idx_rounds_division'
       ) THEN 'EXISTS' ELSE 'MISSING' END AS status;

SELECT 'rounds.idx_rounds_status' AS index_check,
       CASE WHEN EXISTS (
           SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS 
           WHERE TABLE_SCHEMA = DATABASE() 
             AND TABLE_NAME = 'rounds' 
             AND INDEX_NAME = 'idx_rounds_status'
       ) THEN 'EXISTS' ELSE 'MISSING' END AS status;

-- Check for missing indexes on round_archers table
SELECT 'round_archers.idx_ra_round' AS index_check,
       CASE WHEN EXISTS (
           SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS 
           WHERE TABLE_SCHEMA = DATABASE() 
             AND TABLE_NAME = 'round_archers' 
             AND INDEX_NAME = 'idx_ra_round'
       ) THEN 'EXISTS' ELSE 'MISSING' END AS status;

SELECT 'round_archers.idx_ra_bale' AS index_check,
       CASE WHEN EXISTS (
           SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS 
           WHERE TABLE_SCHEMA = DATABASE() 
             AND TABLE_NAME = 'round_archers' 
             AND INDEX_NAME = 'idx_ra_bale'
       ) THEN 'EXISTS' ELSE 'MISSING' END AS status;

SELECT 'round_archers.idx_ra_completed' AS index_check,
       CASE WHEN EXISTS (
           SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS 
           WHERE TABLE_SCHEMA = DATABASE() 
             AND TABLE_NAME = 'round_archers' 
             AND INDEX_NAME = 'idx_ra_completed'
       ) THEN 'EXISTS' ELSE 'MISSING' END AS status;

-- Check for missing indexes on end_events table
SELECT 'end_events.idx_ev_round' AS index_check,
       CASE WHEN EXISTS (
           SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS 
           WHERE TABLE_SCHEMA = DATABASE() 
             AND TABLE_NAME = 'end_events' 
             AND INDEX_NAME = 'idx_ev_round'
       ) THEN 'EXISTS' ELSE 'MISSING' END AS status;

SELECT 'end_events.idx_ev_ts' AS index_check,
       CASE WHEN EXISTS (
           SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS 
           WHERE TABLE_SCHEMA = DATABASE() 
             AND TABLE_NAME = 'end_events' 
             AND INDEX_NAME = 'idx_ev_ts'
       ) THEN 'EXISTS' ELSE 'MISSING' END AS status;

SELECT 'end_events.uq_ra_end' AS index_check,
       CASE WHEN EXISTS (
           SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS 
           WHERE TABLE_SCHEMA = DATABASE() 
             AND TABLE_NAME = 'end_events' 
             AND INDEX_NAME = 'uq_ra_end'
       ) THEN 'EXISTS' ELSE 'MISSING' END AS status;

-- ==================================================================
-- ALTER STATEMENTS TO ADD MISSING INDEXES
-- (Uncomment and run only the ones marked as MISSING above)
-- ==================================================================

-- Events table indexes
-- ALTER TABLE events ADD INDEX idx_events_date (date);
-- ALTER TABLE events ADD INDEX idx_events_status (status);
-- ALTER TABLE events ADD INDEX idx_events_entry_code (entry_code);

-- Rounds table indexes
-- ALTER TABLE rounds ADD INDEX idx_rounds_event (event_id);
-- ALTER TABLE rounds ADD INDEX idx_rounds_date (date);
-- ALTER TABLE rounds ADD INDEX idx_rounds_division (event_id, division);
-- ALTER TABLE rounds ADD INDEX idx_rounds_status (status);

-- Round_archers table indexes
-- ALTER TABLE round_archers ADD INDEX idx_ra_round (round_id);
-- ALTER TABLE round_archers ADD INDEX idx_ra_bale (round_id, bale_number);
-- ALTER TABLE round_archers ADD INDEX idx_ra_completed (round_id, completed);

-- End_events table indexes
-- ALTER TABLE end_events ADD INDEX idx_ev_round (round_id, end_number);
-- ALTER TABLE end_events ADD INDEX idx_ev_ts (server_ts);
-- ALTER TABLE end_events ADD UNIQUE INDEX uq_ra_end (round_archer_id, end_number);

-- ==================================================================
-- RECOMMENDED: Add rounds.event_id foreign key constraint
-- ==================================================================

-- This is NOT in the original schema but highly recommended
-- It will prevent orphaned rounds by setting event_id to NULL when an event is deleted

-- Step 1: First clean up any existing orphans (run cleanup_orphaned_data.sql first!)

-- Step 2: Then add the constraint
-- ALTER TABLE rounds 
-- ADD CONSTRAINT fk_rounds_event 
-- FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL;

-- This matches the current API behavior in index.php (lines 1318-1320)
-- which sets event_id=NULL before deleting events

