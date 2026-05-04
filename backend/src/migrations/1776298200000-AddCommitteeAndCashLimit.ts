import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * G11 + G14 migration
 * - สร้างตาราง check_receive_committee (คณะกรรมการตรวจรับ)
 * - สร้างตาราง cash_reserve_limit (วงเงินสำรองจ่าย)
 *
 * หมายเหตุ: ต้อง run migration G15 (AddLoanColumnsToRequestWithdraw) ก่อน
 */
export class AddCommitteeAndCashLimit1776298200000
  implements MigrationInterface
{
  name = 'AddCommitteeAndCashLimit1776298200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // G11: คณะกรรมการตรวจรับพัสดุ/งานจ้าง
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`check_receive_committee\` (
        \`crc_id\`          INT           NOT NULL AUTO_INCREMENT,
        \`rw_id\`           INT           NOT NULL COMMENT 'FK → request_withdraw.rw_id',
        \`sc_id\`           INT           NOT NULL DEFAULT 0,
        \`member1_name\`    VARCHAR(200)  NULL,
        \`member1_position\` VARCHAR(200) NULL,
        \`member2_name\`    VARCHAR(200)  NULL,
        \`member2_position\` VARCHAR(200) NULL,
        \`member3_name\`    VARCHAR(200)  NULL,
        \`member3_position\` VARCHAR(200) NULL,
        \`up_by\`           INT           NOT NULL DEFAULT 0,
        \`del\`             INT           NOT NULL DEFAULT 0,
        \`create_date\`     DATETIME(6)   NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`update_date\`     DATETIME(6)   NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX \`UQ_committee_rw_id\` (\`rw_id\`),
        PRIMARY KEY (\`crc_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // G14: วงเงินสำรองจ่าย
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`cash_reserve_limit\` (
        \`crl_id\`       INT         NOT NULL AUTO_INCREMENT,
        \`sc_id\`        INT         NOT NULL,
        \`limit_amount\` FLOAT       NOT NULL DEFAULT 15000 COMMENT 'วงเงินสำรองจ่ายสูงสุด (บาท)',
        \`note\`         TEXT        NULL     COMMENT 'หมายเหตุ / อ้างอิงระเบียบ',
        \`up_by\`        INT         NOT NULL DEFAULT 0,
        \`create_date\`  DATETIME(6) NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`update_date\`  DATETIME(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX \`UQ_cash_limit_sc_id\` (\`sc_id\`),
        PRIMARY KEY (\`crl_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`cash_reserve_limit\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`check_receive_committee\``);
  }
}
