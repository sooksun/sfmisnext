import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * เปลี่ยน pln_budget_category_detail.budget จาก INT → FLOAT(15,2)
 * ยอดงบประมาณแยกประเภทมีทศนิยมได้ (เช่น 6,499.60 จากการคำนวณรายหัว×สัดส่วน)
 * ให้ตรงกับ pln_budget_category.total ที่เป็น float อยู่แล้ว
 * เดิม column เป็น INT ทำให้บันทึกค่าทศนิยมไม่ได้ (DTO @IsInt reject → 400)
 */
export class AlterBudgetDetailToFloat1787000000000
  implements MigrationInterface
{
  private async columnType(queryRunner: QueryRunner): Promise<string | null> {
    const rows = (await queryRunner.query(
      `SELECT DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'pln_budget_category_detail'
         AND COLUMN_NAME = 'budget' LIMIT 1`,
    )) as Array<{ DATA_TYPE: string }>;
    return rows.length ? rows[0].DATA_TYPE : null;
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    const type = await this.columnType(queryRunner);
    if (type === null || type.toLowerCase() === 'float') return;
    await queryRunner.query(
      `ALTER TABLE \`pln_budget_category_detail\`
       MODIFY COLUMN \`budget\` FLOAT(15,2) NOT NULL DEFAULT 0`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const type = await this.columnType(queryRunner);
    if (type === null || type.toLowerCase() === 'int') return;
    await queryRunner.query(
      `ALTER TABLE \`pln_budget_category_detail\`
       MODIFY COLUMN \`budget\` INT NOT NULL DEFAULT 0`,
    );
  }
}
