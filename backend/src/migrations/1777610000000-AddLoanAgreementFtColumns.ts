import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * เงินยืม (loan_agreement) ผูกกับทะเบียนคุมเงิน (financial_transactions)
 *  - ft_borrow_id : FT ที่ตัดยอดประเภทเงินตอนยืม (type=-1)
 *  - ft_return_id : FT ที่คืนยอดเงินสดตอนส่งใช้ (type=+1)
 * ทำให้การยืม/ส่งใช้เงินยืมกระทบยอดคงเหลือของประเภทเงิน ตามระบบควบคุมเงิน
 * หน่วยงานย่อย พ.ศ. 2544 (เงินยืม = ลูกหนี้/จ่าย ในทะเบียนคุม)
 */
export class AddLoanAgreementFtColumns1777610000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const cols = await queryRunner.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'loan_agreement'
        AND COLUMN_NAME IN ('ft_borrow_id','ft_return_id')
    `);
    const have = new Set(
      (cols as Array<{ COLUMN_NAME: string }>).map((c) => c.COLUMN_NAME),
    );
    if (!have.has('ft_borrow_id')) {
      await queryRunner.query(
        `ALTER TABLE \`loan_agreement\` ADD COLUMN \`ft_borrow_id\` INT NULL COMMENT 'FK financial_transactions.ft_id (ตัดยอดตอนยืม)'`,
      );
    }
    if (!have.has('ft_return_id')) {
      await queryRunner.query(
        `ALTER TABLE \`loan_agreement\` ADD COLUMN \`ft_return_id\` INT NULL COMMENT 'FK financial_transactions.ft_id (คืนเงินสดตอนส่งใช้)'`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const cols = await queryRunner.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'loan_agreement'
        AND COLUMN_NAME IN ('ft_borrow_id','ft_return_id')
    `);
    const have = new Set(
      (cols as Array<{ COLUMN_NAME: string }>).map((c) => c.COLUMN_NAME),
    );
    if (have.has('ft_return_id')) {
      await queryRunner.query(
        `ALTER TABLE \`loan_agreement\` DROP COLUMN \`ft_return_id\``,
      );
    }
    if (have.has('ft_borrow_id')) {
      await queryRunner.query(
        `ALTER TABLE \`loan_agreement\` DROP COLUMN \`ft_borrow_id\``,
      );
    }
  }
}
