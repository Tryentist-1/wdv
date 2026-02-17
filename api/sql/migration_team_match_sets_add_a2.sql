-- Migration: Add a2 column to team_match_sets
-- Date: 2026-02-16
-- Bug: Team match arrows 4-6 dropped because schema only had a1 (1 arrow per archer).
--      Each archer shoots 2 arrows per set in Team Olympic Round, so a2 is needed.
-- See also: solo_match_sets which has a1, a2, a3

-- Add a2 column after a1
ALTER TABLE team_match_sets
  ADD COLUMN a2 VARCHAR(3) COMMENT 'Arrow 2 score (2 arrows per archer per set)' AFTER a1;

-- Fix the a1 comment to clarify it is Arrow 1 (not the only arrow)
ALTER TABLE team_match_sets
  MODIFY COLUMN a1 VARCHAR(3) COMMENT 'Arrow 1 score (2 arrows per archer per set)';
