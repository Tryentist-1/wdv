-- Database Backup
-- Generated: 2025-11-05 19:29:29
-- Database: wdv

SET FOREIGN_KEY_CHECKS=0;
SET SQL_MODE='NO_AUTO_VALUE_ON_ZERO';
SET AUTOCOMMIT=0;
START TRANSACTION;

-- Table structure for `events`
DROP TABLE IF EXISTS `events`;
CREATE TABLE `events` (
  `id` char(36) NOT NULL DEFAULT (uuid()),
  `name` varchar(200) NOT NULL,
  `date` date NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'Planned' COMMENT 'Planned, Active, Completed',
  `event_type` varchar(20) DEFAULT 'auto_assign' COMMENT 'auto_assign or self_select',
  `entry_code` varchar(20) DEFAULT NULL COMMENT 'Optional entry code for archer access (e.g., for QR codes)',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_events_date` (`date`),
  KEY `idx_events_status` (`status`),
  KEY `idx_events_entry_code` (`entry_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- No data in table `events`

-- Table structure for `rounds`
DROP TABLE IF EXISTS `rounds`;
CREATE TABLE `rounds` (
  `id` char(36) NOT NULL DEFAULT (uuid()),
  `event_id` char(36) DEFAULT NULL COMMENT 'Parent event (1 event = 4 division rounds)',
  `round_type` varchar(20) NOT NULL COMMENT 'R300 or R360',
  `division` varchar(10) NOT NULL COMMENT 'BVAR, BJV, GVAR, GJV',
  `gender` varchar(1) NOT NULL COMMENT 'M or F',
  `level` varchar(3) NOT NULL COMMENT 'VAR or JV',
  `date` date NOT NULL,
  `bale_number` int DEFAULT NULL COMMENT 'Deprecated - use round_archers.bale_number instead',
  `status` varchar(20) DEFAULT 'Created' COMMENT 'Created, Active, Completed',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_rounds_event` (`event_id`),
  KEY `idx_rounds_date` (`date`),
  KEY `idx_rounds_division` (`event_id`,`division`),
  KEY `idx_rounds_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- No data in table `rounds`

-- Table structure for `round_archers`
DROP TABLE IF EXISTS `round_archers`;
CREATE TABLE `round_archers` (
  `id` char(36) NOT NULL DEFAULT (uuid()),
  `round_id` char(36) NOT NULL COMMENT 'Division round this scorecard belongs to',
  `archer_id` char(36) DEFAULT NULL COMMENT 'Reference to archers table (optional)',
  `archer_name` varchar(200) NOT NULL COMMENT 'Denormalized for performance',
  `school` varchar(3) DEFAULT NULL COMMENT '3-letter school code',
  `level` varchar(3) DEFAULT NULL COMMENT 'VAR or JV',
  `gender` varchar(1) DEFAULT NULL COMMENT 'M or F',
  `target_assignment` varchar(2) DEFAULT NULL COMMENT 'A-H target letter',
  `target_size` int DEFAULT NULL COMMENT 'Target face size in cm (80 or 122)',
  `bale_number` int DEFAULT NULL COMMENT 'Assigned bale within event (continuous)',
  `completed` tinyint(1) DEFAULT '0' COMMENT 'Scorecard verified and submitted',
  `verified_at` timestamp NULL DEFAULT NULL COMMENT 'When verified',
  `verified_by` varchar(100) DEFAULT NULL COMMENT 'Who verified (device ID)',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ra_round` (`round_id`),
  KEY `idx_ra_bale` (`round_id`,`bale_number`),
  KEY `idx_ra_completed` (`round_id`,`completed`),
  CONSTRAINT `fk_ra_round` FOREIGN KEY (`round_id`) REFERENCES `rounds` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- No data in table `round_archers`

-- Table structure for `end_events`
DROP TABLE IF EXISTS `end_events`;
CREATE TABLE `end_events` (
  `id` char(36) NOT NULL DEFAULT (uuid()),
  `round_id` char(36) NOT NULL,
  `round_archer_id` char(36) NOT NULL,
  `end_number` int NOT NULL,
  `a1` varchar(3) DEFAULT NULL,
  `a2` varchar(3) DEFAULT NULL,
  `a3` varchar(3) DEFAULT NULL,
  `end_total` int DEFAULT NULL,
  `running_total` int DEFAULT NULL,
  `tens` int DEFAULT NULL,
  `xs` int DEFAULT NULL,
  `device_ts` datetime DEFAULT NULL,
  `server_ts` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ra_end` (`round_archer_id`,`end_number`),
  KEY `idx_ev_round` (`round_id`,`end_number`),
  KEY `idx_ev_ts` (`server_ts`),
  CONSTRAINT `fk_ev_ra` FOREIGN KEY (`round_archer_id`) REFERENCES `round_archers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ev_round` FOREIGN KEY (`round_id`) REFERENCES `rounds` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- No data in table `end_events`

-- Table structure for `archers`
DROP TABLE IF EXISTS `archers`;
CREATE TABLE `archers` (
  `id` char(36) NOT NULL DEFAULT (uuid()),
  `ext_id` varchar(128) DEFAULT NULL COMMENT 'External ID for sync with localStorage',
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `nickname` varchar(100) DEFAULT NULL,
  `photo_url` varchar(255) DEFAULT NULL,
  `school` varchar(3) NOT NULL COMMENT '1-3 letter school code (e.g., WIS, DVN)',
  `grade` varchar(4) DEFAULT NULL COMMENT '9,10,11,12,GRAD',
  `gender` varchar(1) NOT NULL COMMENT 'M or F',
  `level` varchar(3) NOT NULL COMMENT 'VAR, JV, or BEG',
  `faves` text COMMENT 'JSON / CSV list of friend UUIDs',
  `dom_eye` varchar(2) DEFAULT NULL COMMENT 'RT or LT',
  `dom_hand` varchar(2) DEFAULT NULL COMMENT 'RT or LT',
  `height_in` tinyint unsigned DEFAULT NULL COMMENT 'Height in inches',
  `wingspan_in` tinyint unsigned DEFAULT NULL COMMENT 'Wingspan in inches',
  `draw_length_sugg` decimal(5,2) DEFAULT NULL COMMENT 'Suggested draw length',
  `riser_height_in` decimal(5,2) DEFAULT NULL COMMENT 'Riser height in inches',
  `limb_length` varchar(2) DEFAULT NULL COMMENT 'S, M, or L',
  `limb_weight_lbs` decimal(5,2) DEFAULT NULL COMMENT 'Limb weight in pounds',
  `notes_gear` text,
  `notes_current` text,
  `notes_archive` text,
  `email` varchar(200) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `us_archery_id` varchar(20) DEFAULT NULL,
  `jv_pr` int DEFAULT NULL COMMENT 'Junior Varsity personal record',
  `var_pr` int DEFAULT NULL COMMENT 'Varsity personal record',
  `status` varchar(16) NOT NULL DEFAULT 'active' COMMENT 'active or inactive',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_archers_ext` (`ext_id`),
  KEY `idx_archers_name` (`last_name`,`first_name`),
  KEY `idx_archers_division` (`gender`,`level`),
  KEY `idx_archers_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- No data in table `archers`

SET FOREIGN_KEY_CHECKS=1;
COMMIT;
