-- Migration: Add USA Archery fields to archers table
-- SIMPLE VERSION for shared hosting (no stored procedures)
-- Run these statements one at a time in phpMyAdmin
-- If a column already exists, you'll get an error - just skip to the next statement

-- 1. valid_from (Membership validity start date)
ALTER TABLE archers ADD COLUMN valid_from DATE NULL COMMENT 'USA Archery membership validity start date';

-- 2. club_state (State where club is located)
ALTER TABLE archers ADD COLUMN club_state VARCHAR(50) NULL COMMENT 'State where club is located';

-- 3. membership_type (Type of USA Archery membership)
ALTER TABLE archers ADD COLUMN membership_type VARCHAR(100) NULL COMMENT 'Type of USA Archery membership';

-- 4. address_country (Country in mailing address)
ALTER TABLE archers ADD COLUMN address_country VARCHAR(100) NULL DEFAULT 'USA' COMMENT 'Country in mailing address';

-- 5. address_line3 (Third address line)
ALTER TABLE archers ADD COLUMN address_line3 VARCHAR(255) NULL COMMENT 'Third address line';

-- 6. disability_list (Multiple disability options)
ALTER TABLE archers ADD COLUMN disability_list TEXT NULL COMMENT 'Multiple disability options';

-- 7. military_service (Military service flag)
ALTER TABLE archers ADD COLUMN military_service VARCHAR(10) NULL DEFAULT 'No' COMMENT 'Military service flag';

-- 8. introduction_source (Where archer was introduced to archery)
ALTER TABLE archers ADD COLUMN introduction_source VARCHAR(100) NULL COMMENT 'Where archer was introduced to archery';

-- 9. introduction_other (Other introduction source)
ALTER TABLE archers ADD COLUMN introduction_other VARCHAR(255) NULL COMMENT 'Other introduction source';

-- 10. nfaa_member_no (NFAA membership number)
ALTER TABLE archers ADD COLUMN nfaa_member_no VARCHAR(20) NULL COMMENT 'NFAA membership number';

-- 11. school_type (Type of school)
ALTER TABLE archers ADD COLUMN school_type VARCHAR(20) NULL COMMENT 'Type of school';

-- 12. school_full_name (Full school name)
ALTER TABLE archers ADD COLUMN school_full_name VARCHAR(200) NULL COMMENT 'Full school name';

-- Verify columns were added:
-- SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'archers' AND COLUMN_NAME IN ('valid_from', 'club_state', 'membership_type', 'address_country', 'address_line3', 'disability_list', 'military_service', 'introduction_source', 'introduction_other', 'nfaa_member_no', 'school_type', 'school_full_name');

