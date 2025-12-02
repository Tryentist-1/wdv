-- ========================================================
-- Human-Readable Database Views
-- ========================================================
-- Purpose: Replace UUIDs with human-readable names/values
-- Created: 2025-01-XX
-- 
-- These views make it much easier to browse and understand
-- the data in Sequel Ace or other database tools.
-- ========================================================

-- ========================================================
-- View 1: v_rounds_readable
-- ========================================================
-- Shows rounds with event name instead of event_id UUID
-- ========================================================
DROP VIEW IF EXISTS v_rounds_readable;
CREATE VIEW v_rounds_readable AS
SELECT 
    r.id AS round_id,
    r.event_id,
    e.name AS event_name,
    e.date AS event_date,
    e.status AS event_status,
    r.round_type,
    r.division,
    r.gender,
    r.level,
    r.date AS round_date,
    r.status AS round_status,
    r.created_at AS round_created_at
FROM rounds r
LEFT JOIN events e ON r.event_id = e.id
ORDER BY e.date DESC, r.division, r.created_at DESC;

-- ========================================================
-- View 2: v_round_archers_readable
-- ========================================================
-- Shows round_archers with event, round, and archer details
-- ========================================================
DROP VIEW IF EXISTS v_round_archers_readable;
CREATE VIEW v_round_archers_readable AS
SELECT 
    ra.id AS round_archer_id,
    ra.round_id,
    e.name AS event_name,
    e.date AS event_date,
    r.round_type,
    r.division AS round_division,
    r.status AS round_status,
    ra.archer_id,
    COALESCE(
        CONCAT(a.first_name, ' ', a.last_name),
        ra.archer_name
    ) AS archer_full_name,
    ra.archer_name AS archer_name_denormalized,
    COALESCE(a.school, ra.school) AS school,
    COALESCE(a.level, ra.level) AS level,
    COALESCE(a.gender, ra.gender) AS gender,
    ra.target_assignment,
    ra.target_size,
    ra.bale_number,
    ra.completed,
    ra.verified_at,
    ra.verified_by,
    ra.locked,
    ra.card_status,
    ra.notes,
    ra.created_at
FROM round_archers ra
LEFT JOIN rounds r ON ra.round_id = r.id
LEFT JOIN events e ON r.event_id = e.id
LEFT JOIN archers a ON ra.archer_id = a.id
ORDER BY e.date DESC, r.division, ra.bale_number, ra.archer_name;

-- ========================================================
-- View 3: v_end_events_readable
-- ========================================================
-- Shows end_events with all readable information
-- ========================================================
DROP VIEW IF EXISTS v_end_events_readable;
CREATE VIEW v_end_events_readable AS
SELECT 
    ee.id AS end_event_id,
    ee.round_id,
    e.name AS event_name,
    e.date AS event_date,
    r.round_type,
    r.division AS round_division,
    ee.round_archer_id,
    COALESCE(
        CONCAT(a.first_name, ' ', a.last_name),
        ra.archer_name
    ) AS archer_full_name,
    ra.archer_name AS archer_name_denormalized,
    COALESCE(a.school, ra.school) AS school,
    ra.bale_number,
    ee.end_number,
    ee.a1,
    ee.a2,
    ee.a3,
    ee.end_total,
    ee.running_total,
    ee.tens,
    ee.xs,
    ee.device_ts,
    ee.server_ts
FROM end_events ee
LEFT JOIN rounds r ON ee.round_id = r.id
LEFT JOIN events e ON r.event_id = e.id
LEFT JOIN round_archers ra ON ee.round_archer_id = ra.id
LEFT JOIN archers a ON ra.archer_id = a.id
ORDER BY e.date DESC, r.division, ra.bale_number, ee.end_number;

-- ========================================================
-- View 4: v_archer_scores_summary
-- ========================================================
-- Summary view showing archer performance across events
-- ========================================================
DROP VIEW IF EXISTS v_archer_scores_summary;
CREATE VIEW v_archer_scores_summary AS
SELECT 
    COALESCE(
        CONCAT(a.first_name, ' ', a.last_name),
        ra.archer_name
    ) AS archer_name,
    COALESCE(a.school, ra.school) AS school,
    COALESCE(a.level, ra.level) AS level,
    COALESCE(a.gender, ra.gender) AS gender,
    e.name AS event_name,
    e.date AS event_date,
    r.round_type,
    r.division AS round_division,
    ra.bale_number,
    MAX(ee.running_total) AS final_score,
    SUM(ee.tens) AS total_tens,
    SUM(ee.xs) AS total_xs,
    COUNT(ee.id) AS ends_completed,
    ra.completed AS scorecard_completed,
    ra.card_status
FROM round_archers ra
LEFT JOIN rounds r ON ra.round_id = r.id
LEFT JOIN events e ON r.event_id = e.id
LEFT JOIN archers a ON ra.archer_id = a.id
LEFT JOIN end_events ee ON ra.id = ee.round_archer_id
GROUP BY 
    ra.id,
    COALESCE(CONCAT(a.first_name, ' ', a.last_name), ra.archer_name),
    COALESCE(a.school, ra.school),
    COALESCE(a.level, ra.level),
    COALESCE(a.gender, ra.gender),
    e.name,
    e.date,
    r.round_type,
    r.division,
    ra.bale_number,
    ra.completed,
    ra.card_status
ORDER BY e.date DESC, r.division, final_score DESC;

-- ========================================================
-- View 5: v_event_summary
-- ========================================================
-- Summary view showing event overview with round counts
-- ========================================================
DROP VIEW IF EXISTS v_event_summary;
CREATE VIEW v_event_summary AS
SELECT 
    e.id AS event_id,
    e.name AS event_name,
    e.date AS event_date,
    e.status AS event_status,
    e.event_type,
    e.entry_code,
    COUNT(DISTINCT r.id) AS round_count,
    COUNT(DISTINCT ra.id) AS archer_count,
    COUNT(DISTINCT CASE WHEN ra.completed = TRUE THEN ra.id END) AS completed_scorecards,
    COUNT(DISTINCT ee.id) AS total_ends,
    e.created_at AS event_created_at
FROM events e
LEFT JOIN rounds r ON e.id = r.event_id
LEFT JOIN round_archers ra ON r.id = ra.round_id
LEFT JOIN end_events ee ON ra.id = ee.round_archer_id
GROUP BY 
    e.id,
    e.name,
    e.date,
    e.status,
    e.event_type,
    e.entry_code,
    e.created_at
ORDER BY e.date DESC;

-- ========================================================
-- View 6: v_round_summary
-- ========================================================
-- Summary view showing round overview with archer counts
-- ========================================================
DROP VIEW IF EXISTS v_round_summary;
CREATE VIEW v_round_summary AS
SELECT 
    r.id AS round_id,
    e.name AS event_name,
    e.date AS event_date,
    r.round_type,
    r.division AS round_division,
    r.gender,
    r.level,
    r.status AS round_status,
    COUNT(DISTINCT ra.id) AS archer_count,
    COUNT(DISTINCT CASE WHEN ra.completed = TRUE THEN ra.id END) AS completed_count,
    COUNT(DISTINCT ee.id) AS total_ends,
    MAX(ee.running_total) AS highest_score,
    r.created_at AS round_created_at
FROM rounds r
LEFT JOIN events e ON r.event_id = e.id
LEFT JOIN round_archers ra ON r.id = ra.round_id
LEFT JOIN end_events ee ON ra.id = ee.round_archer_id
GROUP BY 
    r.id,
    e.name,
    e.date,
    r.round_type,
    r.division,
    r.gender,
    r.level,
    r.status,
    r.created_at
ORDER BY e.date DESC, r.division;

-- ========================================================
-- Usage Notes
-- ========================================================
-- 
-- Query examples:
-- 
-- 1. Browse all rounds with event names:
--    SELECT * FROM v_rounds_readable;
-- 
-- 2. See all scorecards with readable info:
--    SELECT * FROM v_round_archers_readable 
--    WHERE event_name = 'Your Event Name';
-- 
-- 3. View all end scores with context:
--    SELECT * FROM v_end_events_readable 
--    WHERE archer_full_name LIKE '%Smith%';
-- 
-- 4. Get archer performance summary:
--    SELECT * FROM v_archer_scores_summary 
--    WHERE archer_name = 'John Doe'
--    ORDER BY event_date DESC;
-- 
-- 5. See event overview:
--    SELECT * FROM v_event_summary;
-- 
-- 6. See round overview:
--    SELECT * FROM v_round_summary 
--    WHERE event_name = 'Your Event Name';
-- 
-- ========================================================

