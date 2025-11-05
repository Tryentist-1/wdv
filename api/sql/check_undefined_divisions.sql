-- Diagnostic Query: Check for "Undefined" Division Issue
-- 
-- This query identifies:
-- 1. Rounds with NULL or empty division
-- 2. Archers in those rounds
-- 3. Which event they belong to
-- 4. How many scores they have
--
-- Run this to assess the scope of the "Undefined" division problem

-- Part 1: Find rounds with NULL/empty division
SELECT 
    '=== ROUNDS WITH NULL/EMPTY DIVISION ===' as section,
    r.id as round_id,
    r.division,
    r.round_type,
    r.event_id,
    e.name as event_name,
    e.date as event_date,
    COUNT(DISTINCT ra.id) as archer_count,
    COUNT(DISTINCT ee.id) as score_count
FROM rounds r
LEFT JOIN events e ON e.id = r.event_id
LEFT JOIN round_archers ra ON ra.round_id = r.id
LEFT JOIN end_events ee ON ee.round_id = r.id
WHERE (r.division IS NULL OR r.division = '' OR r.division = 'Undefined')
GROUP BY r.id, r.division, r.round_type, r.event_id, e.name, e.date
ORDER BY e.date DESC, r.created_at DESC;

-- Part 2: Find archers in "Undefined" rounds with their details
SELECT 
    '=== ARCHERS IN UNDEFINED ROUNDS ===' as section,
    ra.id as round_archer_id,
    ra.archer_name,
    ra.school,
    ra.level,
    ra.gender,
    ra.bale_number,
    ra.target_assignment,
    r.id as round_id,
    r.division as round_division,
    e.id as event_id,
    e.name as event_name,
    COUNT(DISTINCT ee.id) as ends_scored,
    MAX(ee.running_total) as highest_running_total
FROM round_archers ra
JOIN rounds r ON r.id = ra.round_id
LEFT JOIN events e ON e.id = r.event_id
LEFT JOIN end_events ee ON ee.round_archer_id = ra.id
WHERE (r.division IS NULL OR r.division = '' OR r.division = 'Undefined')
GROUP BY ra.id, ra.archer_name, ra.school, ra.level, ra.gender, ra.bale_number, 
         ra.target_assignment, r.id, r.division, e.id, e.name
ORDER BY e.date DESC, ra.bale_number, ra.archer_name;

-- Part 3: Summary by event
SELECT 
    '=== SUMMARY BY EVENT ===' as section,
    e.id as event_id,
    e.name as event_name,
    e.date as event_date,
    COUNT(DISTINCT r.id) as undefined_rounds,
    COUNT(DISTINCT ra.id) as archers_in_undefined,
    COUNT(DISTINCT ee.id) as total_score_entries,
    GROUP_CONCAT(DISTINCT r.id ORDER BY r.id) as round_ids
FROM events e
JOIN rounds r ON r.event_id = e.id
LEFT JOIN round_archers ra ON ra.round_id = r.id
LEFT JOIN end_events ee ON ee.round_id = r.id
WHERE (r.division IS NULL OR r.division = '' OR r.division = 'Undefined')
GROUP BY e.id, e.name, e.date
ORDER BY e.date DESC;

-- Part 4: Compare with correct divisions in same events
SELECT 
    '=== DIVISION COMPARISON ===' as section,
    e.id as event_id,
    e.name as event_name,
    COALESCE(r.division, 'NULL/Undefined') as division,
    COUNT(DISTINCT ra.id) as archer_count,
    COUNT(DISTINCT ee.id) as score_count
FROM events e
JOIN rounds r ON r.event_id = e.id
LEFT JOIN round_archers ra ON ra.round_id = r.id
LEFT JOIN end_events ee ON ee.round_id = r.id
WHERE e.id IN (
    SELECT DISTINCT event_id 
    FROM rounds 
    WHERE (division IS NULL OR division = '' OR division = 'Undefined')
)
GROUP BY e.id, e.name, r.division
ORDER BY e.date DESC, r.division;

