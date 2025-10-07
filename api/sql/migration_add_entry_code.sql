-- Migration: Add entry_code to events table
-- Date: 2025-10-06
-- Purpose: Allow archers to access events via QR code or entry code

-- Add entry_code column to events table
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS entry_code VARCHAR(20) NULL COMMENT 'Optional entry code for archer access (e.g., for QR codes)';

-- Add index for entry_code lookups
ALTER TABLE events
ADD INDEX IF NOT EXISTS idx_events_entry_code (entry_code);
