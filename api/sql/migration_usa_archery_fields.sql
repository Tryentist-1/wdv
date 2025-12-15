-- Migration: Add USA Archery fields to archers table
-- These fields are coach-only and used for USA Archery team upload/download
-- Execute after backing up existing data
-- Compatible with MySQL 5.7+

-- Use stored procedure to safely add columns (ignores if exists)
DELIMITER //

DROP PROCEDURE IF EXISTS add_usa_archery_columns//

CREATE PROCEDURE add_usa_archery_columns()
BEGIN
    -- valid_from (Membership validity start date)
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
                   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'archers' AND COLUMN_NAME = 'valid_from') THEN
        ALTER TABLE archers ADD COLUMN valid_from DATE NULL COMMENT 'USA Archery membership validity start date' AFTER camp_attendance;
    END IF;

    -- club_state (State where club is located)
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
                   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'archers' AND COLUMN_NAME = 'club_state') THEN
        ALTER TABLE archers ADD COLUMN club_state VARCHAR(50) NULL COMMENT 'State where club is located' AFTER valid_from;
    END IF;

    -- membership_type (Type of USA Archery membership)
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
                   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'archers' AND COLUMN_NAME = 'membership_type') THEN
        ALTER TABLE archers ADD COLUMN membership_type VARCHAR(100) NULL COMMENT 'Type of USA Archery membership' AFTER club_state;
    END IF;

    -- address_country (Country in mailing address)
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
                   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'archers' AND COLUMN_NAME = 'address_country') THEN
        ALTER TABLE archers ADD COLUMN address_country VARCHAR(100) NULL DEFAULT 'USA' COMMENT 'Country in mailing address' AFTER postal_code;
    END IF;

    -- address_line3 (Third address line)
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
                   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'archers' AND COLUMN_NAME = 'address_line3') THEN
        ALTER TABLE archers ADD COLUMN address_line3 VARCHAR(255) NULL COMMENT 'Third address line' AFTER street_address2;
    END IF;

    -- disability_list (Multiple disability options)
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
                   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'archers' AND COLUMN_NAME = 'disability_list') THEN
        ALTER TABLE archers ADD COLUMN disability_list TEXT NULL COMMENT 'Multiple disability options (JSON or comma-separated)' AFTER disability;
    END IF;

    -- military_service (Military service flag)
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
                   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'archers' AND COLUMN_NAME = 'military_service') THEN
        ALTER TABLE archers ADD COLUMN military_service VARCHAR(10) NULL DEFAULT 'No' COMMENT 'Military service flag (Y/N or Yes/No)' AFTER disability_list;
    END IF;

    -- introduction_source (Where archer was introduced to archery)
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
                   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'archers' AND COLUMN_NAME = 'introduction_source') THEN
        ALTER TABLE archers ADD COLUMN introduction_source VARCHAR(100) NULL COMMENT 'Where archer was introduced to archery' AFTER military_service;
    END IF;

    -- introduction_other (Other introduction source)
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
                   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'archers' AND COLUMN_NAME = 'introduction_other') THEN
        ALTER TABLE archers ADD COLUMN introduction_other VARCHAR(255) NULL COMMENT 'Other introduction source' AFTER introduction_source;
    END IF;

    -- nfaa_member_no (NFAA membership number)
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
                   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'archers' AND COLUMN_NAME = 'nfaa_member_no') THEN
        ALTER TABLE archers ADD COLUMN nfaa_member_no VARCHAR(20) NULL COMMENT 'NFAA membership number' AFTER introduction_other;
    END IF;

    -- school_type (Type of school)
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
                   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'archers' AND COLUMN_NAME = 'school_type') THEN
        ALTER TABLE archers ADD COLUMN school_type VARCHAR(20) NULL COMMENT 'Type of school (High, Middle, Elementary, etc.)' AFTER nfaa_member_no;
    END IF;

    -- school_full_name (Full school name)
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
                   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'archers' AND COLUMN_NAME = 'school_full_name') THEN
        ALTER TABLE archers ADD COLUMN school_full_name VARCHAR(200) NULL COMMENT 'Full school name' AFTER school_type;
    END IF;
END//

DELIMITER ;

-- Execute the procedure
CALL add_usa_archery_columns();

-- Clean up
DROP PROCEDURE IF EXISTS add_usa_archery_columns;

-- Show results
SELECT 'Migration complete! New USA Archery columns added:' as status;
SELECT COLUMN_NAME, COLUMN_TYPE, COLUMN_DEFAULT, COLUMN_COMMENT 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'archers' 
AND COLUMN_NAME IN ('valid_from', 'club_state', 'membership_type', 'address_country', 
                    'address_line3', 'disability_list', 'military_service', 'introduction_source', 
                    'introduction_other', 'nfaa_member_no', 'school_type', 'school_full_name')
ORDER BY ORDINAL_POSITION;

