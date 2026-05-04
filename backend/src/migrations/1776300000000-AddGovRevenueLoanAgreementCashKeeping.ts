import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 2 P1 — G1, G3, G5
 * G1: gov_revenue_entry       — ทะเบียนคุมการรับและนำส่งเงินรายได้แผ่นดิน
 * G3: loan_agreement          — ทะเบียนคุมสัญญายืมเงิน (บย.)
 *     loan_return_evidence    — ใบรับใบสำคัญ
 * G5: cash_keeping_record     — บันทึกการรับเงินเพื่อเก็บรักษา
 */
export class AddGovRevenueLoanAgreementCashKeeping1776300000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── G1: gov_revenue_entry ──────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`gov_revenue_entry\` (
        \`gre_id\`      INT NOT NULL AUTO_INCREMENT,
        \`sc_id\`        INT NOT NULL DEFAULT 0,
        \`sy_id\`        INT NOT NULL DEFAULT 0,
        \`budget_year\`  VARCHAR(10) NULL,
        \`revenue_type\` INT NOT NULL DEFAULT 1
                          COMMENT '1=ดอกเบี้ยอุดหนุน|2=ดอกเบี้ยอาหาร|3=เหลือจ่าย2ปี|4=ค่าธรรมเนียม/อื่น',
        \`entry_type\`   INT NOT NULL DEFAULT 1
                          COMMENT '1=รับเข้า|2=นำส่งคลัง',
        \`doc_no\`       VARCHAR(50) NULL COMMENT 'เลขที่เอกสาร',
        \`doc_date\`     DATE NULL,
        \`detail\`       TEXT NULL COMMENT 'รายการ',
        \`amount\`       FLOAT NOT NULL DEFAULT 0,
        \`note\`         TEXT NULL,
        \`up_by\`        INT NOT NULL DEFAULT 0,
        \`del\`          INT NOT NULL DEFAULT 0,
        \`create_date\`  DATETIME NULL,
        \`update_date\`  DATETIME NULL,
        PRIMARY KEY (\`gre_id\`),
        INDEX \`idx_gre_sc_sy_year_type\` (\`sc_id\`, \`sy_id\`, \`budget_year\`, \`revenue_type\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        COMMENT='ทะเบียนคุมการรับและนำส่งเงินรายได้แผ่นดิน'
    `);

    // ── G3: loan_agreement ─────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`loan_agreement\` (
        \`la_id\`                  INT NOT NULL AUTO_INCREMENT,
        \`sc_id\`                  INT NOT NULL DEFAULT 0,
        \`sy_id\`                  INT NOT NULL DEFAULT 0,
        \`budget_year\`            VARCHAR(10) NULL,
        \`la_seq\`                 INT NOT NULL DEFAULT 1
                                   COMMENT 'running number per sc_id+budget_year',
        \`la_no\`                  VARCHAR(20) NULL COMMENT 'เลขที่สัญญา เช่น 1/2568',
        \`borrower_id\`            INT NOT NULL DEFAULT 0,
        \`borrower_name\`          VARCHAR(200) NULL COMMENT 'snapshot ชื่อ-สกุล',
        \`borrower_position\`      VARCHAR(200) NULL COMMENT 'snapshot ตำแหน่ง',
        \`money_type_id\`          INT NOT NULL DEFAULT 0,
        \`money_type_name\`        VARCHAR(200) NULL COMMENT 'snapshot ชื่อประเภทเงิน',
        \`purpose\`                TEXT NULL COMMENT 'วัตถุประสงค์การยืม',
        \`amount\`                 FLOAT NOT NULL DEFAULT 0,
        \`borrow_date\`            DATE NULL,
        \`loan_category\`          INT NOT NULL DEFAULT 2
                                   COMMENT '1=เดินทาง(15วัน)|2=โครงการ(30วัน)|3=กิจกรรม(30วัน)|4=อื่น(30วัน)',
        \`due_date\`               DATE NULL COMMENT 'กำหนดส่งคืน (auto-calculated)',
        \`returned_date\`          DATE NULL,
        \`return_cash\`            FLOAT NULL DEFAULT 0,
        \`return_voucher_amount\`  FLOAT NULL DEFAULT 0 COMMENT 'ใบสำคัญ',
        \`rw_id\`                  INT NULL COMMENT 'FK request_withdraw.rw_id (optional)',
        \`status\`                 INT NOT NULL DEFAULT 1
                                   COMMENT '1=ค้างชำระ|2=คืนแล้ว|3=ยกเลิก',
        \`note\`                   TEXT NULL,
        \`up_by\`                  INT NOT NULL DEFAULT 0,
        \`del\`                    INT NOT NULL DEFAULT 0,
        \`create_date\`            DATETIME NULL,
        \`update_date\`            DATETIME NULL,
        PRIMARY KEY (\`la_id\`),
        INDEX \`idx_la_sc_sy_year\` (\`sc_id\`, \`sy_id\`, \`budget_year\`),
        INDEX \`idx_la_status\`     (\`status\`, \`del\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        COMMENT='ทะเบียนคุมสัญญายืมเงิน (บย.)'
    `);

    // ── G3: loan_return_evidence ───────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`loan_return_evidence\` (
        \`lre_id\`          INT NOT NULL AUTO_INCREMENT,
        \`la_id\`           INT NOT NULL DEFAULT 0 COMMENT 'FK loan_agreement.la_id',
        \`evidence_no\`     VARCHAR(50) NULL COMMENT 'เลขที่ใบรับใบสำคัญ',
        \`evidence_date\`   DATE NULL,
        \`cash_amount\`     FLOAT NOT NULL DEFAULT 0 COMMENT 'เงินสดคืน',
        \`voucher_amount\`  FLOAT NOT NULL DEFAULT 0 COMMENT 'ใบสำคัญคืน',
        \`note\`            TEXT NULL,
        \`up_by\`           INT NOT NULL DEFAULT 0,
        \`del\`             INT NOT NULL DEFAULT 0,
        \`create_date\`     DATETIME NULL,
        \`update_date\`     DATETIME NULL,
        PRIMARY KEY (\`lre_id\`),
        INDEX \`idx_lre_la_id\` (\`la_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        COMMENT='ใบรับใบสำคัญ — หลักฐานการชดใช้เงินยืม'
    `);

    // ── G5: cash_keeping_record ────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`cash_keeping_record\` (
        \`ckr_id\`             INT NOT NULL AUTO_INCREMENT,
        \`sc_id\`              INT NOT NULL DEFAULT 0,
        \`sy_id\`              INT NOT NULL DEFAULT 0,
        \`record_date\`        DATE NULL COMMENT 'วันที่รับเก็บรักษา',
        \`amount\`             FLOAT NOT NULL DEFAULT 0,
        \`money_detail\`       TEXT NULL COMMENT 'รายการเงินที่รับเก็บ',
        \`sender_id\`          INT NOT NULL DEFAULT 0,
        \`sender_name\`        VARCHAR(200) NULL COMMENT 'snapshot ชื่อผู้ส่ง',
        \`sender_position\`    VARCHAR(200) NULL,
        \`receiver_id\`        INT NOT NULL DEFAULT 0,
        \`receiver_name\`      VARCHAR(200) NULL COMMENT 'snapshot ชื่อผอ.',
        \`receiver_position\`  VARCHAR(200) NULL,
        \`note\`               TEXT NULL,
        \`status\`             INT NOT NULL DEFAULT 1
                               COMMENT '1=รับเก็บรักษา|2=ส่งคืนแล้ว',
        \`returned_date\`      DATE NULL COMMENT 'วันที่ส่งคืน',
        \`returned_amount\`    FLOAT NULL,
        \`return_note\`        TEXT NULL,
        \`up_by\`              INT NOT NULL DEFAULT 0,
        \`del\`                INT NOT NULL DEFAULT 0,
        \`create_date\`        DATETIME NULL,
        \`update_date\`        DATETIME NULL,
        PRIMARY KEY (\`ckr_id\`),
        INDEX \`idx_ckr_sc_sy\` (\`sc_id\`, \`sy_id\`),
        INDEX \`idx_ckr_status\` (\`status\`, \`del\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        COMMENT='บันทึกการรับเงินเพื่อเก็บรักษา (กรณีโรงเรียนไม่มีตู้นิรภัย)'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`cash_keeping_record\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`loan_return_evidence\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`loan_agreement\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`gov_revenue_entry\``);
  }
}
