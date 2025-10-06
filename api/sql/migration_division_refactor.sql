-- Migration: Division-Based Event Refactor
-- Date: 2025-10-06
-- Purpose: Refactor from bale-centric to division-centric event structure

-- ==============================================================================
-- STEP 1: BACKUP EXISTING DATA (Manual step - run before migration)
-- ==============================================================================
-- CREATE TABLE archers_backup AS SELECT * FROM archers;
-- CREATE TABLE rounds_backup AS SELECT * FROM rounds;
-- CREATE TABLE round_archers_backup AS SELECT * FROM round_archers;
-- CREATE TABLE events_backup AS SELECT * FROM events;
-- CREATE TABLE end_events_backup AS SELECT * FROM end_events;

-- ==============================================================================
-- STEP 2: UPDATE ARCHERS TABLE (Standardize field values)
-- ==============================================================================

-- Standardize level field: 'Varsity', 'V' → 'VAR', keep 'JV' as is
UPDATE archers 
SET level = 'VAR' 
WHERE level IN ('Varsity', 'V', 'varsity', 'v');

UPDATE archers 
SET level = 'JV' 
WHERE level IN ('Junior Varsity', 'jv', 'junior varsity');

-- Standardize gender field: 'Male', 'Boys' → 'M', 'Female', 'Girls' → 'F'
UPDATE archers 
SET gender = 'M' 
WHERE gender IN ('Male', 'M', 'Boys', 'male', 'boys');

UPDATE archers 
SET gender = 'F' 
WHERE gender IN ('Female', 'F', 'Girls', 'female', 'girls');

-- Standardize school field: Trim to 3 letters uppercase
UPDATE archers 
SET school = UPPER(SUBSTRING(school, 1, 3))
WHERE LENGTH(school) > 3 OR school != UPPER(school);

-- Modify column constraints
ALTER TABLE archers 
  MODIFY COLUMN level VARCHAR(3) NOT NULL COMMENT 'VAR or JV',
  MODIFY COLUMN gender VARCHAR(1) NOT NULL COMMENT 'M or F',
  MODIFY COLUMN school VARCHAR(3) NOT NULL COMMENT '3-letter school code';

-- Add index for division queries
CREATE INDEX idx_archers_division ON archers(gender, level);

-- ==============================================================================
-- STEP 3: UPDATE EVENTS TABLE
-- ==============================================================================

-- Ensure status field uses standardized values
UPDATE events 
SET status = 'Planned' 
WHERE status IN ('Upcoming', 'upcoming', 'planned');

UPDATE events 
SET status = 'Active' 
WHERE status IN ('active', 'in_progress', 'InProgress');

UPDATE events 
SET status = 'Completed' 
WHERE status IN ('completed', 'finished', 'done');

-- Add event_type column
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS event_type VARCHAR(20) DEFAULT 'auto_assign' 
    COMMENT 'auto_assign or self_select',
  MODIFY COLUMN status VARCHAR(20) NOT NULL DEFAULT 'Planned' 
    COMMENT 'Planned, Active, or Completed';

-- ==============================================================================
-- STEP 4: UPDATE ROUNDS TABLE (Add division fields)
-- ==============================================================================

-- Add division-related columns
ALTER TABLE rounds
  ADD COLUMN IF NOT EXISTS division VARCHAR(10) NULL 
    COMMENT 'BVAR, BJV, GVAR, GJV',
  ADD COLUMN IF NOT EXISTS gender VARCHAR(1) NULL 
    COMMENT 'M or F',
  ADD COLUMN IF NOT EXISTS level VARCHAR(3) NULL 
    COMMENT 'VAR or JV',
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'Created' 
    COMMENT 'Created, Active, Completed';

-- Note: bale_number column deprecated but kept for backwards compatibility
-- It will be removed in a future migration after all data is migrated

-- Add index for division queries
CREATE INDEX idx_rounds_division ON rounds(event_id, division);
CREATE INDEX idx_rounds_status ON rounds(status);

-- ==============================================================================
-- STEP 5: UPDATE ROUND_ARCHERS TABLE
-- ==============================================================================

-- Standardize existing data
UPDATE round_archers 
SET level = 'VAR' 
WHERE level IN ('Varsity', 'V', 'varsity', 'v');

UPDATE round_archers 
SET level = 'JV' 
WHERE level IN ('Junior Varsity', 'jv', 'junior varsity');

UPDATE round_archers 
SET gender = 'M' 
WHERE gender IN ('Male', 'M', 'Boys', 'male', 'boys');

UPDATE round_archers 
SET gender = 'F' 
WHERE gender IN ('Female', 'F', 'Girls', 'female', 'girls');

UPDATE round_archers 
SET school = UPPER(SUBSTRING(school, 1, 3))
WHERE LENGTH(school) > 3 OR school != UPPER(school);

-- Add new columns
ALTER TABLE round_archers
  ADD COLUMN IF NOT EXISTS bale_number INT NULL 
    COMMENT 'Assigned bale within event (continuous across divisions)',
  ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT FALSE 
    COMMENT 'Scorecard completed and verified',
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP NULL 
    COMMENT 'When scorecard was verified and submitted',
  ADD COLUMN IF NOT EXISTS verified_by VARCHAR(100) NULL 
    COMMENT 'Who verified (device ID or user)',
  MODIFY COLUMN level VARCHAR(3) COMMENT 'VAR or JV',
  MODIFY COLUMN gender VARCHAR(1) COMMENT 'M or F',
  MODIFY COLUMN school VARCHAR(3) COMMENT '3-letter code';

-- Add indexes
CREATE INDEX idx_ra_bale ON round_archers(round_id, bale_number);
CREATE INDEX idx_ra_completed ON round_archers(round_id, completed);

-- ==============================================================================
-- STEP 6: DATA VALIDATION QUERIES
-- ==============================================================================

-- Check for invalid level values
-- Should return 0 rows
SELECT id, level FROM archers WHERE level NOT IN ('VAR', 'JV');
SELECT id, level FROM round_archers WHERE level IS NOT NULL AND level NOT IN ('VAR', 'JV');

-- Check for invalid gender values
-- Should return 0 rows
SELECT id, gender FROM archers WHERE gender NOT IN ('M', 'F');
SELECT id, gender FROM round_archers WHERE gender IS NOT NULL AND gender NOT IN ('M', 'F');

-- Check for invalid school codes (should be 3 uppercase letters)
-- Should return 0 rows
SELECT id, school FROM archers WHERE LENGTH(school) != 3 OR school != UPPER(school);
SELECT id, school FROM round_archers WHERE school IS NOT NULL AND (LENGTH(school) != 3 OR school != UPPER(school));

-- Check event status values
-- Should return 0 rows
SELECT id, status FROM events WHERE status NOT IN ('Planned', 'Active', 'Completed');

-- ==============================================================================
-- STEP 7: HELPER FUNCTIONS FOR DIVISION CODES
-- ==============================================================================

-- Create a helper function to get division code from gender + level
DELIMITER //

CREATE FUNCTION IF NOT EXISTS get_division_code(p_gender VARCHAR(1), p_level VARCHAR(3))
RETURNS VARCHAR(10)
DETERMINISTIC
BEGIN
  DECLARE division_code VARCHAR(10);
  
  IF p_gender = 'M' AND p_level = 'VAR' THEN
    SET division_code = 'BVAR';
  ELSEIF p_gender = 'M' AND p_level = 'JV' THEN
    SET division_code = 'BJV';
  ELSEIF p_gender = 'F' AND p_level = 'VAR' THEN
    SET division_code = 'GVAR';
  ELSEIF p_gender = 'F' AND p_level = 'JV' THEN
    SET division_code = 'GJV';
  ELSE
    SET division_code = NULL;
  END IF;
  
  RETURN division_code;
END//

DELIMITER ;

-- ==============================================================================
-- STEP 8: SAMPLE QUERIES FOR NEW STRUCTURE
-- ==============================================================================

-- Get all archers by division
-- SELECT * FROM archers WHERE gender = 'M' AND level = 'VAR'; -- Boys Varsity
-- SELECT * FROM archers WHERE gender = 'F' AND level = 'JV';  -- Girls JV

-- Get event with division rounds
-- SELECT e.*, r.id as round_id, r.division, r.status as round_status
-- FROM events e
-- LEFT JOIN rounds r ON r.event_id = e.id
-- WHERE e.id = 'event-uuid'
-- ORDER BY 
--   CASE r.division
--     WHEN 'BVAR' THEN 1
--     WHEN 'GVAR' THEN 2
--     WHEN 'BJV' THEN 3
--     WHEN 'GJV' THEN 4
--   END;

-- Get leaderboard for a division round
-- SELECT 
--   ra.id,
--   ra.archer_name,
--   ra.school,
--   ra.bale_number,
--   ra.target_assignment,
--   COUNT(DISTINCT ee.end_number) as ends_completed,
--   SUM(ee.end_total) as running_total,
--   SUM(ee.tens) as total_tens,
--   SUM(ee.xs) as total_xs,
--   ROUND(SUM(ee.end_total) / (COUNT(DISTINCT ee.end_number) * 3), 2) as avg_per_arrow
-- FROM round_archers ra
-- LEFT JOIN end_events ee ON ee.round_archer_id = ra.id
-- WHERE ra.round_id = 'round-uuid'
-- GROUP BY ra.id
-- ORDER BY running_total DESC;

-- ==============================================================================
-- MIGRATION COMPLETE
-- ==============================================================================
-- Next steps:
-- 1. Run validation queries in STEP 6
-- 2. Test with sample event creation
-- 3. Update API endpoints to use new structure
-- 4. Update client-side code to match new data model

