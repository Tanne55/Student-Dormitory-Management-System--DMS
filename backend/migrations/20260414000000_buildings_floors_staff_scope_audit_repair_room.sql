-- =============================================================================
-- Migration: buildings, floors, rooms.floor_id, staff_floor_scopes, audit_logs,
--             repair_requests.room_id
-- MySQL 8.x InnoDB utf8mb4
-- =============================================================================

-- ----- buildings -----
CREATE TABLE IF NOT EXISTS `buildings` (
  `id` CHAR(36) NOT NULL,
  `code` VARCHAR(50) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `address` VARCHAR(500) NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_buildings_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----- floors -----
CREATE TABLE IF NOT EXISTS `floors` (
  `id` CHAR(36) NOT NULL,
  `building_id` CHAR(36) NOT NULL,
  `floor_number` INT NOT NULL,
  `label` VARCHAR(100) NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_floors_building_floor_number` (`building_id`, `floor_number`),
  CONSTRAINT `fk_floors_building` FOREIGN KEY (`building_id`) REFERENCES `buildings` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----- seed default building + floor (id cố định để backfill rooms) -----
SET @b_id := '00000000-0000-4000-8000-000000000001';
SET @f_id := '00000000-0000-4000-8000-000000000002';

INSERT IGNORE INTO `buildings` (`id`, `code`, `name`, `address`, `created_at`, `updated_at`)
VALUES (@b_id, 'DEFAULT', 'Tòa mặc định', NULL, NOW(6), NOW(6));

INSERT IGNORE INTO `floors` (`id`, `building_id`, `floor_number`, `label`, `created_at`, `updated_at`)
VALUES (@f_id, @b_id, 1, 'Tầng 1', NOW(6), NOW(6));

-- ----- rooms: thêm floor_id, bỏ unique room_number, unique (floor_id, room_number) -----
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'rooms' AND COLUMN_NAME = 'floor_id'
);
SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE `rooms` ADD COLUMN `floor_id` CHAR(36) NULL AFTER `id`',
  'SELECT ''SKIP: rooms.floor_id exists'' AS note'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE `rooms` SET `floor_id` = @f_id WHERE `floor_id` IS NULL;

-- NOT NULL sau backfill
ALTER TABLE `rooms` MODIFY COLUMN `floor_id` CHAR(36) NOT NULL;

-- Xóa unique cũ trên room_number nếu có (tên index có thể khác theo DB — chỉnh tay nếu lỗi)
SET @idx := (
  SELECT INDEX_NAME FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'rooms' AND COLUMN_NAME = 'room_number'
    AND NON_UNIQUE = 0 AND INDEX_NAME <> 'UQ_rooms_floor_room_number'
  LIMIT 1
);
SET @dropsql := IF(
  @idx IS NOT NULL,
  CONCAT('ALTER TABLE `rooms` DROP INDEX `', @idx, '`'),
  'SELECT ''SKIP: no extra unique on room_number'' AS note'
);
PREPARE stmt2 FROM @dropsql;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

-- Unique theo tầng + số phòng
SET @uq_exists := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'rooms' AND INDEX_NAME = 'UQ_rooms_floor_room_number'
);
SET @sqluq := IF(
  @uq_exists = 0,
  'ALTER TABLE `rooms` ADD UNIQUE KEY `UQ_rooms_floor_room_number` (`floor_id`, `room_number`)',
  'SELECT ''SKIP: UQ_rooms_floor_room_number exists'' AS note'
);
PREPARE stmt3 FROM @sqluq;
EXECUTE stmt3;
DEALLOCATE PREPARE stmt3;

ALTER TABLE `rooms`
  ADD CONSTRAINT `fk_rooms_floor` FOREIGN KEY (`floor_id`) REFERENCES `floors` (`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- ----- staff_floor_scopes -----
CREATE TABLE IF NOT EXISTS `staff_floor_scopes` (
  `id` CHAR(36) NOT NULL,
  `staff_id` CHAR(36) NOT NULL,
  `floor_id` CHAR(36) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_staff_floor_scope` (`staff_id`, `floor_id`),
  KEY `idx_staff_floor_scopes_floor` (`floor_id`),
  CONSTRAINT `fk_sfs_staff` FOREIGN KEY (`staff_id`) REFERENCES `staffs` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_sfs_floor` FOREIGN KEY (`floor_id`) REFERENCES `floors` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----- audit_logs -----
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` CHAR(36) NOT NULL,
  `actor_account_id` INT NULL,
  `action` VARCHAR(120) NOT NULL,
  `entity_type` VARCHAR(80) NOT NULL,
  `entity_id` VARCHAR(64) NOT NULL,
  `metadata` JSON NULL,
  `ip` VARCHAR(45) NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_audit_entity` (`entity_type`, `entity_id`),
  KEY `idx_audit_actor` (`actor_account_id`),
  KEY `idx_audit_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----- repair_requests.room_id -----
SET @rcol := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'repair_requests' AND COLUMN_NAME = 'room_id'
);
SET @sqlr := IF(
  @rcol = 0,
  'ALTER TABLE `repair_requests` ADD COLUMN `room_id` CHAR(36) NULL AFTER `student_code`',
  'SELECT ''SKIP: repair_requests.room_id exists'' AS note'
);
PREPARE stmtr FROM @sqlr;
EXECUTE stmtr;
DEALLOCATE PREPARE stmtr;
