-- Test Data for Division-Based Event System (MySQL 5.7 Compatible)
-- Date: 2025-10-06
-- Purpose: Create sample data for testing new structure

-- ==============================================================================
-- CLEANUP (Optional - run if starting fresh)
-- ==============================================================================

DELETE FROM end_events;
DELETE FROM round_archers;
DELETE FROM rounds;
DELETE FROM events;
DELETE FROM archers;

-- ==============================================================================
-- STEP 1: Create Sample Archers
-- ==============================================================================

-- Boys Varsity (10 archers)
INSERT INTO archers (id, ext_id, first_name, last_name, school, level, gender) VALUES
(UUID(), 'john-smith-wis', 'John', 'Smith', 'WIS', 'VAR', 'M'),
(UUID(), 'mike-johnson-wis', 'Mike', 'Johnson', 'WIS', 'VAR', 'M'),
(UUID(), 'chris-williams-wis', 'Chris', 'Williams', 'WIS', 'VAR', 'M'),
(UUID(), 'david-brown-dvn', 'David', 'Brown', 'DVN', 'VAR', 'M'),
(UUID(), 'james-davis-dvn', 'James', 'Davis', 'DVN', 'VAR', 'M'),
(UUID(), 'robert-miller-dvn', 'Robert', 'Miller', 'DVN', 'VAR', 'M'),
(UUID(), 'thomas-wilson-bhs', 'Thomas', 'Wilson', 'BHS', 'VAR', 'M'),
(UUID(), 'daniel-moore-bhs', 'Daniel', 'Moore', 'BHS', 'VAR', 'M'),
(UUID(), 'matthew-taylor-bhs', 'Matthew', 'Taylor', 'BHS', 'VAR', 'M'),
(UUID(), 'anthony-anderson-bhs', 'Anthony', 'Anderson', 'BHS', 'VAR', 'M');

-- Girls Varsity (6 archers)
INSERT INTO archers (id, ext_id, first_name, last_name, school, level, gender) VALUES
(UUID(), 'sarah-martinez-wis', 'Sarah', 'Martinez', 'WIS', 'VAR', 'F'),
(UUID(), 'emily-garcia-wis', 'Emily', 'Garcia', 'WIS', 'VAR', 'F'),
(UUID(), 'jessica-rodriguez-dvn', 'Jessica', 'Rodriguez', 'DVN', 'VAR', 'F'),
(UUID(), 'ashley-hernandez-dvn', 'Ashley', 'Hernandez', 'DVN', 'VAR', 'F'),
(UUID(), 'amanda-lopez-bhs', 'Amanda', 'Lopez', 'BHS', 'VAR', 'F'),
(UUID(), 'melissa-gonzalez-bhs', 'Melissa', 'Gonzalez', 'BHS', 'VAR', 'F');

-- Boys JV (7 archers)
INSERT INTO archers (id, ext_id, first_name, last_name, school, level, gender) VALUES
(UUID(), 'kevin-wilson-wis', 'Kevin', 'Wilson', 'WIS', 'JV', 'M'),
(UUID(), 'brian-lee-wis', 'Brian', 'Lee', 'WIS', 'JV', 'M'),
(UUID(), 'justin-walker-wis', 'Justin', 'Walker', 'WIS', 'JV', 'M'),
(UUID(), 'ryan-hall-dvn', 'Ryan', 'Hall', 'DVN', 'JV', 'M'),
(UUID(), 'brandon-allen-dvn', 'Brandon', 'Allen', 'DVN', 'JV', 'M'),
(UUID(), 'eric-young-bhs', 'Eric', 'Young', 'BHS', 'JV', 'M'),
(UUID(), 'steven-king-bhs', 'Steven', 'King', 'BHS', 'JV', 'M');

-- Girls JV (4 archers)
INSERT INTO archers (id, ext_id, first_name, last_name, school, level, gender) VALUES
(UUID(), 'nicole-wright-wis', 'Nicole', 'Wright', 'WIS', 'JV', 'F'),
(UUID(), 'rachel-scott-wis', 'Rachel', 'Scott', 'WIS', 'JV', 'F'),
(UUID(), 'lauren-green-dvn', 'Lauren', 'Green', 'DVN', 'JV', 'F'),
(UUID(), 'stephanie-baker-bhs', 'Stephanie', 'Baker', 'BHS', 'JV', 'F');

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
-- STEP 4: Assign Archers to Bales (Manual Assignment)
-- ==============================================================================

-- Boys Varsity: 10 archers → 3 bales (4, 4, 2)
-- Bale 1: 4 archers (A-D)
INSERT INTO round_archers (id, round_id, archer_id, archer_name, school, level, gender, target_assignment, target_size, bale_number)
SELECT UUID(), @round_bvar_id, id, CONCAT(first_name, ' ', last_name), school, level, gender, 'A', 122, 1
FROM archers WHERE gender = 'M' AND level = 'VAR' ORDER BY last_name LIMIT 1;

INSERT INTO round_archers (id, round_id, archer_id, archer_name, school, level, gender, target_assignment, target_size, bale_number)
SELECT UUID(), @round_bvar_id, id, CONCAT(first_name, ' ', last_name), school, level, gender, 'B', 122, 1
FROM archers WHERE gender = 'M' AND level = 'VAR' ORDER BY last_name LIMIT 1 OFFSET 1;

INSERT INTO round_archers (id, round_id, archer_id, archer_name, school, level, gender, target_assignment, target_size, bale_number)
SELECT UUID(), @round_bvar_id, id, CONCAT(first_name, ' ', last_name), school, level, gender, 'C', 122, 1
FROM archers WHERE gender = 'M' AND level = 'VAR' ORDER BY last_name LIMIT 1 OFFSET 2;

INSERT INTO round_archers (id, round_id, archer_id, archer_name, school, level, gender, target_assignment, target_size, bale_number)
SELECT UUID(), @round_bvar_id, id, CONCAT(first_name, ' ', last_name), school, level, gender, 'D', 122, 1
FROM archers WHERE gender = 'M' AND level = 'VAR' ORDER BY last_name LIMIT 1 OFFSET 3;

-- Bale 2: 4 archers (A-D)
INSERT INTO round_archers (id, round_id, archer_id, archer_name, school, level, gender, target_assignment, target_size, bale_number)
SELECT UUID(), @round_bvar_id, id, CONCAT(first_name, ' ', last_name), school, level, gender, 'A', 122, 2
FROM archers WHERE gender = 'M' AND level = 'VAR' ORDER BY last_name LIMIT 1 OFFSET 4;

INSERT INTO round_archers (id, round_id, archer_id, archer_name, school, level, gender, target_assignment, target_size, bale_number)
SELECT UUID(), @round_bvar_id, id, CONCAT(first_name, ' ', last_name), school, level, gender, 'B', 122, 2
FROM archers WHERE gender = 'M' AND level = 'VAR' ORDER BY last_name LIMIT 1 OFFSET 5;

INSERT INTO round_archers (id, round_id, archer_id, archer_name, school, level, gender, target_assignment, target_size, bale_number)
SELECT UUID(), @round_bvar_id, id, CONCAT(first_name, ' ', last_name), school, level, gender, 'C', 122, 2
FROM archers WHERE gender = 'M' AND level = 'VAR' ORDER BY last_name LIMIT 1 OFFSET 6;

INSERT INTO round_archers (id, round_id, archer_id, archer_name, school, level, gender, target_assignment, target_size, bale_number)
SELECT UUID(), @round_bvar_id, id, CONCAT(first_name, ' ', last_name), school, level, gender, 'D', 122, 2
FROM archers WHERE gender = 'M' AND level = 'VAR' ORDER BY last_name LIMIT 1 OFFSET 7;

-- Bale 3: 2 archers (A-B)
INSERT INTO round_archers (id, round_id, archer_id, archer_name, school, level, gender, target_assignment, target_size, bale_number)
SELECT UUID(), @round_bvar_id, id, CONCAT(first_name, ' ', last_name), school, level, gender, 'A', 122, 3
FROM archers WHERE gender = 'M' AND level = 'VAR' ORDER BY last_name LIMIT 1 OFFSET 8;

INSERT INTO round_archers (id, round_id, archer_id, archer_name, school, level, gender, target_assignment, target_size, bale_number)
SELECT UUID(), @round_bvar_id, id, CONCAT(first_name, ' ', last_name), school, level, gender, 'B', 122, 3
FROM archers WHERE gender = 'M' AND level = 'VAR' ORDER BY last_name LIMIT 1 OFFSET 9;

-- Girls Varsity: 6 archers → 2 bales (4, 2)
-- Bale 4: 4 archers
INSERT INTO round_archers (id, round_id, archer_id, archer_name, school, level, gender, target_assignment, target_size, bale_number)
SELECT UUID(), @round_gvar_id, id, CONCAT(first_name, ' ', last_name), school, level, gender, 'A', 122, 4
FROM archers WHERE gender = 'F' AND level = 'VAR' ORDER BY last_name LIMIT 1;

INSERT INTO round_archers (id, round_id, archer_id, archer_name, school, level, gender, target_assignment, target_size, bale_number)
SELECT UUID(), @round_gvar_id, id, CONCAT(first_name, ' ', last_name), school, level, gender, 'B', 122, 4
FROM archers WHERE gender = 'F' AND level = 'VAR' ORDER BY last_name LIMIT 1 OFFSET 1;

INSERT INTO round_archers (id, round_id, archer_id, archer_name, school, level, gender, target_assignment, target_size, bale_number)
SELECT UUID(), @round_gvar_id, id, CONCAT(first_name, ' ', last_name), school, level, gender, 'C', 122, 4
FROM archers WHERE gender = 'F' AND level = 'VAR' ORDER BY last_name LIMIT 1 OFFSET 2;

INSERT INTO round_archers (id, round_id, archer_id, archer_name, school, level, gender, target_assignment, target_size, bale_number)
SELECT UUID(), @round_gvar_id, id, CONCAT(first_name, ' ', last_name), school, level, gender, 'D', 122, 4
FROM archers WHERE gender = 'F' AND level = 'VAR' ORDER BY last_name LIMIT 1 OFFSET 3;

-- Bale 5: 2 archers
INSERT INTO round_archers (id, round_id, archer_id, archer_name, school, level, gender, target_assignment, target_size, bale_number)
SELECT UUID(), @round_gvar_id, id, CONCAT(first_name, ' ', last_name), school, level, gender, 'A', 122, 5
FROM archers WHERE gender = 'F' AND level = 'VAR' ORDER BY last_name LIMIT 1 OFFSET 4;

INSERT INTO round_archers (id, round_id, archer_id, archer_name, school, level, gender, target_assignment, target_size, bale_number)
SELECT UUID(), @round_gvar_id, id, CONCAT(first_name, ' ', last_name), school, level, gender, 'B', 122, 5
FROM archers WHERE gender = 'F' AND level = 'VAR' ORDER BY last_name LIMIT 1 OFFSET 5;

-- Boys JV: 7 archers → 2 bales (4, 3)
-- Bale 6: 4 archers
INSERT INTO round_archers (id, round_id, archer_id, archer_name, school, level, gender, target_assignment, target_size, bale_number)
SELECT UUID(), @round_bjv_id, id, CONCAT(first_name, ' ', last_name), school, level, gender, 'A', 80, 6
FROM archers WHERE gender = 'M' AND level = 'JV' ORDER BY last_name LIMIT 1;

INSERT INTO round_archers (id, round_id, archer_id, archer_name, school, level, gender, target_assignment, target_size, bale_number)
SELECT UUID(), @round_bjv_id, id, CONCAT(first_name, ' ', last_name), school, level, gender, 'B', 80, 6
FROM archers WHERE gender = 'M' AND level = 'JV' ORDER BY last_name LIMIT 1 OFFSET 1;

INSERT INTO round_archers (id, round_id, archer_id, archer_name, school, level, gender, target_assignment, target_size, bale_number)
SELECT UUID(), @round_bjv_id, id, CONCAT(first_name, ' ', last_name), school, level, gender, 'C', 80, 6
FROM archers WHERE gender = 'M' AND level = 'JV' ORDER BY last_name LIMIT 1 OFFSET 2;

INSERT INTO round_archers (id, round_id, archer_id, archer_name, school, level, gender, target_assignment, target_size, bale_number)
SELECT UUID(), @round_bjv_id, id, CONCAT(first_name, ' ', last_name), school, level, gender, 'D', 80, 6
FROM archers WHERE gender = 'M' AND level = 'JV' ORDER BY last_name LIMIT 1 OFFSET 3;

-- Bale 7: 3 archers
INSERT INTO round_archers (id, round_id, archer_id, archer_name, school, level, gender, target_assignment, target_size, bale_number)
SELECT UUID(), @round_bjv_id, id, CONCAT(first_name, ' ', last_name), school, level, gender, 'A', 80, 7
FROM archers WHERE gender = 'M' AND level = 'JV' ORDER BY last_name LIMIT 1 OFFSET 4;

INSERT INTO round_archers (id, round_id, archer_id, archer_name, school, level, gender, target_assignment, target_size, bale_number)
SELECT UUID(), @round_bjv_id, id, CONCAT(first_name, ' ', last_name), school, level, gender, 'B', 80, 7
FROM archers WHERE gender = 'M' AND level = 'JV' ORDER BY last_name LIMIT 1 OFFSET 5;

INSERT INTO round_archers (id, round_id, archer_id, archer_name, school, level, gender, target_assignment, target_size, bale_number)
SELECT UUID(), @round_bjv_id, id, CONCAT(first_name, ' ', last_name), school, level, gender, 'C', 80, 7
FROM archers WHERE gender = 'M' AND level = 'JV' ORDER BY last_name LIMIT 1 OFFSET 6;

-- Girls JV: 4 archers → 1 bale (4)
-- Bale 8: 4 archers
INSERT INTO round_archers (id, round_id, archer_id, archer_name, school, level, gender, target_assignment, target_size, bale_number)
SELECT UUID(), @round_gjv_id, id, CONCAT(first_name, ' ', last_name), school, level, gender, 'A', 80, 8
FROM archers WHERE gender = 'F' AND level = 'JV' ORDER BY last_name LIMIT 1;

INSERT INTO round_archers (id, round_id, archer_id, archer_name, school, level, gender, target_assignment, target_size, bale_number)
SELECT UUID(), @round_gjv_id, id, CONCAT(first_name, ' ', last_name), school, level, gender, 'B', 80, 8
FROM archers WHERE gender = 'F' AND level = 'JV' ORDER BY last_name LIMIT 1 OFFSET 1;

INSERT INTO round_archers (id, round_id, archer_id, archer_name, school, level, gender, target_assignment, target_size, bale_number)
SELECT UUID(), @round_gjv_id, id, CONCAT(first_name, ' ', last_name), school, level, gender, 'C', 80, 8
FROM archers WHERE gender = 'F' AND level = 'JV' ORDER BY last_name LIMIT 1 OFFSET 2;

INSERT INTO round_archers (id, round_id, archer_id, archer_name, school, level, gender, target_assignment, target_size, bale_number)
SELECT UUID(), @round_gjv_id, id, CONCAT(first_name, ' ', last_name), school, level, gender, 'D', 80, 8
FROM archers WHERE gender = 'F' AND level = 'JV' ORDER BY last_name LIMIT 1 OFFSET 3;

-- ==============================================================================
-- STEP 5: Create Sample Score Data (First 3 ends for first archer in each bale)
-- ==============================================================================

-- Get first scorecard ID from bale 1
SET @scorecard_1 = (SELECT id FROM round_archers WHERE bale_number = 1 AND target_assignment = 'A' LIMIT 1);

-- Scorecard 1: 3 ends of good scores
INSERT INTO end_events (id, round_id, round_archer_id, end_number, a1, a2, a3, end_total, running_total, tens, xs, device_ts)
VALUES
(UUID(), @round_bvar_id, @scorecard_1, 1, 'X', '10', '9', 29, 29, 2, 1, NOW()),
(UUID(), @round_bvar_id, @scorecard_1, 2, '10', '9', '9', 28, 57, 1, 0, NOW()),
(UUID(), @round_bvar_id, @scorecard_1, 3, 'X', 'X', '10', 30, 87, 1, 2, NOW());

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

-- Show archer count by division
SELECT 
  'Archer Count by Division' as report_type,
  r.division,
  COUNT(ra.id) as archer_count
FROM rounds r
LEFT JOIN round_archers ra ON ra.round_id = r.id
WHERE r.event_id = @event_id
GROUP BY r.division
ORDER BY 
  CASE r.division
    WHEN 'BVAR' THEN 1
    WHEN 'GVAR' THEN 2
    WHEN 'BJV' THEN 3
    WHEN 'GJV' THEN 4
  END;

