import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * สร้างตาราง cash_keeping_committee — กรรมการเก็บรักษาเงิน / ผู้ตรวจสอบประจำวัน (ตย.41/42)
 *  - ใช้เติมรายชื่อกรรมการในรายงานเงินคงเหลือประจำวัน (ตย.19) และพิมพ์คำสั่งแต่งตั้ง
 */
export class CreateCashKeepingCommittee1784400000000
  implements MigrationInterface
{
  private async exists(queryRunner: QueryRunner): Promise<boolean> {
    const rows = (await queryRunner.query(`
      SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cash_keeping_committee'
    `)) as Array<{ TABLE_NAME: string }>;
    return rows.length > 0;
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (await this.exists(queryRunner)) return;
    await queryRunner.query(`
      CREATE TABLE \`cash_keeping_committee\` (
        \`ckc_id\` INT NOT NULL AUTO_INCREMENT,
        \`sc_id\` INT NOT NULL DEFAULT 0,
        \`role\` VARCHAR(16) NOT NULL DEFAULT 'keeper' COMMENT 'keeper|auditor',
        \`seq\` INT NOT NULL DEFAULT 1,
        \`name\` VARCHAR(200) NOT NULL,
        \`position\` VARCHAR(200) NULL,
        \`order_no\` VARCHAR(50) NULL,
        \`order_date\` DATE NULL,
        \`up_by\` INT NOT NULL DEFAULT 0,
        \`del\` INT NOT NULL DEFAULT 0,
        \`create_date\` DATETIME NULL,
        \`update_date\` DATETIME NULL,
        PRIMARY KEY (\`ckc_id\`),
        INDEX \`IDX_cash_keeping_committee_sc_del\` (\`sc_id\`, \`del\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await this.exists(queryRunner)) {
      await queryRunner.query(`DROP TABLE \`cash_keeping_committee\``);
    }
  }
}
