-- Migration: Add verification locking fields to round_archers and expand round status
-- Date: 2025-11-06

-- Step 1: Update rounds.status to new lifecycle values
ALTER TABLE rounds
  MODIFY COLUMN status VARCHAR(20) DEFAULT 'Not Started'
    COMMENT 'Not Started, In Progress, Completed, Voided';

-- Step 2: Add locking columns to round_archers
ALTER TABLE round_archers
  ADD COLUMN IF NOT EXISTS locked BOOLEAN DEFAULT FALSE
    COMMENT 'Card locked after verification' AFTER verified_by,
  ADD COLUMN IF NOT EXISTS card_status VARCHAR(16) NOT NULL DEFAULT 'PENDING'
    COMMENT 'PENDING, VER, VOID' AFTER locked,
  ADD COLUMN IF NOT EXISTS notes TEXT NULL
    COMMENT 'Verification notes / void reason' AFTER card_status,
  ADD COLUMN IF NOT EXISTS lock_history TEXT NULL
    COMMENT 'JSON array of lock/unlock events' AFTER notes;

-- Step 3: Initialize card_status based on previous completed flag
UPDATE round_archers
SET card_status = CASE WHEN completed = TRUE THEN 'VER' ELSE 'PENDING' END
WHERE card_status IS NULL OR card_status = 'PENDING';

