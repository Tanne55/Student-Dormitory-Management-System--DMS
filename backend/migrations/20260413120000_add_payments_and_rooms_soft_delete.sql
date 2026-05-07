-- =============================================================================
-- Migration: bảng payments + soft-delete cho phòng (rooms.deleted_at)
-- CSDL mục tiêu: MySQL 8.x, InnoDB, utf8mb4
-- Chạy thủ công (hoặc qua pipeline) sau khi đã có bảng invoices.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Cột soft-delete cho phòng (TypeORM @DeleteDateColumn trên Room)
-- Idempotent: chỉ ALTER khi cột chưa tồn tại.
-- -----------------------------------------------------------------------------
SET @db := DATABASE();
SET @exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'rooms' AND COLUMN_NAME = 'deleted_at'
);
SET @sql := IF(
  @exists = 0,
  'ALTER TABLE `rooms` ADD COLUMN `deleted_at` DATETIME(6) NULL DEFAULT NULL COMMENT ''Soft delete (TypeORM DeleteDateColumn)'' AFTER `updated_at`',
  'SELECT ''SKIP: rooms.deleted_at already exists'' AS migration_note'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- -----------------------------------------------------------------------------
-- 2) Bảng payments (khớp entity Payment: FK invoice, amount, method, status, ...)
-- Idempotent: chỉ tạo bảng khi chưa có.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `payments` (
  `id` CHAR(36) NOT NULL,
  `invoice_id` CHAR(36) NOT NULL,
  `amount` INT NOT NULL,
  `method` ENUM('CASH', 'BANK_TRANSFER', 'OTHER') NOT NULL DEFAULT 'CASH',
  `status` ENUM('SUCCESS', 'FAILED') NOT NULL DEFAULT 'SUCCESS',
  `payer_student_code` VARCHAR(50) NULL,
  `confirmed_by_account_id` INT NULL,
  `paid_at` DATETIME(6) NOT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_payments_invoice_id` (`invoice_id`),
  CONSTRAINT `fk_payments_invoice`
    FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Lịch sử thanh toán theo hóa đơn (full payment / invoice)';
