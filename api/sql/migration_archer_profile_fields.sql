-- Migration: expand archers table to full coaching profile fields
-- Execute after backing up existing data (phpMyAdmin or CLI).

ALTER TABLE archers
  DROP COLUMN IF EXISTS target_size,
  DROP COLUMN IF EXISTS favorite,
  DROP COLUMN IF EXISTS active;

ALTER TABLE archers
  ADD COLUMN IF NOT EXISTS nickname VARCHAR(100) NULL AFTER last_name,
  ADD COLUMN IF NOT EXISTS photo_url VARCHAR(255) NULL AFTER nickname,
  ADD COLUMN IF NOT EXISTS grade VARCHAR(4) NULL COMMENT '9,10,11,12,GRAD' AFTER school,
  MODIFY COLUMN gender VARCHAR(1) NOT NULL COMMENT 'M or F',
  MODIFY COLUMN level VARCHAR(3) NOT NULL COMMENT 'VAR, JV, or BEG',
  ADD COLUMN IF NOT EXISTS faves TEXT NULL COMMENT 'JSON / CSV list of friend UUIDs' AFTER level,
  ADD COLUMN IF NOT EXISTS dom_eye VARCHAR(2) NULL COMMENT 'RT or LT' AFTER faves,
  ADD COLUMN IF NOT EXISTS dom_hand VARCHAR(2) NULL COMMENT 'RT or LT' AFTER dom_eye,
  ADD COLUMN IF NOT EXISTS height_in TINYINT UNSIGNED NULL COMMENT 'Height in inches' AFTER dom_hand,
  ADD COLUMN IF NOT EXISTS wingspan_in TINYINT UNSIGNED NULL COMMENT 'Wingspan in inches' AFTER height_in,
  ADD COLUMN IF NOT EXISTS draw_length_sugg DECIMAL(5,2) NULL COMMENT 'Suggested draw length' AFTER wingspan_in,
  ADD COLUMN IF NOT EXISTS riser_height_in DECIMAL(5,2) NULL COMMENT 'Riser height in inches' AFTER draw_length_sugg,
  ADD COLUMN IF NOT EXISTS limb_length VARCHAR(2) NULL COMMENT 'S, M, or L' AFTER riser_height_in,
  ADD COLUMN IF NOT EXISTS limb_weight_lbs DECIMAL(5,2) NULL COMMENT 'Limb weight in pounds' AFTER limb_length,
  ADD COLUMN IF NOT EXISTS notes_gear TEXT NULL AFTER limb_weight_lbs,
  ADD COLUMN IF NOT EXISTS notes_current TEXT NULL AFTER notes_gear,
  ADD COLUMN IF NOT EXISTS notes_archive TEXT NULL AFTER notes_current,
  ADD COLUMN IF NOT EXISTS email VARCHAR(200) NULL AFTER notes_archive,
  ADD COLUMN IF NOT EXISTS phone VARCHAR(20) NULL AFTER email,
  ADD COLUMN IF NOT EXISTS us_archery_id VARCHAR(20) NULL AFTER phone,
  ADD COLUMN IF NOT EXISTS jv_pr INT NULL COMMENT 'Junior Varsity personal record' AFTER us_archery_id,
  ADD COLUMN IF NOT EXISTS var_pr INT NULL COMMENT 'Varsity personal record' AFTER jv_pr,
  ADD COLUMN IF NOT EXISTS status VARCHAR(16) NOT NULL DEFAULT 'active' COMMENT 'active or inactive' AFTER var_pr,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP AFTER created_at;

-- Optional: ensure status matches previous active flag if it existed
UPDATE archers SET status = CASE WHEN status IS NULL OR status = '' THEN 'active' ELSE status END;

-- Optional: backfill updated_at for existing rows
UPDATE archers SET updated_at = NOW() WHERE updated_at IS NULL;
