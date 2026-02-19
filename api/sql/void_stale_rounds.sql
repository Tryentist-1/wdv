-- Migration: Void stale rounds so they no longer appear as open on archers' active window
-- Bug fix: Old data had everyone assigned to old rounds with bale 1, showing on everyone's home
-- Usage: Set @round_id below, or use scripts/dev/void-stale-rounds.sh [round_id]
-- Idempotent: Safe to run multiple times (skips already-VOID cards)

-- Round ID: use __ROUND_ID__ (replaced by script) or set manually e.g. 'df29ec34-b9ac-4667-be49-86a118e4e73e'
SET @round_id = '__ROUND_ID__';

-- ==============================================================================
-- PREVIEW: Round(s) and scorecards that will be voided
-- ==============================================================================

SELECT 
    '--- PREVIEW: Rounds to void ---' AS info;
SELECT 
    r.id AS round_id,
    r.event_id,
    e.name AS event_name,
    e.date AS event_date,
    r.division,
    r.round_type,
    r.status AS current_round_status,
    COUNT(ra.id) AS scorecards_to_void
FROM rounds r
LEFT JOIN events e ON e.id = r.event_id
LEFT JOIN round_archers ra ON ra.round_id = r.id AND (ra.card_status IS NULL OR ra.card_status != 'VOID')
WHERE r.id = @round_id
GROUP BY r.id, r.event_id, e.name, e.date, r.division, r.round_type, r.status;

SELECT 
    '--- Scorecards (round_archers) to void ---' AS info;
SELECT 
    ra.id AS round_archer_id,
    ra.round_id,
    ra.archer_name,
    ra.bale_number,
    ra.card_status AS current_card_status
FROM round_archers ra
WHERE ra.round_id = @round_id
  AND (ra.card_status IS NULL OR ra.card_status != 'VOID');

-- ==============================================================================
-- STEP 1: Void all round_archers for the round(s)
-- Sets card_status=VOID, locked=1, completed=1, appends lock_history
-- ==============================================================================

UPDATE round_archers ra
SET 
    ra.locked = 1,
    ra.completed = 1,
    ra.card_status = 'VOID',
    ra.verified_by = 'void-stale-round-script',
    ra.verified_at = NOW(),
    ra.notes = 'VOID',
    ra.lock_history = JSON_ARRAY_APPEND(
        COALESCE(NULLIF(TRIM(ra.lock_history), ''), '[]'),
        '$',
        JSON_OBJECT(
            'action', 'void',
            'actor', 'void-stale-round-script',
            'timestamp', DATE_FORMAT(NOW(), '%Y-%m-%d %H:%i:%s')
        )
    )
WHERE ra.round_id = @round_id
  AND (ra.card_status IS NULL OR ra.card_status != 'VOID');

-- ==============================================================================
-- STEP 2: Update round(s) status to Voided
-- ==============================================================================

UPDATE rounds r
SET r.status = 'Voided'
WHERE r.id = @round_id;

-- ==============================================================================
-- VERIFICATION
-- ==============================================================================

SELECT 
    '--- VERIFICATION ---' AS info;
SELECT 
    r.id AS round_id,
    r.status AS round_status,
    COUNT(ra.id) AS total_scorecards,
    SUM(CASE WHEN ra.card_status = 'VOID' THEN 1 ELSE 0 END) AS voided_count
FROM rounds r
LEFT JOIN round_archers ra ON ra.round_id = r.id
WHERE r.id = @round_id
GROUP BY r.id, r.status;
