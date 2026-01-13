-- Migration: Add shirt_size, pant_size, and hat_size columns to archers table
-- Date: 2026-01-13
-- Purpose: Support shirt size, pant size, and hat size fields for archer profiles
-- MySQL 5.7 compatible (no IF NOT EXISTS support)

-- Check if columns exist before adding (MySQL 5.7 compatible approach)
SET @dbname = DATABASE();
SET @tablename = 'archers';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
    AND TABLE_NAME = @tablename
    AND COLUMN_NAME = 'shirt_size'
  ) > 0,
  'SELECT 1', -- Column exists, do nothing
  'ALTER TABLE archers ADD COLUMN shirt_size VARCHAR(10) NULL COMMENT ''Shirt size (S, M, L, XL, 2X, 3X, XS)'' AFTER var_pr'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
    AND TABLE_NAME = @tablename
    AND COLUMN_NAME = 'pant_size'
  ) > 0,
  'SELECT 1',
  'ALTER TABLE archers ADD COLUMN pant_size VARCHAR(10) NULL COMMENT ''Pant size'' AFTER shirt_size'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
    AND TABLE_NAME = @tablename
    AND COLUMN_NAME = 'hat_size'
  ) > 0,
  'SELECT 1',
  'ALTER TABLE archers ADD COLUMN hat_size VARCHAR(10) NULL COMMENT ''Hat size'' AFTER pant_size'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;
