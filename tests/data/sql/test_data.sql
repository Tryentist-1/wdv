-- Test Data for Division-Based Event System
-- Date: 2025-10-06
-- Purpose: Create sample data for testing new structure

-- ==============================================================================
-- CLEANUP (Optional - run if starting fresh)
-- ==============================================================================

-- DELETE FROM end_events;
-- DELETE FROM round_archers;
-- DELETE FROM rounds;
-- DELETE FROM events;
-- DELETE FROM archers;

-- ==============================================================================
-- STEP 1: Create Sample Archers
-- ==============================================================================

INSERT INTO archers (id, ext_id, first_name, last_name, school, level, gender) VALUES
-- Boys Varsity (10 archers)
(UUID(), 'archer-bv-01', 'John', 'Smith', 'WIS', 'VAR', 'M'),
(UUID(), 'archer-bv-02', 'Mike', 'Johnson', 'WIS', 'VAR', 'M'),
(UUID(), 'archer-bv-03', 'Chris', 'Williams', 'WIS', 'VAR', 'M'),
(UUID(), 'archer-bv-04', 'David', 'Brown', 'DVN', 'VAR', 'M'),
(UUID(), 'archer-bv-05', 'James', 'Davis', 'DVN', 'VAR', 'M'),
(UUID(), 'archer-bv-06', 'Robert', 'Miller', 'DVN', 'VAR', 'M'),
(UUID(), 'archer-bv-07', 'Thomas', 'Wilson', 'BHS', 'VAR', 'M'),
(UUID(), 'archer-bv-08', 'Daniel', 'Moore', 'BHS', 'VAR', 'M'),
(UUID(), 'archer-bv-09', 'Matthew', 'Taylor', 'BHS', 'VAR', 'M'),
(UUID(), 'archer-bv-10', 'Anthony', 'Anderson', 'BHS', 'VAR', 'M'),

-- Girls Varsity (6 archers)
(UUID(), 'archer-gv-01', 'Sarah', 'Martinez', 'WIS', 'VAR', 'F'),
(UUID(), 'archer-gv-02', 'Emily', 'Garcia', 'WIS', 'VAR', 'F'),
(UUID(), 'archer-gv-03', 'Jessica', 'Rodriguez', 'DVN', 'VAR', 'F'),
(UUID(), 'archer-gv-04', 'Ashley', 'Hernandez', 'DVN', 'VAR', 'F'),
(UUID(), 'archer-gv-05', 'Amanda', 'Lopez', 'BHS', 'VAR', 'F'),
(UUID(), 'archer-gv-06', 'Melissa', 'Gonzalez', 'BHS', 'VAR', 'F'),

-- Boys JV (7 archers)
(UUID(), 'archer-bj-01', 'Kevin', 'Wilson', 'WIS', 'JV', 'M'),
(UUID(), 'archer-bj-02', 'Brian', 'Lee', 'WIS', 'JV', 'M'),
(UUID(), 'archer-bj-03', 'Justin', 'Walker', 'WIS', 'JV', 'M'),
(UUID(), 'archer-bj-04', 'Ryan', 'Hall', 'DVN', 'JV', 'M'),
(UUID(), 'archer-bj-05', 'Brandon', 'Allen', 'DVN', 'JV', 'M'),
(UUID(), 'archer-bj-06', 'Eric', 'Young', 'BHS', 'JV', 'M'),
(UUID(), 'archer-bj-07', 'Steven', 'King', 'BHS', 'JV', 'M'),

-- Girls JV (4 archers)
(UUID(), 'archer-gj-01', 'Nicole', 'Wright', 'WIS', 'JV', 'F'),
(UUID(), 'archer-gj-02', 'Rachel', 'Scott', 'WIS', 'JV', 'F'),
(UUID(), 'archer-gj-03', 'Lauren', 'Green', 'DVN', 'JV', 'F'),
(UUID(), 'archer-gj-04', 'Stephanie', 'Baker', 'BHS', 'JV', 'F');

-- ==============================================================================
-- STEP 2: Create Sample Event
-- ==============================================================================

SET @event_id = UUID();

INSERT INTO events (id, name, date, status, event_type) VALUES
(@event_id, 'Fall Championship 2025', '2025-10-15', 'Active', 'auto_assign');

-- ==============================================================================
-- STEP 3: Create Division Rounds
-- ==============================================================================

SET @round_bvar_id = UUID();
SET @round_gvar_id = UUID();
SET @round_bjv_id = UUID();
SET @round_gjv_id = UUID();

INSERT INTO rounds (id, event_id, round_type, division, gender, level, date, status) VALUES
(@round_bvar_id, @event_id, 'R300', 'BVAR', 'M', 'VAR', '2025-10-15', 'Active'),
(@round_gvar_id, @event_id, 'R300', 'GVAR', 'F', 'VAR', '2025-10-15', 'Active'),
(@round_bjv_id, @event_id, 'R300', 'BJV', 'M', 'JV', '2025-10-15', 'Active'),
(@round_gjv_id, @event_id, 'R300', 'GJV', 'F', 'JV', '2025-10-15', 'Active');

-- ==============================================================================
-- STEP 4: Assign Archers to Bales (Auto-Assignment Simulation)
-- ==============================================================================

-- Boys Varsity: 10 archers → 3 bales (4, 4, 2)
-- Bale 1-3

INSERT INTO round_archers (id, round_id, archer_id, archer_name, school, level, gender, target_assignment, target_size, bale_number)
SELECT 
  UUID(),
  @round_bvar_id,
  id,
  CONCAT(first_name, ' ', last_name),
  school,
  level,
  gender,
  CASE 
    WHEN ROW_NUMBER() OVER (ORDER BY last_name) <= 4 THEN CHAR(64 + (ROW_NUMBER() OVER (ORDER BY last_name)))
    WHEN ROW_NUMBER() OVER (ORDER BY last_name) <= 8 THEN CHAR(64 + (ROW_NUMBER() OVER (ORDER BY last_name) - 4))
    ELSE CHAR(64 + (ROW_NUMBER() OVER (ORDER BY last_name) - 8))
  END,
  122, -- Varsity target size
  CASE 
    WHEN ROW_NUMBER() OVER (ORDER BY last_name) <= 4 THEN 1
    WHEN ROW_NUMBER() OVER (ORDER BY last_name) <= 8 THEN 2
    ELSE 3
  END
FROM archers
WHERE gender = 'M' AND level = 'VAR';

-- Girls Varsity: 6 archers → 2 bales (4, 2)
-- Bale 4-5

INSERT INTO round_archers (id, round_id, archer_id, archer_name, school, level, gender, target_assignment, target_size, bale_number)
SELECT 
  UUID(),
  @round_gvar_id,
  id,
  CONCAT(first_name, ' ', last_name),
  school,
  level,
  gender,
  CASE 
    WHEN ROW_NUMBER() OVER (ORDER BY last_name) <= 4 THEN CHAR(64 + (ROW_NUMBER() OVER (ORDER BY last_name)))
    ELSE CHAR(64 + (ROW_NUMBER() OVER (ORDER BY last_name) - 4))
  END,
  122, -- Varsity target size
  CASE 
    WHEN ROW_NUMBER() OVER (ORDER BY last_name) <= 4 THEN 4
    ELSE 5
  END
FROM archers
WHERE gender = 'F' AND level = 'VAR';

-- Boys JV: 7 archers → 2 bales (4, 3)
-- Bale 6-7

INSERT INTO round_archers (id, round_id, archer_id, archer_name, school, level, gender, target_assignment, target_size, bale_number)
SELECT 
  UUID(),
  @round_bjv_id,
  id,
  CONCAT(first_name, ' ', last_name),
  school,
  level,
  gender,
  CASE 
    WHEN ROW_NUMBER() OVER (ORDER BY last_name) <= 4 THEN CHAR(64 + (ROW_NUMBER() OVER (ORDER BY last_name)))
    ELSE CHAR(64 + (ROW_NUMBER() OVER (ORDER BY last_name) - 4))
  END,
  80, -- JV target size
  CASE 
    WHEN ROW_NUMBER() OVER (ORDER BY last_name) <= 4 THEN 6
    ELSE 7
  END
FROM archers
WHERE gender = 'M' AND level = 'JV';

-- Girls JV: 4 archers → 1 bale (4)
-- Bale 8

INSERT INTO round_archers (id, round_id, archer_id, archer_name, school, level, gender, target_assignment, target_size, bale_number)
SELECT 
  UUID(),
  @round_gjv_id,
  id,
  CONCAT(first_name, ' ', last_name),
  school,
  level,
  gender,
  CHAR(64 + (ROW_NUMBER() OVER (ORDER BY last_name))),
  80, -- JV target size
  8
FROM archers
WHERE gender = 'F' AND level = 'JV';

-- ==============================================================================
-- STEP 5: Create Sample Score Data (First 3 ends for some archers)
-- ==============================================================================

-- Get sample scorecard IDs
SET @scorecard_1 = (SELECT id FROM round_archers WHERE bale_number = 1 LIMIT 1);
SET @scorecard_2 = (SELECT id FROM round_archers WHERE bale_number = 1 LIMIT 1 OFFSET 1);

-- Scorecard 1: 3 ends of good scores
INSERT INTO end_events (id, round_id, round_archer_id, end_number, a1, a2, a3, end_total, running_total, tens, xs, device_ts)
SELECT 
  UUID(),
  @round_bvar_id,
  @scorecard_1,
  1,
  'X', '10', '9',
  29,
  29,
  2, 1,
  NOW()
UNION ALL
SELECT 
  UUID(),
  @round_bvar_id,
  @scorecard_1,
  2,
  '10', '9', '9',
  28,
  57,
  1, 0,
  NOW()
UNION ALL
SELECT 
  UUID(),
  @round_bvar_id,
  @scorecard_1,
  3,
  'X', 'X', '10',
  30,
  87,
  1, 2,
  NOW();

-- Scorecard 2: 2 ends
INSERT INTO end_events (id, round_id, round_archer_id, end_number, a1, a2, a3, end_total, running_total, tens, xs, device_ts)
SELECT 
  UUID(),
  @round_bvar_id,
  @scorecard_2,
  1,
  '9', '9', '8',
  26,
  26,
  0, 0,
  NOW()
UNION ALL
SELECT 
  UUID(),
  @round_bvar_id,
  @scorecard_2,
  2,
  '10', '9', '8',
  27,
  53,
  1, 0,
  NOW();

-- ==============================================================================
-- VERIFICATION QUERIES
-- ==============================================================================

-- Show event summary
SELECT 
  'Event Summary' as report_type,
  e.name,
  e.date,
  e.status,
  COUNT(DISTINCT r.id) as division_rounds,
  COUNT(DISTINCT ra.id) as total_scorecards,
  COUNT(DISTINCT ra.bale_number) as total_bales
FROM events e
LEFT JOIN rounds r ON r.event_id = e.id
LEFT JOIN round_archers ra ON ra.round_id = r.id
WHERE e.id = @event_id
GROUP BY e.id, e.name, e.date, e.status;

-- Show bale assignments
SELECT 
  'Bale Assignments' as report_type,
  ra.bale_number,
  r.division,
  COUNT(*) as archers_on_bale,
  GROUP_CONCAT(ra.archer_name ORDER BY ra.target_assignment SEPARATOR ', ') as archers
FROM round_archers ra
JOIN rounds r ON r.id = ra.round_id
WHERE r.event_id = @event_id
GROUP BY ra.bale_number, r.division
ORDER BY ra.bale_number;

-- Show scoring progress
SELECT 
  'Scoring Progress' as report_type,
  r.division,
  ra.archer_name,
  ra.bale_number,
  COUNT(DISTINCT ee.end_number) as ends_completed,
  COALESCE(MAX(ee.running_total), 0) as running_total
FROM rounds r
LEFT JOIN round_archers ra ON ra.round_id = r.id
LEFT JOIN end_events ee ON ee.round_archer_id = ra.id
WHERE r.event_id = @event_id
GROUP BY r.division, ra.archer_name, ra.bale_number
ORDER BY r.division, running_total DESC;

