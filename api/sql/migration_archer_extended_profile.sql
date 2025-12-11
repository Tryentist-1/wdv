-- Migration: Add extended profile fields to archers table
-- These fields are coach-only and used for USA Archery reporting
-- Execute after backing up existing data
-- Compatible with MySQL 5.7+

-- Use stored procedure to safely add columns (ignores if exists)
DELIMITER //

DROP PROCEDURE IF EXISTS add_archer_profile_columns//

CREATE PROCEDURE add_archer_profile_columns()
BEGIN
    -- dob (Date of Birth)
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
                   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'archers' AND COLUMN_NAME = 'dob') THEN
        ALTER TABLE archers ADD COLUMN dob DATE NULL COMMENT 'Date of birth' AFTER phone;
    END IF;

    -- email2 (Secondary email)
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
                   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'archers' AND COLUMN_NAME = 'email2') THEN
        ALTER TABLE archers ADD COLUMN email2 VARCHAR(200) NULL COMMENT 'Secondary email' AFTER email;
    END IF;

    -- nationality
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
                   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'archers' AND COLUMN_NAME = 'nationality') THEN
        ALTER TABLE archers ADD COLUMN nationality VARCHAR(100) NULL DEFAULT 'U.S.A.' COMMENT 'Nationality' AFTER dob;
    END IF;

    -- ethnicity
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
                   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'archers' AND COLUMN_NAME = 'ethnicity') THEN
        ALTER TABLE archers ADD COLUMN ethnicity VARCHAR(100) NULL COMMENT 'Ethnicity' AFTER nationality;
    END IF;

    -- discipline
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
                   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'archers' AND COLUMN_NAME = 'discipline') THEN
        ALTER TABLE archers ADD COLUMN discipline VARCHAR(20) NULL COMMENT 'Recurve, Compound, or Barebow' AFTER ethnicity;
    END IF;

    -- street_address
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
                   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'archers' AND COLUMN_NAME = 'street_address') THEN
        ALTER TABLE archers ADD COLUMN street_address VARCHAR(255) NULL COMMENT 'Street address line 1' AFTER discipline;
    END IF;

    -- street_address2
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
                   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'archers' AND COLUMN_NAME = 'street_address2') THEN
        ALTER TABLE archers ADD COLUMN street_address2 VARCHAR(255) NULL COMMENT 'Street address line 2' AFTER street_address;
    END IF;

    -- city
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
                   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'archers' AND COLUMN_NAME = 'city') THEN
        ALTER TABLE archers ADD COLUMN city VARCHAR(100) NULL COMMENT 'City' AFTER street_address2;
    END IF;

    -- state
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
                   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'archers' AND COLUMN_NAME = 'state') THEN
        ALTER TABLE archers ADD COLUMN state VARCHAR(50) NULL COMMENT 'State/Province' AFTER city;
    END IF;

    -- postal_code
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
                   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'archers' AND COLUMN_NAME = 'postal_code') THEN
        ALTER TABLE archers ADD COLUMN postal_code VARCHAR(20) NULL COMMENT 'Postal/ZIP code' AFTER state;
    END IF;

    -- disability
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
                   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'archers' AND COLUMN_NAME = 'disability') THEN
        ALTER TABLE archers ADD COLUMN disability VARCHAR(255) NULL COMMENT 'Disability information' AFTER postal_code;
    END IF;

    -- camp_attendance
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
                   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'archers' AND COLUMN_NAME = 'camp_attendance') THEN
        ALTER TABLE archers ADD COLUMN camp_attendance CHAR(1) NULL COMMENT 'Y or N for camp attendance' AFTER disability;
    END IF;
END//

DELIMITER ;

-- Execute the procedure
CALL add_archer_profile_columns();

-- Clean up
DROP PROCEDURE IF EXISTS add_archer_profile_columns;

-- Add index for nationality queries (common filter for USA Archery reporting)
-- Use CREATE INDEX IF NOT EXISTS alternative
DROP PROCEDURE IF EXISTS add_nationality_index;
DELIMITER //
CREATE PROCEDURE add_nationality_index()
BEGIN
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS 
                   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'archers' AND INDEX_NAME = 'idx_archers_nationality') THEN
        CREATE INDEX idx_archers_nationality ON archers(nationality);
    END IF;
END//
DELIMITER ;

CALL add_nationality_index();
DROP PROCEDURE IF EXISTS add_nationality_index;

-- Show results
SELECT 'Migration complete! New columns added:' as status;
SELECT COLUMN_NAME, COLUMN_TYPE, COLUMN_DEFAULT, COLUMN_COMMENT 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'archers' 
AND COLUMN_NAME IN ('dob', 'email2', 'nationality', 'ethnicity', 'discipline', 
                    'street_address', 'street_address2', 'city', 'state', 
                    'postal_code', 'disability', 'camp_attendance');
