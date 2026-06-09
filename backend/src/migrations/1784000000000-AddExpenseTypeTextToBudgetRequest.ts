import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * เพิ่มคอลัมน์ expense_type_text ในทะเบียนคุมหลักฐานขอเบิก (budget_request)
 *  - ประเภทรายจ่ายแบบข้อความอิสระ (เช่น "ค่ารักษาพยาบาล(คู่สมรส)", "ค่าการศึกษาบุตร")
 *  - ใช้แสดง/พิมพ์แทน label หมวด expense_type ถ้ามีค่า (รองรับรายการขอเบิกที่ไม่เข้า 9 หมวดงบ ตามคู่มือ ตย.7)
 *  - nullable เพื่อเข้ากันได้ย้อนหลังกับข้อมูลเดิม (ตกลงใช้ label จาก expense_type)
 */
export class AddExpenseTypeTextToBudgetRequest1784000000000
  implements MigrationInterface
{
  private async has(queryRunner: QueryRunner): Promise<boolean> {
    const rows = (await queryRunner.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'budget_request'
        AND COLUMN_NAME = 'expense_type_text'
    `)) as Array<{ COLUMN_NAME: string }>;
    return rows.length > 0;
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await this.has(queryRunner))) {
      await queryRunner.query(
        `ALTER TABLE \`budget_request\` ADD COLUMN \`expense_type_text\` VARCHAR(200) NULL COMMENT 'ประเภทรายจ่ายแบบข้อความอิสระ (override label หมวด expense_type)'`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await this.has(queryRunner)) {
      await queryRunner.query(
        `ALTER TABLE \`budget_request\` DROP COLUMN \`expense_type_text\``,
      );
    }
  }
}
