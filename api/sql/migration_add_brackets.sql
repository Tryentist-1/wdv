-- Migration: Add bracket management tables and fields
-- Date: November 18, 2025
-- Purpose: Support elimination and swiss bracket management for Solo and Team matches

SET @schema := DATABASE();

-- =====================================================
-- 1. Create brackets table
-- =====================================================
SELECT IF(
    EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = @schema
          AND table_name = 'brackets'
    ),
    'SELECT 1',
    'CREATE TABLE brackets (
        id CHAR(36) NOT NULL,
        event_id CHAR(36) NOT NULL,
        bracket_type ENUM(\"SOLO\", \"TEAM\") NOT NULL,
        bracket_format ENUM(\"ELIMINATION\", \"SWISS\") NOT NULL,
        division VARCHAR(10) NOT NULL COMMENT \"BV, BJV, GV, GJV, or MIXED_VAR for team\",
        bracket_size INT DEFAULT 8 COMMENT \"For elimination: always 8. For swiss: max participants\",
        status VARCHAR(20) DEFAULT \"OPEN\" COMMENT \"OPEN, IN_PROGRESS, COMPLETED\",
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by VARCHAR(100),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        INDEX idx_event (event_id),
        INDEX idx_type_format (bracket_type, bracket_format, division),
        INDEX idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;'
) INTO @sql_brackets;
PREPARE stmt_brackets FROM @sql_brackets;
EXECUTE stmt_brackets;
DEALLOCATE PREPARE stmt_brackets;

-- =====================================================
-- 2. Create bracket_entries table
-- =====================================================
SELECT IF(
    EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = @schema
          AND table_name = 'bracket_entries'
    ),
    'SELECT 1',
    'CREATE TABLE bracket_entries (
        id CHAR(36) NOT NULL,
        bracket_id CHAR(36) NOT NULL,
        entry_type ENUM(\"ARCHER\", \"TEAM\") NOT NULL,
        archer_id CHAR(36) NULL COMMENT \"For solo brackets\",
        school_id CHAR(36) NULL COMMENT \"For team brackets (team = school). For Mixed Var, coach selects archers manually.\",
        seed_position INT NULL COMMENT \"For elimination: 1-8. For swiss: NULL (random)\",
        swiss_wins INT DEFAULT 0 COMMENT \"For swiss: win count\",
        swiss_losses INT DEFAULT 0 COMMENT \"For swiss: loss count\",
        swiss_points INT DEFAULT 0 COMMENT \"For swiss: total points (wins - losses)\",
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        INDEX idx_bracket (bracket_id),
        INDEX idx_archer (archer_id),
        INDEX idx_school (school_id),
        INDEX idx_seed (seed_position)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;'
) INTO @sql_bracket_entries;
PREPARE stmt_bracket_entries FROM @sql_bracket_entries;
EXECUTE stmt_bracket_entries;
DEALLOCATE PREPARE stmt_bracket_entries;

-- =====================================================
-- 2b. Add foreign keys separately (to avoid collation issues)
-- =====================================================
-- Add foreign key for event_id (if not exists)
SELECT IF(
    EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_schema = @schema
          AND table_name = 'brackets'
          AND constraint_name = 'brackets_ibfk_1'
    ),
    'SELECT 1',
    'ALTER TABLE brackets ADD FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;'
) INTO @sql_fk1;
PREPARE stmt_fk1 FROM @sql_fk1;
EXECUTE stmt_fk1;
DEALLOCATE PREPARE stmt_fk1;

-- Add foreign key for bracket_id in bracket_entries (if not exists)
SELECT IF(
    EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_schema = @schema
          AND table_name = 'bracket_entries'
          AND constraint_name = 'bracket_entries_ibfk_1'
    ),
    'SELECT 1',
    'ALTER TABLE bracket_entries ADD FOREIGN KEY (bracket_id) REFERENCES brackets(id) ON DELETE CASCADE;'
) INTO @sql_fk2;
PREPARE stmt_fk2 FROM @sql_fk2;
EXECUTE stmt_fk2;
DEALLOCATE PREPARE stmt_fk2;

-- =====================================================
-- 3. Add bracket fields to solo_matches
-- =====================================================
SELECT IF(
    EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = @schema
          AND table_name = 'solo_matches'
          AND column_name = 'bracket_id'
    ),
    'SELECT 1',
    'ALTER TABLE solo_matches
        ADD COLUMN bracket_id CHAR(36) NULL
            COMMENT \"Links match to bracket\" AFTER event_id,
        ADD COLUMN bracket_match_id VARCHAR(30) NULL
            COMMENT \"Bracket match identifier: BVARQ1-TC-AG (elimination) or SOLO-RHTA-1101 (swiss)\" AFTER bracket_id,
        ADD INDEX idx_bracket (bracket_id),
        ADD INDEX idx_bracket_match (bracket_match_id);'
) INTO @sql_solo_bracket;
PREPARE stmt_solo_bracket FROM @sql_solo_bracket;
EXECUTE stmt_solo_bracket;
DEALLOCATE PREPARE stmt_solo_bracket;

-- =====================================================
-- 4. Add bracket fields to team_matches
-- =====================================================
SELECT IF(
    EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = @schema
          AND table_name = 'team_matches'
          AND column_name = 'bracket_id'
    ),
    'SELECT 1',
    'ALTER TABLE team_matches
        ADD COLUMN bracket_id CHAR(36) NULL
            COMMENT \"Links match to bracket\" AFTER event_id,
        ADD COLUMN bracket_match_id VARCHAR(30) NULL
            COMMENT \"Bracket match identifier: BVTARQ1-CA-GA (elimination) or TEAM-RHTA-1101 (swiss)\" AFTER bracket_id,
        ADD INDEX idx_bracket (bracket_id),
        ADD INDEX idx_bracket_match (bracket_match_id);'
) INTO @sql_team_bracket;
PREPARE stmt_team_bracket FROM @sql_team_bracket;
EXECUTE stmt_team_bracket;
DEALLOCATE PREPARE stmt_team_bracket;

-- =====================================================
-- Migration Complete
-- =====================================================
SELECT 'Bracket management tables and fields added successfully' AS status;
