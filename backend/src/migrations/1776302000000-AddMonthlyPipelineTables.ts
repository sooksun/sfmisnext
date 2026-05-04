import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 4 P2 — Monthly Pipeline
 * G9:  document_counter      — เลขที่เอกสารอัตโนมัติ (บค. / บจ. / บย. / บง.)
 * G12: monthly_submission    — รายงานส่งสพป.ประจำเดือน
 * G16: receipt_book          — ทะเบียนสมุดใบเสร็จรับเงิน (lifecycle: ใช้ → หมด → เลิก)
 *
 * G13 (year-end-report) ไม่มีตารางใหม่ — aggregate จาก Receipt / PlnReceive / BudgetIncomeType
 */
export class AddMonthlyPipelineTables1776302000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── G9: document_counter ──────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`document_counter\` (
        \`dc_id\`        INT NOT NULL AUTO_INCREMENT,
        \`sc_id\`        INT NOT NULL DEFAULT 0,
        \`budget_year\`  VARCHAR(10) NULL,
        \`doc_type\`     VARCHAR(10) NULL
                          COMMENT 'BC=บค.|BJ=บจ.|BY=บย.|BG=บง.',
        \`last_no\`      INT NOT NULL DEFAULT 0,
        \`update_date\`  DATETIME NULL,
        PRIMARY KEY (\`dc_id\`),
        UNIQUE INDEX \`uniq_dc_sc_year_type\` (\`sc_id\`, \`budget_year\`, \`doc_type\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        COMMENT='เลขที่เอกสารอัตโนมัติ — atomic counter per school + year + type'
    `);

    // ── G12: monthly_submission ───────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`monthly_submission\` (
        \`ms_id\`               INT NOT NULL AUTO_INCREMENT,
        \`sc_id\`               INT NOT NULL DEFAULT 0,
        \`sy_id\`               INT NOT NULL DEFAULT 0,
        \`submit_month\`        VARCHAR(7) NULL
                                 COMMENT 'YYYY-MM เช่น 2568-10',
        \`status\`              INT NOT NULL DEFAULT 1
                                 COMMENT '1=ร่าง|2=ส่งแล้ว|3=ยืนยัน',
        \`checklist\`           TEXT NULL
                                 COMMENT 'JSON array [{id,label,checked}]',
        \`submitted_at\`        DATETIME NULL,
        \`submitted_by\`        INT NULL,
        \`submitted_by_name\`   VARCHAR(200) NULL,
        \`note\`                TEXT NULL,
        \`up_by\`               INT NOT NULL DEFAULT 0,
        \`del\`                 INT NOT NULL DEFAULT 0,
        \`create_date\`         DATETIME NULL,
        \`update_date\`         DATETIME NULL,
        PRIMARY KEY (\`ms_id\`),
        UNIQUE INDEX \`uniq_ms_sc_month\` (\`sc_id\`, \`submit_month\`),
        INDEX \`idx_ms_sc_sy\`   (\`sc_id\`, \`sy_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        COMMENT='รายงานส่งสพป.ประจำเดือน — checklist + status workflow'
    `);

    // ── G16: receipt_book ─────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`receipt_book\` (
        \`rb_id\`           INT NOT NULL AUTO_INCREMENT,
        \`sc_id\`           INT NOT NULL DEFAULT 0,
        \`sy_id\`           INT NOT NULL DEFAULT 0,
        \`budget_year\`     VARCHAR(10) NULL,
        \`book_code\`       VARCHAR(50) NULL   COMMENT 'เล่มที่ / รหัสเล่ม',
        \`from_no\`         INT NOT NULL DEFAULT 1,
        \`to_no\`           INT NOT NULL DEFAULT 50,
        \`current_no\`      INT NOT NULL DEFAULT 1,
        \`status\`          INT NOT NULL DEFAULT 1
                             COMMENT '1=กำลังใช้|2=หมดอายุ|3=เลิกใช้(void)',
        \`opened_date\`     DATE NULL,
        \`closed_date\`     DATE NULL,
        \`voided_date\`     DATE NULL,
        \`voided_by\`       INT NULL,
        \`voided_by_name\`  VARCHAR(200) NULL,
        \`void_reason\`     TEXT NULL,
        \`note\`            TEXT NULL,
        \`up_by\`           INT NOT NULL DEFAULT 0,
        \`del\`             INT NOT NULL DEFAULT 0,
        \`create_date\`     DATETIME NULL,
        \`update_date\`     DATETIME NULL,
        PRIMARY KEY (\`rb_id\`),
        INDEX \`idx_rb_sc_sy_year\` (\`sc_id\`, \`sy_id\`, \`budget_year\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        COMMENT='ทะเบียนสมุดใบเสร็จรับเงิน — lifecycle: กำลังใช้→หมดอายุ→เลิกใช้'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`receipt_book\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`monthly_submission\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`document_counter\``);
  }
}
