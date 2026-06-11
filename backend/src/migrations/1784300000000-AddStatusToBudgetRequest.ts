import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * เพิ่มสถานะเอกสาร + วันที่โอนเงิน ในทะเบียนคุมหลักฐานขอเบิก (budget_request)
 *  - status: 0=รอส่งเบิก 1=ส่งเบิก 2=โอนเงินแล้ว 3=ยกเลิก
 *  - paid_date: วันที่ สพป. โอนเงินให้เจ้าหนี้
 *  - backfill: รายการที่มี send_date อยู่แล้ว → ตั้ง status=1 (ส่งเบิก)
 */
export class AddStatusToBudgetRequest1784300000000
  implements MigrationInterface
{
  private async hasColumn(
    queryRunner: QueryRunner,
    column: string,
  ): Promise<boolean> {
    const rows = (await queryRunner.query(
      `
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'budget_request'
        AND COLUMN_NAME = ?
    `,
      [column],
    )) as Array<{ COLUMN_NAME: string }>;
    return rows.length > 0;
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await this.hasColumn(queryRunner, 'status'))) {
      await queryRunner.query(
        `ALTER TABLE \`budget_request\` ADD COLUMN \`status\` INT NOT NULL DEFAULT 0 COMMENT '0=รอส่งเบิก|1=ส่งเบิก|2=โอนเงินแล้ว|3=ยกเลิก'`,
      );
      // backfill: รายการที่ส่ง สพป. แล้ว (มี send_date) ถือว่า "ส่งเบิก"
      await queryRunner.query(
        `UPDATE \`budget_request\` SET \`status\` = 1 WHERE \`send_date\` IS NOT NULL AND \`del\` = 0`,
      );
    }
    if (!(await this.hasColumn(queryRunner, 'paid_date'))) {
      await queryRunner.query(
        `ALTER TABLE \`budget_request\` ADD COLUMN \`paid_date\` DATE NULL COMMENT 'วันที่ สพป. โอนเงินให้เจ้าหนี้'`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await this.hasColumn(queryRunner, 'paid_date')) {
      await queryRunner.query(
        `ALTER TABLE \`budget_request\` DROP COLUMN \`paid_date\``,
      );
    }
    if (await this.hasColumn(queryRunner, 'status')) {
      await queryRunner.query(
        `ALTER TABLE \`budget_request\` DROP COLUMN \`status\``,
      );
    }
  }
}
