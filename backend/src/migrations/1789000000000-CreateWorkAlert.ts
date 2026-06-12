import { MigrationInterface, QueryRunner } from 'typeorm';

/** สร้างตาราง work_alert — ศูนย์การเตือนงานกลาง (ดู docs/DESIGN_alert_audit_system.md) */
export class CreateWorkAlert1789000000000 implements MigrationInterface {
  private async exists(qr: QueryRunner): Promise<boolean> {
    const rows = (await qr.query(`
      SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'work_alert'
    `)) as unknown[];
    return rows.length > 0;
  }

  public async up(qr: QueryRunner): Promise<void> {
    if (await this.exists(qr)) return;
    await qr.query(`
      CREATE TABLE \`work_alert\` (
        \`wa_id\` INT NOT NULL AUTO_INCREMENT,
        \`sc_id\` INT NOT NULL DEFAULT 0,
        \`sy_id\` INT NOT NULL DEFAULT 0,
        \`budget_year\` VARCHAR(10) NULL,
        \`source\` VARCHAR(20) NOT NULL DEFAULT 'calendar',
        \`rule_code\` VARCHAR(40) NOT NULL,
        \`period\` VARCHAR(30) NOT NULL DEFAULT '-',
        \`severity\` VARCHAR(10) NOT NULL DEFAULT 'warning',
        \`title\` VARCHAR(200) NOT NULL,
        \`detail\` TEXT NULL,
        \`link\` VARCHAR(200) NULL,
        \`due_date\` DATE NULL,
        \`assignee_role\` VARCHAR(30) NULL,
        \`status\` TINYINT NOT NULL DEFAULT 1,
        \`resolved_by\` VARCHAR(20) NULL,
        \`resolved_at\` DATETIME NULL,
        \`del\` INT NOT NULL DEFAULT 0,
        \`cre_date\` DATETIME NULL,
        \`up_date\` DATETIME NULL,
        PRIMARY KEY (\`wa_id\`),
        INDEX \`IDX_wa_sc_status_del\` (\`sc_id\`, \`status\`, \`del\`),
        UNIQUE INDEX \`UQ_wa_sc_rule_period_del\` (\`sc_id\`, \`rule_code\`, \`period\`, \`del\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  }

  public async down(qr: QueryRunner): Promise<void> {
    if (await this.exists(qr)) {
      await qr.query(`DROP TABLE \`work_alert\``);
    }
  }
}
