import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * ใบเสร็จรับเงิน แบบ บร. — เพิ่มคอลัมน์ เล่มที่ (book_no) + เลขที่ในเล่ม (receipt_no)
 * เพื่อแสดง "บร. เล่มที่ X เลขที่ Y" ตามแบบฟอร์มราชการ
 */
export class AddReceiptBookNumberColumns1777605000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const cols = await queryRunner.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'receipt'
        AND COLUMN_NAME IN ('book_no','receipt_no')
    `);
    const have = new Set(
      (cols as Array<{ COLUMN_NAME: string }>).map((c) => c.COLUMN_NAME),
    );
    if (!have.has('book_no')) {
      await queryRunner.query(
        `ALTER TABLE \`receipt\` ADD COLUMN \`book_no\` VARCHAR(45) NULL COMMENT 'เล่มที่ (receipt_book)'`,
      );
    }
    if (!have.has('receipt_no')) {
      await queryRunner.query(
        `ALTER TABLE \`receipt\` ADD COLUMN \`receipt_no\` INT NULL COMMENT 'เลขที่ใบเสร็จในเล่ม'`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const cols = await queryRunner.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'receipt'
        AND COLUMN_NAME IN ('book_no','receipt_no')
    `);
    const have = new Set(
      (cols as Array<{ COLUMN_NAME: string }>).map((c) => c.COLUMN_NAME),
    );
    if (have.has('receipt_no')) {
      await queryRunner.query(
        `ALTER TABLE \`receipt\` DROP COLUMN \`receipt_no\``,
      );
    }
    if (have.has('book_no')) {
      await queryRunner.query(`ALTER TABLE \`receipt\` DROP COLUMN \`book_no\``);
    }
  }
}
