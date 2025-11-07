-- Migration: Add verification locking fields to round_archers and expand round status
-- Date: 2025-11-06

-- Step 1: Update rounds.status to new lifecycle values
ALTER TABLE rounds
  MODIFY COLUMN status VARCHAR(20) NOT NULL DEFAULT 'Not Started'
    COMMENT 'Not Started, In Progress, Completed, Voided';

-- Step 2: Add locking columns to round_archers
SET @schema := DATABASE();

SELECT IF(
    EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = @schema
          AND table_name = 'round_archers'
          AND column_name = 'locked'
    ),
    'SELECT 1',
    'ALTER TABLE round_archers
        ADD COLUMN locked TINYINT(1) NOT NULL DEFAULT 0
            COMMENT \"Card locked after verification\" AFTER verified_by;'
) INTO @sql_locked;
PREPARE stmt_locked FROM @sql_locked;
EXECUTE stmt_locked;
DEALLOCATE PREPARE stmt_locked;

SELECT IF(
    EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = @schema
          AND table_name = 'round_archers'
          AND column_name = 'card_status'
    ),
    'SELECT 1',
    'ALTER TABLE round_archers
        ADD COLUMN card_status VARCHAR(16) NOT NULL DEFAULT \"PENDING\"
            COMMENT \"PENDING, VER, VOID\" AFTER locked;'
) INTO @sql_status;
PREPARE stmt_status FROM @sql_status;
EXECUTE stmt_status;
DEALLOCATE PREPARE stmt_status;

SELECT IF(
    EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = @schema
          AND table_name = 'round_archers'
          AND column_name = 'notes'
    ),
    'SELECT 1',
    'ALTER TABLE round_archers
        ADD COLUMN notes TEXT NULL
            COMMENT \"Verification notes / void reason\" AFTER card_status;'
) INTO @sql_notes;
PREPARE stmt_notes FROM @sql_notes;
EXECUTE stmt_notes;
DEALLOCATE PREPARE stmt_notes;

SELECT IF(
    EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = @schema
          AND table_name = 'round_archers'
          AND column_name = 'lock_history'
    ),
    'SELECT 1',
    'ALTER TABLE round_archers
        ADD COLUMN lock_history TEXT NULL
            COMMENT \"JSON array of lock/unlock events\" AFTER notes;'
) INTO @sql_history;
PREPARE stmt_history FROM @sql_history;
EXECUTE stmt_history;
DEALLOCATE PREPARE stmt_history;

-- Step 3: Initialize card_status based on previous completed flag
UPDATE round_archers
SET card_status = CASE WHEN completed = TRUE THEN 'VER' ELSE 'PENDING' END
WHERE card_status IS NULL OR card_status = 'PENDING';

