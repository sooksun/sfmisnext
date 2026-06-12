import { MigrationInterface, QueryRunner } from 'typeorm';

/** สร้างตาราง pln_project_task — งานย่อยของโครงการ (Kanban) */
export class CreateProjectTask1792000000000 implements MigrationInterface {
  private async exists(queryRunner: QueryRunner): Promise<boolean> {
    const rows = (await queryRunner.query(`
      SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pln_project_task'
    `)) as Array<{ TABLE_NAME: string }>;
    return rows.length > 0;
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (await this.exists(queryRunner)) return;
    await queryRunner.query(`
      CREATE TABLE \`pln_project_task\` (
        \`task_id\` INT NOT NULL AUTO_INCREMENT,
        \`project_id\` INT NOT NULL,
        \`task_no\` INT NOT NULL DEFAULT 0,
        \`title\` VARCHAR(255) NOT NULL,
        \`detail\` TEXT NULL,
        \`assignee_admin_id\` INT NULL,
        \`start_date\` DATE NULL,
        \`due_date\` DATE NULL,
        \`status\` TINYINT NOT NULL DEFAULT 1 COMMENT '1=ยังไม่เริ่ม 2=กำลังทำ 3=รอตรวจ 4=เสร็จแล้ว 5=ติดขัด 9=ยกเลิก',
        \`weight\` INT NOT NULL DEFAULT 1,
        \`sort_order\` INT NOT NULL DEFAULT 0,
        \`evidence_required\` TINYINT NOT NULL DEFAULT 0,
        \`result_note\` TEXT NULL,
        \`blocked_reason\` TEXT NULL,
        \`completed_date\` DATE NULL,
        \`completed_by\` INT NULL,
        \`sc_id\` INT NOT NULL,
        \`sy_id\` INT NULL,
        \`up_by\` INT NULL,
        \`del\` INT NOT NULL DEFAULT 0,
        \`create_date\` DATETIME NULL,
        \`update_date\` DATETIME NULL,
        PRIMARY KEY (\`task_id\`),
        INDEX \`IDX_ptask_project\` (\`project_id\`, \`del\`),
        INDEX \`IDX_ptask_assignee\` (\`assignee_admin_id\`, \`status\`, \`del\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (!(await this.exists(queryRunner))) return;
    await queryRunner.query(`DROP TABLE \`pln_project_task\``);
  }
}
