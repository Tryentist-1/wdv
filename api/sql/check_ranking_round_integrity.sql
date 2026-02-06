-- Ranking round integrity check: detect mismatches between end totals and running totals.
-- Use after suspected sync issues (e.g. dropped arrows) to find scorecards that need review.
-- Safe to run: read-only. MySQL 5.7+.

-- 1) Sum of end_total per round_archer should equal the last end's running_total.
SELECT * FROM (
    SELECT
        ra.id AS round_archer_id,
        ra.archer_name,
        r.id AS round_id,
        r.round_type,
        r.division,
        SUM(ee.end_total) AS sum_end_totals,
        last_rt.last_running_total,
        (SUM(ee.end_total) - last_rt.last_running_total) AS difference
    FROM round_archers ra
    JOIN rounds r ON r.id = ra.round_id
    JOIN end_events ee ON ee.round_archer_id = ra.id
    JOIN (
        SELECT e1.round_archer_id,
               e1.running_total AS last_running_total
        FROM end_events e1
        WHERE e1.end_number = (
            SELECT MAX(e2.end_number) FROM end_events e2 WHERE e2.round_archer_id = e1.round_archer_id
        )
    ) last_rt ON last_rt.round_archer_id = ra.id
    GROUP BY ra.id, ra.archer_name, r.id, r.round_type, r.division, last_rt.last_running_total
) t
WHERE t.sum_end_totals != t.last_running_total;

-- 2) Per-end check: each row's running_total should equal sum of end_total for ends 1..end_number.
--    (Optional: uncomment to list every end that violates the invariant.)
/*
SELECT
    'MISMATCH: running_total != cumulative sum' AS issue,
    ee.round_archer_id,
    ee.end_number,
    ee.end_total,
    ee.running_total AS stored_running_total,
    (SELECT COALESCE(SUM(ee2.end_total), 0)
     FROM end_events ee2
     WHERE ee2.round_archer_id = ee.round_archer_id
       AND ee2.end_number <= ee.end_number) AS expected_running_total
FROM end_events ee
HAVING ee.running_total != (
    SELECT COALESCE(SUM(ee2.end_total), 0)
    FROM end_events ee2
    WHERE ee2.round_archer_id = ee.round_archer_id
      AND ee2.end_number <= ee.end_number
);
*/
