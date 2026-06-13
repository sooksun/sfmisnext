import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * - เพิ่ม budget_year ใน pln_project (ผูกปีงบประมาณชัดเจน แยกจาก sy_id)
 * - ตารางเชื่อม pln_project_policy: 1 โครงการสอดคล้องกับนโยบายโรงเรียนได้หลายข้อ
 */
export class ProjectPolicyAndBudgetYear1792500000000
  implements MigrationInterface
{
  private async hasColumn(qr: QueryRunner, col: string): Promise<boolean> {
    const rows = (await qr.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pln_project' AND COLUMN_NAME = ?`,
      [col],
    )) as Array<{ COLUMN_NAME: string }>;
    return rows.length > 0;
  }

  private async hasTable(qr: QueryRunner): Promise<boolean> {
    const rows = (await qr.query(`
      SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pln_project_policy'
    `)) as Array<{ TABLE_NAME: string }>;
    return rows.length > 0;
  }

  public async up(qr: QueryRunner): Promise<void> {
    if (!(await this.hasColumn(qr, 'budget_year'))) {
      await qr.query(
        `ALTER TABLE \`pln_project\` ADD COLUMN \`budget_year\` INT NULL`,
      );
    }
    if (!(await this.hasTable(qr))) {
      await qr.query(`
        CREATE TABLE \`pln_project_policy\` (
          \`pp_id\` INT NOT NULL AUTO_INCREMENT,
          \`project_id\` INT NOT NULL,
          \`scp_id\` INT NOT NULL,
          \`policy_name\` VARCHAR(255) NULL,
          \`sc_id\` INT NOT NULL,
          \`del\` INT NOT NULL DEFAULT 0,
          \`create_date\` DATETIME NULL,
          \`update_date\` DATETIME NULL,
          PRIMARY KEY (\`pp_id\`),
          INDEX \`IDX_pprojpolicy_project\` (\`project_id\`, \`del\`),
          INDEX \`IDX_pprojpolicy_scp\` (\`sc_id\`, \`scp_id\`, \`del\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    }
  }

  public async down(qr: QueryRunner): Promise<void> {
    if (await this.hasTable(qr)) {
      await qr.query(`DROP TABLE \`pln_project_policy\``);
    }
    if (await this.hasColumn(qr, 'budget_year')) {
      await qr.query(`ALTER TABLE \`pln_project\` DROP COLUMN \`budget_year\``);
    }
  }
}
