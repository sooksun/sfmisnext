import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * เพิ่ม traceability fields ใน financial_transactions:
 *   sy_id      → FK ไปยัง school_year.sy_id (ปีการศึกษา)
 *   budget_year → ปีงบประมาณ (เช่น 2568, 2569)
 *   semester    → ภาคเรียน (1 = ต้น, 2 = ปลาย, 3 = ฤดูร้อน)
 *
 * แถวเก่าที่ไม่มีค่าจะเป็น NULL (nullable) — ระบบยังทำงานได้ตามปกติ
 * แต่รายการใหม่จะถูก set ทุกครั้งจาก service layer
 */
export class AddTraceabilityToFinancialTransactions1776303000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`financial_transactions\`
        ADD COLUMN \`sy_id\`      INT          NULL COMMENT 'FK → school_year.sy_id (ปีการศึกษา)' AFTER \`sc_id\`,
        ADD COLUMN \`budget_year\` INT          NULL COMMENT 'ปีงบประมาณ (เช่น 2568, 2569)'         AFTER \`sy_id\`,
        ADD COLUMN \`semester\`   TINYINT(1)   NULL COMMENT '1=ต้น 2=ปลาย 3=ฤดูร้อน'               AFTER \`budget_year\`
    `);

    // Index สำหรับ query ตามปีการศึกษา และปีงบประมาณ
    await queryRunner.query(`
      ALTER TABLE \`financial_transactions\`
        ADD INDEX \`IDX_ft_sc_sy_del\`         (\`sc_id\`, \`sy_id\`,      \`del\`),
        ADD INDEX \`IDX_ft_sc_budget_year_del\` (\`sc_id\`, \`budget_year\`, \`del\`)
    `);

    // Backfill แถวเก่า: ดึง sy_id / budget_year / semester จาก school_year
    // โดยอิงจาก create_date ของ transaction เทียบกับ sy_date_s–sy_date_e ของปีการศึกษา
    await queryRunner.query(`
      UPDATE \`financial_transactions\` ft
      JOIN \`school_year\` sy
        ON sy.sc_id    = ft.sc_id
       AND sy.del      = 0
       AND DATE(ft.create_date) BETWEEN DATE(sy.sy_date_s) AND DATE(sy.sy_date_e)
      SET
        ft.sy_id      = sy.sy_id,
        ft.budget_year = sy.budget_year,
        ft.semester   = sy.semester
      WHERE ft.sy_id IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`financial_transactions\`
        DROP INDEX  \`IDX_ft_sc_sy_del\`,
        DROP INDEX  \`IDX_ft_sc_budget_year_del\`,
        DROP COLUMN \`sy_id\`,
        DROP COLUMN \`budget_year\`,
        DROP COLUMN \`semester\`
    `);
  }
}
