import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * เพิ่มคอลัมน์รองรับ "เงินยืม" ในทะเบียนคุมเงินนอกงบประมาณ
 *  - register_kind : ชนิดรายการพิเศษสำหรับทะเบียน (null = ปกติ)
 *      lend          = จ่ายเงินยืม (ลงช่อง "ลูกหนี้")
 *      clear_voucher = ส่งใช้ด้วยใบสำคัญ (ลูกหนี้− / ใบสำคัญ+ ; ไม่กระทบยอดเงิน)
 *      return_cash   = คืนเงินสด (รับ+ / ลูกหนี้− ; เงินสดในมือ+)
 *      deposit       = นำเงินสดฝากธนาคาร (เงินสด− / เงินฝากธนาคาร+)
 *  - la_id  : อ้างสัญญายืมเงิน (loan_agreement.la_id) เพื่อ trace
 *  - ref_no : เลขที่เอกสารของรายการที่ไม่มี pln_receive/request_withdraw
 *             (เช่น บร. คืนเงินสด, Pay-in นำฝาก)
 */
export class AddRegisterKindToFinancialTransactions1783000000000
  implements MigrationInterface
{
  private readonly cols = ['register_kind', 'la_id', 'ref_no'];

  private async existing(queryRunner: QueryRunner): Promise<Set<string>> {
    const names = this.cols.map((c) => `'${c}'`).join(',');
    const rows = (await queryRunner.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'financial_transactions'
        AND COLUMN_NAME IN (${names})
    `)) as Array<{ COLUMN_NAME: string }>;
    return new Set(rows.map((r) => r.COLUMN_NAME));
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    const have = await this.existing(queryRunner);
    if (!have.has('register_kind')) {
      await queryRunner.query(
        `ALTER TABLE \`financial_transactions\` ADD COLUMN \`register_kind\` VARCHAR(20) NULL COMMENT 'lend|clear_voucher|return_cash|deposit (null=ปกติ)'`,
      );
    }
    if (!have.has('la_id')) {
      await queryRunner.query(
        `ALTER TABLE \`financial_transactions\` ADD COLUMN \`la_id\` INT NOT NULL DEFAULT 0 COMMENT 'FK loan_agreement.la_id'`,
      );
    }
    if (!have.has('ref_no')) {
      await queryRunner.query(
        `ALTER TABLE \`financial_transactions\` ADD COLUMN \`ref_no\` VARCHAR(50) NULL COMMENT 'เลขที่เอกสารรายการที่ไม่มี pr/rw'`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const have = await this.existing(queryRunner);
    if (have.has('ref_no'))
      await queryRunner.query(
        `ALTER TABLE \`financial_transactions\` DROP COLUMN \`ref_no\``,
      );
    if (have.has('la_id'))
      await queryRunner.query(
        `ALTER TABLE \`financial_transactions\` DROP COLUMN \`la_id\``,
      );
    if (have.has('register_kind'))
      await queryRunner.query(
        `ALTER TABLE \`financial_transactions\` DROP COLUMN \`register_kind\``,
      );
  }
}
