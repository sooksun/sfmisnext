import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * เพิ่มคอลัมน์ ba_id ใน request_withdraw — บัญชีธนาคารที่สั่งจ่ายเช็ค/โอน
 * ใช้ auto-sync รายการถอนเข้าทะเบียนคุมเงินฝากธนาคาร (bank_ledger_entry) ตอนออกเช็ค
 */
export class AddBaIdToRequestWithdraw1786000000000
  implements MigrationInterface
{
  private async columnExists(queryRunner: QueryRunner): Promise<boolean> {
    const rows = (await queryRunner.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'request_withdraw'
         AND COLUMN_NAME = 'ba_id' LIMIT 1`,
    )) as Array<{ COLUMN_NAME: string }>;
    return rows.length > 0;
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (await this.columnExists(queryRunner)) return;
    await queryRunner.query(
      `ALTER TABLE \`request_withdraw\`
       ADD COLUMN \`ba_id\` INT NULL
       COMMENT 'บัญชีธนาคารที่สั่งจ่าย (เช็ค/โอน) — auto-sync ทะเบียนคุมเงินฝากธนาคาร'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (!(await this.columnExists(queryRunner))) return;
    await queryRunner.query(
      `ALTER TABLE \`request_withdraw\` DROP COLUMN \`ba_id\``,
    );
  }
}
