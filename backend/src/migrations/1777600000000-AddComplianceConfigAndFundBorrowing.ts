import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Compliance upgrade (การเงิน + พัสดุ ให้ตรงระเบียบราชการ)
 *  - regulatory_threshold  : เกณฑ์/วงเงินตามระเบียบที่ตั้งค่าได้ (Phase 0)
 *  - fund_borrowing        : การยืมเงินข้ามประเภทเงิน (Phase 2.2)
 *  - sup_contract_security.smp_deposit_id : ลิงก์หลักประกันเงินสด → นำฝาก สพป. (Phase 1.5)
 */
export class AddComplianceConfigAndFundBorrowing1777600000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Phase 0: regulatory_threshold ─────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`regulatory_threshold\` (
        \`rt_id\`        INT NOT NULL AUTO_INCREMENT,
        \`sc_id\`        INT NOT NULL DEFAULT 0 COMMENT '0=global override',
        \`config_key\`   VARCHAR(64) NOT NULL,
        \`value\`        FLOAT NOT NULL DEFAULT 0 COMMENT 'ค่าเกณฑ์',
        \`unit\`         VARCHAR(20) NULL COMMENT 'หน่วย',
        \`up_by\`        INT NOT NULL DEFAULT 0,
        \`del\`          INT NOT NULL DEFAULT 0,
        \`create_date\`  DATETIME NULL,
        \`update_date\`  DATETIME NULL,
        PRIMARY KEY (\`rt_id\`),
        INDEX \`idx_rt_sc_key_del\` (\`sc_id\`, \`config_key\`, \`del\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        COMMENT='เกณฑ์/วงเงินตามระเบียบที่ตั้งค่าได้รายโรงเรียน'
    `);

    // ── Phase 2.2: fund_borrowing ─────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`fund_borrowing\` (
        \`fb_id\`                 INT NOT NULL AUTO_INCREMENT,
        \`sc_id\`                 INT NOT NULL DEFAULT 0,
        \`sy_id\`                 INT NOT NULL DEFAULT 0,
        \`budget_year\`           VARCHAR(10) NULL,
        \`from_money_type_id\`    INT NOT NULL COMMENT 'ประเภทเงินต้นทาง (ผู้ให้ยืม)',
        \`from_money_type_name\`  VARCHAR(200) NULL,
        \`to_money_type_id\`      INT NOT NULL COMMENT 'ประเภทเงินปลายทาง (ผู้ยืม)',
        \`to_money_type_name\`    VARCHAR(200) NULL,
        \`amount\`                FLOAT NOT NULL DEFAULT 0,
        \`borrow_date\`           DATE NULL,
        \`repay_date\`            DATE NULL,
        \`purpose\`               TEXT NULL,
        \`status\`                INT NOT NULL DEFAULT 1
                                   COMMENT '1=ค้างคืน|2=คืนแล้ว|3=ยกเลิก',
        \`ft_out_id\`             INT NULL,
        \`ft_in_id\`              INT NULL,
        \`note\`                  TEXT NULL,
        \`up_by\`                 INT NOT NULL DEFAULT 0,
        \`del\`                   INT NOT NULL DEFAULT 0,
        \`create_date\`           DATETIME NULL,
        \`update_date\`           DATETIME NULL,
        PRIMARY KEY (\`fb_id\`),
        INDEX \`idx_fb_sc_sy_del\` (\`sc_id\`, \`sy_id\`, \`del\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        COMMENT='การยืมเงินข้ามประเภทเงินภายในโรงเรียน'
    `);

    // ── Phase 1.5: sup_contract_security.smp_deposit_id ───────────────────────
    const col = await queryRunner.query(`
      SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'sup_contract_security'
        AND COLUMN_NAME = 'smp_deposit_id'
    `);
    if (Number(col?.[0]?.c ?? 0) === 0) {
      await queryRunner.query(`
        ALTER TABLE \`sup_contract_security\`
          ADD COLUMN \`smp_deposit_id\` INT NULL
          COMMENT 'อ้างอิงรายการนำฝาก สพป. (เงินประกันสัญญาที่เป็นเงินสด)'
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const col = await queryRunner.query(`
      SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'sup_contract_security'
        AND COLUMN_NAME = 'smp_deposit_id'
    `);
    if (Number(col?.[0]?.c ?? 0) > 0) {
      await queryRunner.query(
        `ALTER TABLE \`sup_contract_security\` DROP COLUMN \`smp_deposit_id\``,
      );
    }
    await queryRunner.query(`DROP TABLE IF EXISTS \`fund_borrowing\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`regulatory_threshold\``);
  }
}
