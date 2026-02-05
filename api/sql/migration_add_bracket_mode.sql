-- Add mode column to brackets table
-- Modes: 
--   OPEN: Archers self-select opponents (default)
--   AUTO: Coach generates pairings
ALTER TABLE brackets ADD COLUMN mode VARCHAR(10) DEFAULT 'OPEN' AFTER bracket_format;
