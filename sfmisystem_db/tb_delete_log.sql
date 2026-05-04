-- tb_delete_log: audit trail สำหรับการลบ (soft-delete / hard-delete)
-- synchronize ใน dev จะสร้างให้อัตโนมัติ — ไฟล์นี้ใช้ตอน production ที่ migrationsRun หรือ manual run

CREATE TABLE IF NOT EXISTS `tb_delete_log` (
  `log_id`     INT NOT NULL AUTO_INCREMENT,
  `table_name` VARCHAR(100) NOT NULL,
  `row_id`     INT NOT NULL,
  `reason`     TEXT NULL,
  `snapshot`   LONGTEXT NULL,
  `sc_id`      INT NULL,
  `deleted_by` VARCHAR(100) NULL,
  `deleted_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`log_id`),
  INDEX `idx_tb_delete_log_table_row` (`table_name`, `row_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
