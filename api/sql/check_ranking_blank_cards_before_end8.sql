-- Ranking round data integrity: list all scorecards "in process" that have a blank arrow in any end before end 8.
-- "In process" = has at least one end_events row with end_number <= 7.
-- "Blank" = for an end 1-7, either no row exists or the row has a1, a2, or a3 null/empty.
-- Safe to run: read-only. MySQL 5.7+ / MariaDB.

SELECT
    ra.id AS round_archer_id,
    ra.archer_name,
    ra.bale_number,
    r.id AS round_id,
    r.division,
    r.round_type,
    e.id AS event_id,
    e.name AS event_name,
    e.date AS event_date
FROM round_archers ra
JOIN rounds r ON r.id = ra.round_id
JOIN events e ON e.id = r.event_id
WHERE ra.id IN (
    SELECT ee.round_archer_id
    FROM end_events ee
    WHERE ee.end_number <= 7
    GROUP BY ee.round_archer_id
    HAVING MAX(
        CASE
            WHEN TRIM(COALESCE(ee.a1, '')) = ''
              OR TRIM(COALESCE(ee.a2, '')) = ''
              OR TRIM(COALESCE(ee.a3, '')) = ''
            THEN 1
            ELSE 0
        END
    ) = 1
    OR COUNT(DISTINCT ee.end_number) < 7
)
ORDER BY e.date DESC, e.name, r.division, ra.bale_number, ra.archer_name;
