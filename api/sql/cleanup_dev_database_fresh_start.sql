-- ====================================================================
-- DEV DATABASE CLEANUP: Fresh Start Script
-- ====================================================================
-- Purpose: Clean up dev database to start fresh with clean test data
--          Preserves ONLY the archers master list
--          Deletes ALL events, rounds, matches, brackets, and scoring data
-- Date: December 2025
-- WARNING: This will delete ALL competition data except archers!
-- ====================================================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';

-- ====================================================================
-- STEP 1: PREVIEW - Show what will be deleted (REVIEW THIS FIRST!)
-- ====================================================================

SELECT 
    '--- PREVIEW: What will be DELETED ---' AS info
UNION ALL
SELECT 
    CONCAT('events: ', COUNT(*), ' records') AS preview
FROM events
UNION ALL
SELECT 
    CONCAT('rounds: ', COUNT(*), ' records') AS preview
FROM rounds
UNION ALL
SELECT 
    CONCAT('round_archers: ', COUNT(*), ' records') AS preview
FROM round_archers
UNION ALL
SELECT 
    CONCAT('end_events: ', COUNT(*), ' records') AS preview
FROM end_events
UNION ALL
SELECT 
    CONCAT('solo_matches: ', COUNT(*), ' records') AS preview
FROM solo_matches
UNION ALL
SELECT 
    CONCAT('team_matches: ', COUNT(*), ' records') AS preview
FROM team_matches
UNION ALL
SELECT 
    CONCAT('brackets: ', COUNT(*), ' records') AS preview
FROM brackets
UNION ALL
SELECT 
    CONCAT('bracket_entries: ', COUNT(*), ' records') AS preview
FROM bracket_entries;

SELECT 
    '--- What will be KEPT ---' AS info
UNION ALL
SELECT 
    CONCAT('archers: ', COUNT(*), ' records (MASTER LIST PRESERVED)') AS kept
FROM archers;

-- ====================================================================
-- STEP 2: OPTIONAL BACKUP (Uncomment to create backups before deletion)
-- ====================================================================

-- CREATE TABLE IF NOT EXISTS events_backup_fresh_start AS SELECT * FROM events;
-- CREATE TABLE IF NOT EXISTS rounds_backup_fresh_start AS SELECT * FROM rounds;
-- CREATE TABLE IF NOT EXISTS round_archers_backup_fresh_start AS SELECT * FROM round_archers;
-- CREATE TABLE IF NOT EXISTS end_events_backup_fresh_start AS SELECT * FROM end_events;
-- CREATE TABLE IF NOT EXISTS solo_matches_backup_fresh_start AS SELECT * FROM solo_matches;
-- CREATE TABLE IF NOT EXISTS team_matches_backup_fresh_start AS SELECT * FROM team_matches;
-- CREATE TABLE IF NOT EXISTS brackets_backup_fresh_start AS SELECT * FROM brackets;
-- CREATE TABLE IF NOT EXISTS bracket_entries_backup_fresh_start AS SELECT * FROM bracket_entries;

-- ====================================================================
-- STEP 3: DELETE ALL COMPETITION DATA
-- ====================================================================
-- Order matters due to foreign key constraints
-- Delete from child tables first, then parent tables

-- 3a. Delete all match-related data (Phase 2)
-- Solo match data
DELETE FROM solo_match_sets;
DELETE FROM solo_match_archers;
DELETE FROM solo_matches;

-- Team match data
DELETE FROM team_match_sets;
DELETE FROM team_match_archers;
DELETE FROM team_match_teams;
DELETE FROM team_matches;

-- 3b. Delete bracket data
DELETE FROM bracket_entries;
DELETE FROM brackets;

-- 3c. Delete ranking round scoring data (Phase 1)
DELETE FROM end_events;
DELETE FROM round_archers;
DELETE FROM rounds;

-- 3d. Delete events (parent table)
DELETE FROM events;

-- ====================================================================
-- STEP 4: VERIFY DELETION (should all return 0)
-- ====================================================================

SELECT 
    '--- VERIFICATION: Remaining records (should all be 0) ---' AS info
UNION ALL
SELECT 
    CONCAT('events: ', COUNT(*), ' (expected: 0)') AS verification
FROM events
UNION ALL
SELECT 
    CONCAT('rounds: ', COUNT(*), ' (expected: 0)') AS verification
FROM rounds
UNION ALL
SELECT 
    CONCAT('round_archers: ', COUNT(*), ' (expected: 0)') AS verification
FROM round_archers
UNION ALL
SELECT 
    CONCAT('end_events: ', COUNT(*), ' (expected: 0)') AS verification
FROM end_events
UNION ALL
SELECT 
    CONCAT('solo_matches: ', COUNT(*), ' (expected: 0)') AS verification
FROM solo_matches
UNION ALL
SELECT 
    CONCAT('team_matches: ', COUNT(*), ' (expected: 0)') AS verification
FROM team_matches
UNION ALL
SELECT 
    CONCAT('brackets: ', COUNT(*), ' (expected: 0)') AS verification
FROM brackets
UNION ALL
SELECT 
    CONCAT('bracket_entries: ', COUNT(*), ' (expected: 0)') AS verification
FROM bracket_entries;

-- ====================================================================
-- STEP 5: VERIFY ARCHERS PRESERVED
-- ====================================================================

SELECT 
    '--- VERIFICATION: Archers preserved ---' AS info,
    COUNT(*) AS archer_count,
    COUNT(DISTINCT school) AS unique_schools,
    COUNT(CASE WHEN status = 'active' THEN 1 END) AS active_archers,
    COUNT(CASE WHEN status = 'inactive' THEN 1 END) AS inactive_archers
FROM archers;

SELECT 
    '--- Sample archers (first 5) ---' AS info,
    id,
    CONCAT(first_name, ' ', last_name) AS name,
    school,
    CONCAT(gender, level) AS division,
    status
FROM archers
ORDER BY last_name, first_name
LIMIT 5;

-- ====================================================================
-- STEP 6: RESET AUTO_INCREMENT (if any tables use it)
-- ====================================================================

-- Note: All tables use UUIDs, so no AUTO_INCREMENT to reset
-- This step is here for completeness

-- ====================================================================
-- NEXT STEPS AFTER RUNNING THIS SCRIPT:
-- ====================================================================
-- 1. ✅ Archers master list is preserved
-- 2. ✅ All events, rounds, matches, and scoring data deleted
-- 3. ✅ Ready to create fresh test events
-- 4. ✅ Test resume round functionality with clean data
-- 5. ✅ Verify event modal and entry code workflows
-- 
-- To create a fresh test event:
-- - Use coach console: http://localhost:8001/coach.html
-- - Create new event with test data
-- - Test resume round functionality
-- ====================================================================

SET FOREIGN_KEY_CHECKS = 1;

-- ====================================================================
-- SUMMARY
-- ====================================================================
SELECT 
    '✅ CLEANUP COMPLETE' AS status,
    'All competition data deleted' AS action,
    'Archers master list preserved' AS preserved;

