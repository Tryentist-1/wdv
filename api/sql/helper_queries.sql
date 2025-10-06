-- Helper Queries for Division-Based Event System
-- Date: 2025-10-06

-- ==============================================================================
-- DIVISION CODE HELPER FUNCTION
-- ==============================================================================

DELIMITER //

CREATE FUNCTION IF NOT EXISTS get_division_code(p_gender VARCHAR(1), p_level VARCHAR(3))
RETURNS VARCHAR(10)
DETERMINISTIC
COMMENT 'Get division code (BVAR, BJV, GVAR, GJV) from gender and level'
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
-- QUERY 1: Get all archers grouped by division
-- ==============================================================================

SELECT 
  get_division_code(gender, level) as division,
  COUNT(*) as archer_count
FROM archers
GROUP BY division
ORDER BY 
  CASE division
    WHEN 'BVAR' THEN 1
    WHEN 'GVAR' THEN 2
    WHEN 'BJV' THEN 3
    WHEN 'GJV' THEN 4
  END;

-- ==============================================================================
-- QUERY 2: Get event with all division rounds
-- ==============================================================================

SELECT 
  e.id as event_id,
  e.name as event_name,
  e.date,
  e.status as event_status,
  r.id as round_id,
  r.division,
  r.status as round_status,
  COUNT(DISTINCT ra.id) as archer_count,
  COUNT(DISTINCT ra.bale_number) as bale_count
FROM events e
LEFT JOIN rounds r ON r.event_id = e.id
LEFT JOIN round_archers ra ON ra.round_id = r.id
WHERE e.id = 'EVENT_ID_HERE'
GROUP BY e.id, e.name, e.date, e.status, r.id, r.division, r.status
ORDER BY 
  CASE r.division
    WHEN 'BVAR' THEN 1
    WHEN 'GVAR' THEN 2
    WHEN 'BJV' THEN 3
    WHEN 'GJV' THEN 4
  END;

-- ==============================================================================
-- QUERY 3: Get division leaderboard with running totals
-- ==============================================================================

SELECT 
  ra.id as scorecard_id,
  ra.archer_name,
  ra.school,
  ra.bale_number,
  ra.target_assignment,
  ra.completed,
  COUNT(DISTINCT ee.end_number) as ends_completed,
  COALESCE(MAX(ee.running_total), 0) as running_total,
  COALESCE(SUM(ee.tens), 0) as total_tens,
  COALESCE(SUM(ee.xs), 0) as total_xs,
  CASE 
    WHEN COUNT(DISTINCT ee.end_number) > 0 
    THEN ROUND(COALESCE(MAX(ee.running_total), 0) / (COUNT(DISTINCT ee.end_number) * 3), 2)
    ELSE 0.00
  END as avg_per_arrow,
  MAX(ee.server_ts) as last_sync_time
FROM round_archers ra
LEFT JOIN end_events ee ON ee.round_archer_id = ra.id
WHERE ra.round_id = 'ROUND_ID_HERE'
GROUP BY ra.id, ra.archer_name, ra.school, ra.bale_number, ra.target_assignment, ra.completed
ORDER BY running_total DESC, total_xs DESC, total_tens DESC;

-- ==============================================================================
-- QUERY 4: Get complete event snapshot (all divisions)
-- ==============================================================================

SELECT 
  e.id as event_id,
  e.name as event_name,
  e.date,
  e.status as event_status,
  r.id as round_id,
  r.division,
  r.status as round_status,
  ra.id as scorecard_id,
  ra.archer_name,
  ra.school,
  ra.level,
  ra.gender,
  ra.bale_number,
  ra.target_assignment,
  ra.completed as scorecard_completed,
  COUNT(DISTINCT ee.end_number) as ends_completed,
  COALESCE(MAX(ee.running_total), 0) as running_total,
  COALESCE(SUM(ee.tens), 0) as total_tens,
  COALESCE(SUM(ee.xs), 0) as total_xs,
  CASE 
    WHEN COUNT(DISTINCT ee.end_number) > 0 
    THEN ROUND(COALESCE(MAX(ee.running_total), 0) / (COUNT(DISTINCT ee.end_number) * 3), 2)
    ELSE 0.00
  END as avg_per_arrow
FROM events e
LEFT JOIN rounds r ON r.event_id = e.id
LEFT JOIN round_archers ra ON ra.round_id = r.id
LEFT JOIN end_events ee ON ee.round_archer_id = ra.id
WHERE e.id = 'EVENT_ID_HERE'
GROUP BY 
  e.id, e.name, e.date, e.status,
  r.id, r.division, r.status,
  ra.id, ra.archer_name, ra.school, ra.level, ra.gender, 
  ra.bale_number, ra.target_assignment, ra.completed
ORDER BY 
  CASE r.division
    WHEN 'BVAR' THEN 1
    WHEN 'GVAR' THEN 2
    WHEN 'BJV' THEN 3
    WHEN 'GJV' THEN 4
  END,
  running_total DESC;

-- ==============================================================================
-- QUERY 5: Check if division round is completed
-- ==============================================================================

SELECT 
  r.id as round_id,
  r.division,
  r.status,
  COUNT(ra.id) as total_scorecards,
  SUM(CASE WHEN ra.completed = TRUE THEN 1 ELSE 0 END) as completed_scorecards,
  CASE 
    WHEN COUNT(ra.id) > 0 AND COUNT(ra.id) = SUM(CASE WHEN ra.completed = TRUE THEN 1 ELSE 0 END)
    THEN 'Completed'
    WHEN SUM(CASE WHEN ra.completed = TRUE THEN 1 ELSE 0 END) > 0
    THEN 'Active'
    ELSE 'Created'
  END as calculated_status
FROM rounds r
LEFT JOIN round_archers ra ON ra.round_id = r.id
WHERE r.id = 'ROUND_ID_HERE'
GROUP BY r.id, r.division, r.status;

-- ==============================================================================
-- QUERY 6: Get bale assignments for an event
-- ==============================================================================

SELECT 
  ra.bale_number,
  r.division,
  ra.target_assignment,
  ra.archer_name,
  ra.school,
  ra.level,
  ra.gender,
  ra.id as scorecard_id,
  r.id as round_id
FROM round_archers ra
JOIN rounds r ON r.id = ra.round_id
WHERE r.event_id = 'EVENT_ID_HERE'
ORDER BY ra.bale_number, ra.target_assignment;

-- ==============================================================================
-- QUERY 7: Get individual archer's complete scorecard
-- ==============================================================================

SELECT 
  ra.id as scorecard_id,
  ra.archer_name,
  ra.school,
  ra.level,
  ra.gender,
  ra.bale_number,
  ra.target_assignment,
  ra.completed,
  ra.verified_at,
  ee.end_number,
  ee.a1,
  ee.a2,
  ee.a3,
  ee.end_total,
  ee.running_total,
  ee.tens,
  ee.xs,
  ee.server_ts
FROM round_archers ra
LEFT JOIN end_events ee ON ee.round_archer_id = ra.id
WHERE ra.id = 'SCORECARD_ID_HERE'
ORDER BY ee.end_number;

-- ==============================================================================
-- QUERY 8: Get archers available for a division (for bale assignment)
-- ==============================================================================

-- Example: Get all Boys Varsity archers
SELECT 
  id as archer_id,
  CONCAT(first_name, ' ', last_name) as full_name,
  first_name,
  last_name,
  school,
  level,
  gender
FROM archers
WHERE gender = 'M' AND level = 'VAR'
ORDER BY last_name, first_name;

-- ==============================================================================
-- QUERY 9: Update round status based on scorecard completion
-- ==============================================================================

-- This would typically be triggered by application logic
UPDATE rounds r
SET status = (
  SELECT 
    CASE 
      WHEN COUNT(ra.id) > 0 AND COUNT(ra.id) = SUM(CASE WHEN ra.completed = TRUE THEN 1 ELSE 0 END)
      THEN 'Completed'
      WHEN SUM(CASE WHEN ra.completed = TRUE THEN 1 ELSE 0 END) > 0
      THEN 'Active'
      ELSE 'Created'
    END
  FROM round_archers ra
  WHERE ra.round_id = r.id
)
WHERE r.id = 'ROUND_ID_HERE';

-- ==============================================================================
-- QUERY 10: Get event completion summary
-- ==============================================================================

SELECT 
  e.id as event_id,
  e.name as event_name,
  e.status as event_status,
  COUNT(DISTINCT r.id) as total_rounds,
  SUM(CASE WHEN r.status = 'Completed' THEN 1 ELSE 0 END) as completed_rounds,
  COUNT(DISTINCT ra.id) as total_scorecards,
  SUM(CASE WHEN ra.completed = TRUE THEN 1 ELSE 0 END) as completed_scorecards,
  ROUND(100.0 * SUM(CASE WHEN ra.completed = TRUE THEN 1 ELSE 0 END) / NULLIF(COUNT(DISTINCT ra.id), 0), 1) as completion_percentage
FROM events e
LEFT JOIN rounds r ON r.event_id = e.id
LEFT JOIN round_archers ra ON ra.round_id = r.id
WHERE e.id = 'EVENT_ID_HERE'
GROUP BY e.id, e.name, e.status;

