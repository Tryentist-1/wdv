-- Migration: Backfill entry codes for standalone rounds that don't have one
-- Date: 2025-12-07
-- Purpose: Fix standalone rounds created before entry_code was always generated

-- First, let's see what we're dealing with
SELECT 
    r.id,
    r.round_type,
    r.division,
    r.level,
    r.date,
    r.entry_code,
    r.created_at,
    COUNT(ra.id) as archer_count
FROM rounds r
LEFT JOIN round_archers ra ON ra.round_id = r.id
WHERE r.event_id IS NULL 
  AND r.entry_code IS NULL
GROUP BY r.id, r.round_type, r.division, r.level, r.date, r.entry_code, r.created_at
ORDER BY r.created_at DESC;

-- The actual update needs to happen via PHP because the entry code generation 
-- requires uniqueness checks and random suffix generation



