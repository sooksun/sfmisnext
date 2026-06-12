import { MigrationInterface, QueryRunner } from 'typeorm';

/** สร้างตาราง pln_project_member — สมาชิกโครงการ (owner/member/reviewer) */
export class CreateProjectMember1791500000000 implements MigrationInterface {
  private async exists(queryRunner: QueryRunner): Promise<boolean> {
    const rows = (await queryRunner.query(`
      SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pln_project_member'
    `)) as Array<{ TABLE_NAME: string }>;
    return rows.length > 0;
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (await this.exists(queryRunner)) return;
    await queryRunner.query(`
      CREATE TABLE \`pln_project_member\` (
        \`member_id\` INT NOT NULL AUTO_INCREMENT,
        \`project_id\` INT NOT NULL,
        \`admin_id\` INT NOT NULL,
        \`project_role\` VARCHAR(20) NOT NULL DEFAULT 'member',
        \`role_name\` VARCHAR(150) NULL,
        \`note\` TEXT NULL,
        \`sc_id\` INT NOT NULL,
        \`up_by\` INT NULL,
        \`del\` INT NOT NULL DEFAULT 0,
        \`create_date\` DATETIME NULL,
        \`update_date\` DATETIME NULL,
        PRIMARY KEY (\`member_id\`),
        INDEX \`IDX_pmember_project\` (\`project_id\`, \`del\`),
        UNIQUE INDEX \`UNQ_pmember_role\` (\`project_id\`, \`admin_id\`, \`project_role\`, \`del\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (!(await this.exists(queryRunner))) return;
    await queryRunner.query(`DROP TABLE \`pln_project_member\``);
  }
}
