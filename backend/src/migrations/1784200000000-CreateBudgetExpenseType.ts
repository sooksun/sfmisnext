import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * สร้างตาราง budget_expense_type — ประเภทรายจ่าย (master) รายโรงเรียน
 *  - ใช้เติม dropdown "ประเภทรายจ่าย" ในทะเบียนคุมหลักฐานขอเบิก (budget-request)
 *  - ผูก sc_id, soft-delete ด้วย del
 */
export class CreateBudgetExpenseType1784200000000
  implements MigrationInterface
{
  private async exists(queryRunner: QueryRunner): Promise<boolean> {
    const rows = (await queryRunner.query(`
      SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'budget_expense_type'
    `)) as Array<{ TABLE_NAME: string }>;
    return rows.length > 0;
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (await this.exists(queryRunner)) return;
    await queryRunner.query(`
      CREATE TABLE \`budget_expense_type\` (
        \`bet_id\` INT NOT NULL AUTO_INCREMENT,
        \`sc_id\` INT NOT NULL DEFAULT 0,
        \`name\` VARCHAR(200) NOT NULL COMMENT 'ชื่อประเภทรายจ่าย',
        \`sort_order\` INT NOT NULL DEFAULT 0 COMMENT 'ลำดับการแสดง',
        \`up_by\` INT NOT NULL DEFAULT 0,
        \`del\` INT NOT NULL DEFAULT 0,
        \`create_date\` DATETIME NULL,
        \`update_date\` DATETIME NULL,
        PRIMARY KEY (\`bet_id\`),
        INDEX \`IDX_budget_expense_type_sc_del\` (\`sc_id\`, \`del\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await this.exists(queryRunner)) {
      await queryRunner.query(`DROP TABLE \`budget_expense_type\``);
    }
  }
}
