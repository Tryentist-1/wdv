-- Add match_code columns to solo_matches and team_matches
-- Created: November 17, 2025
-- Purpose: Enable match code authentication for standalone matches

-- Add match_code to solo_matches
ALTER TABLE solo_matches 
ADD COLUMN match_code VARCHAR(20) NULL UNIQUE COMMENT 'Unique access code for this match (format: solo-INITIALS-MMDD)';

-- Add index for fast lookup
CREATE INDEX idx_solo_match_code ON solo_matches(match_code);

-- Add match_code to team_matches
ALTER TABLE team_matches 
ADD COLUMN match_code VARCHAR(20) NULL UNIQUE COMMENT 'Unique access code for this match (format: team-INITIALS-MMDD)';

-- Add index for fast lookup
CREATE INDEX idx_team_match_code ON team_matches(match_code);

