import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * เชื่อมใบสำคัญจ่าย (request_withdraw) กับเอกสารต้นเรื่องที่ ผอ. อนุมัติแล้ว
 *  - tr_id : ใบขอเบิกค่าเดินทาง (travel_reimbursement)
 *  - la_id : ใบยืมเงิน (loan_agreement)
 *  (order_id สำหรับใบจัดซื้อ/พัสดุ มีอยู่แล้ว)
 */
export class AddInvoiceSourceDocLinks1781000000000
  implements MigrationInterface
{
  private readonly cols = ['tr_id', 'la_id'];

  private async existing(queryRunner: QueryRunner): Promise<Set<string>> {
    const names = this.cols.map((c) => `'${c}'`).join(',');
    const rows = await queryRunner.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'request_withdraw'
        AND COLUMN_NAME IN (${names})
    `);
    return new Set(
      (rows as Array<{ COLUMN_NAME: string }>).map((r) => r.COLUMN_NAME),
    );
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    const have = await this.existing(queryRunner);
    if (!have.has('tr_id')) {
      await queryRunner.query(
        `ALTER TABLE \`request_withdraw\` ADD COLUMN \`tr_id\` INT NOT NULL DEFAULT 0 COMMENT 'FK travel_reimbursement.tr_id'`,
      );
    }
    if (!have.has('la_id')) {
      await queryRunner.query(
        `ALTER TABLE \`request_withdraw\` ADD COLUMN \`la_id\` INT NOT NULL DEFAULT 0 COMMENT 'FK loan_agreement.la_id'`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const have = await this.existing(queryRunner);
    if (have.has('la_id'))
      await queryRunner.query(
        `ALTER TABLE \`request_withdraw\` DROP COLUMN \`la_id\``,
      );
    if (have.has('tr_id'))
      await queryRunner.query(
        `ALTER TABLE \`request_withdraw\` DROP COLUMN \`tr_id\``,
      );
  }
}
