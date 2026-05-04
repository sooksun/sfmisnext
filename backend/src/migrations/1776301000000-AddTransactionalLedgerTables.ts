import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 3 P1 — G2, G4, G6, G8 — Transactional Ledger
 * G2: smp_deposit_entry          — สมุดคู่ฝากส่วนราชการผู้เบิก
 * G4: bank_ledger_entry          — ทะเบียนคุมเงินฝากธนาคาร (แยกรายบัญชี)
 * G6: bank_reconciliation        — งบเทียบยอดเงินฝากธนาคาร
 *     bank_reconciliation_item   — รายการปรับปรุงงบเทียบยอด
 * G8: fiscal_year_balance        — ยอดยกมาต้นปีงบประมาณ
 */
export class AddTransactionalLedgerTables1776301000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── G2: smp_deposit_entry ─────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`smp_deposit_entry\` (
        \`sde_id\`          INT NOT NULL AUTO_INCREMENT,
        \`sc_id\`           INT NOT NULL DEFAULT 0,
        \`sy_id\`           INT NOT NULL DEFAULT 0,
        \`budget_year\`     VARCHAR(10) NULL,
        \`entry_type\`      INT NOT NULL DEFAULT 1
                            COMMENT '1=ฝาก(รับจากสพป.)|2=ถอน(คืนสพป.)',
        \`doc_no\`          VARCHAR(50) NULL COMMENT 'เลขที่เอกสาร/เลขที่ใบนำฝาก',
        \`doc_date\`        DATE NULL,
        \`detail\`          TEXT NULL COMMENT 'รายการ',
        \`amount\`          FLOAT NOT NULL DEFAULT 0,
        \`money_type_id\`   INT NULL COMMENT 'ประเภทเงิน (bg_type_id)',
        \`money_type_name\` VARCHAR(200) NULL COMMENT 'snapshot ชื่อประเภทเงิน',
        \`note\`            TEXT NULL,
        \`up_by\`           INT NOT NULL DEFAULT 0,
        \`del\`             INT NOT NULL DEFAULT 0,
        \`create_date\`     DATETIME NULL,
        \`update_date\`     DATETIME NULL,
        PRIMARY KEY (\`sde_id\`),
        INDEX \`idx_sde_sc_sy_year\` (\`sc_id\`, \`sy_id\`, \`budget_year\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        COMMENT='สมุดคู่ฝากส่วนราชการผู้เบิก'
    `);

    // ── G4: bank_ledger_entry ─────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`bank_ledger_entry\` (
        \`ble_id\`        INT NOT NULL AUTO_INCREMENT,
        \`sc_id\`         INT NOT NULL DEFAULT 0,
        \`sy_id\`         INT NOT NULL DEFAULT 0,
        \`ba_id\`         INT NOT NULL DEFAULT 0 COMMENT 'FK bankaccount.ba_id',
        \`entry_type\`    INT NOT NULL DEFAULT 1 COMMENT '1=ฝาก|2=ถอน',
        \`doc_no\`        VARCHAR(50) NULL COMMENT 'เลขที่เอกสาร',
        \`entry_date\`    DATE NULL,
        \`detail\`        TEXT NULL COMMENT 'รายการ',
        \`amount\`        FLOAT NOT NULL DEFAULT 0,
        \`ref_type\`      VARCHAR(20) NULL COMMENT 'receipt|check|manual',
        \`ref_id\`        INT NULL,
        \`signer_id\`     INT NULL COMMENT 'admin_id ผู้ลงนาม',
        \`signer_name\`   VARCHAR(200) NULL COMMENT 'snapshot ชื่อผู้ลงนาม',
        \`note\`          TEXT NULL,
        \`up_by\`         INT NOT NULL DEFAULT 0,
        \`del\`           INT NOT NULL DEFAULT 0,
        \`create_date\`   DATETIME NULL,
        \`update_date\`   DATETIME NULL,
        PRIMARY KEY (\`ble_id\`),
        INDEX \`idx_ble_sc_sy_ba\` (\`sc_id\`, \`sy_id\`, \`ba_id\`),
        INDEX \`idx_ble_entry_date\` (\`entry_date\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        COMMENT='ทะเบียนคุมเงินฝากธนาคาร (แยกรายบัญชี)'
    `);

    // ── G6: bank_reconciliation ───────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`bank_reconciliation\` (
        \`br_id\`                    INT NOT NULL AUTO_INCREMENT,
        \`sc_id\`                    INT NOT NULL DEFAULT 0,
        \`ba_id\`                    INT NOT NULL DEFAULT 0 COMMENT 'FK bankaccount.ba_id',
        \`recon_month\`              VARCHAR(7) NULL COMMENT 'YYYY-MM',
        \`book_balance\`             FLOAT NOT NULL DEFAULT 0
                                     COMMENT 'ยอดตามสมุดบัญชีโรงเรียน',
        \`bank_statement_balance\`   FLOAT NOT NULL DEFAULT 0
                                     COMMENT 'ยอดตาม bank statement',
        \`adjustment_total\`         FLOAT NOT NULL DEFAULT 0
                                     COMMENT 'ยอดปรับปรุงสุทธิ',
        \`adjusted_book_balance\`    FLOAT NOT NULL DEFAULT 0
                                     COMMENT 'ยอดสมุดหลังปรับ = book + adjustment',
        \`difference\`               FLOAT NOT NULL DEFAULT 0
                                     COMMENT 'ผลต่าง (ควร = 0)',
        \`is_balanced\`              TINYINT NOT NULL DEFAULT 0,
        \`note\`                     TEXT NULL,
        \`signed_by\`                INT NULL,
        \`signed_name\`              VARCHAR(200) NULL,
        \`signed_at\`                DATETIME NULL,
        \`up_by\`                    INT NOT NULL DEFAULT 0,
        \`del\`                      INT NOT NULL DEFAULT 0,
        \`create_date\`              DATETIME NULL,
        \`update_date\`              DATETIME NULL,
        PRIMARY KEY (\`br_id\`),
        UNIQUE INDEX \`uniq_br_account_month\` (\`sc_id\`, \`ba_id\`, \`recon_month\`),
        INDEX \`idx_br_sc_ba\` (\`sc_id\`, \`ba_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        COMMENT='งบเทียบยอดเงินฝากธนาคาร (Bank Reconciliation)'
    `);

    // ── G6: bank_reconciliation_item ──────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`bank_reconciliation_item\` (
        \`bri_id\`      INT NOT NULL AUTO_INCREMENT,
        \`br_id\`       INT NOT NULL DEFAULT 0 COMMENT 'FK bank_reconciliation.br_id',
        \`item_type\`   INT NOT NULL DEFAULT 1
                        COMMENT '1=เช็คค้างขึ้น|2=เงินฝากระหว่างทาง|3=รายการอื่น',
        \`doc_ref\`     VARCHAR(50) NULL COMMENT 'เลขที่เช็ค/เอกสาร',
        \`detail\`      TEXT NULL,
        \`amount\`      FLOAT NOT NULL DEFAULT 0
                        COMMENT 'ค่าบวก=บวกเพิ่ม ค่าลบ=หักออก',
        \`up_by\`       INT NOT NULL DEFAULT 0,
        \`del\`         INT NOT NULL DEFAULT 0,
        \`create_date\` DATETIME NULL,
        \`update_date\` DATETIME NULL,
        PRIMARY KEY (\`bri_id\`),
        INDEX \`idx_bri_br_id\` (\`br_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        COMMENT='รายการปรับปรุงงบเทียบยอดเงินฝากธนาคาร'
    `);

    // ── G8: fiscal_year_balance ───────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`fiscal_year_balance\` (
        \`fyb_id\`            INT NOT NULL AUTO_INCREMENT,
        \`sc_id\`             INT NOT NULL DEFAULT 0,
        \`budget_year\`       VARCHAR(10) NULL COMMENT 'ปีงบประมาณที่ปิด เช่น 2568',
        \`money_type_id\`     INT NOT NULL DEFAULT 0,
        \`money_type_name\`   VARCHAR(200) NULL COMMENT 'snapshot ชื่อประเภทเงิน',
        \`cash_balance\`      FLOAT NOT NULL DEFAULT 0 COMMENT 'ยอดเงินสด ณ สิ้นปี',
        \`bank_balance\`      FLOAT NOT NULL DEFAULT 0 COMMENT 'ยอดเงินฝากธนาคาร ณ สิ้นปี',
        \`smp_balance\`       FLOAT NOT NULL DEFAULT 0 COMMENT 'ยอดเงินฝากสมุดคู่ฝาก ณ สิ้นปี',
        \`total_balance\`     FLOAT NOT NULL DEFAULT 0 COMMENT 'รวมทั้งหมด',
        \`closing_date\`      DATE NULL COMMENT 'วันที่ปิดปีงบประมาณ',
        \`closed_by\`         INT NULL,
        \`closed_by_name\`    VARCHAR(200) NULL,
        \`is_final\`          TINYINT NOT NULL DEFAULT 0 COMMENT 'ผอ. ยืนยันแล้ว',
        \`note\`              TEXT NULL,
        \`up_by\`             INT NOT NULL DEFAULT 0,
        \`del\`               INT NOT NULL DEFAULT 0,
        \`create_date\`       DATETIME NULL,
        \`update_date\`       DATETIME NULL,
        PRIMARY KEY (\`fyb_id\`),
        INDEX \`idx_fyb_sc_year\` (\`sc_id\`, \`budget_year\`),
        INDEX \`idx_fyb_money_type\` (\`sc_id\`, \`budget_year\`, \`money_type_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        COMMENT='ยอดยกมาต้นปีงบประมาณ (Fiscal Year Carry Forward)'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`fiscal_year_balance\``);
    await queryRunner.query(
      `DROP TABLE IF EXISTS \`bank_reconciliation_item\``,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS \`bank_reconciliation\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`bank_ledger_entry\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`smp_deposit_entry\``);
  }
}
