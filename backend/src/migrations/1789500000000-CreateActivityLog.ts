import { MigrationInterface, QueryRunner } from 'typeorm';

/** สร้างตาราง activity_log — บันทึกกิจกรรมกลาง (ดู docs/DESIGN_alert_audit_system.md ชั้น 4) */
export class CreateActivityLog1789500000000 implements MigrationInterface {
  private async exists(qr: QueryRunner): Promise<boolean> {
    const rows = (await qr.query(`
      SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'activity_log'
    `)) as unknown[];
    return rows.length > 0;
  }

  public async up(qr: QueryRunner): Promise<void> {
    if (await this.exists(qr)) return;
    await qr.query(`
      CREATE TABLE \`activity_log\` (
        \`al_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`sc_id\` INT NOT NULL DEFAULT 0,
        \`admin_id\` INT NOT NULL DEFAULT 0,
        \`admin_name\` VARCHAR(150) NULL,
        \`role\` INT NOT NULL DEFAULT 0,
        \`action\` VARCHAR(20) NOT NULL,
        \`module\` VARCHAR(60) NULL,
        \`method\` VARCHAR(8) NULL,
        \`route\` VARCHAR(255) NULL,
        \`entity_id\` VARCHAR(60) NULL,
        \`summary\` VARCHAR(255) NULL,
        \`detail_json\` TEXT NULL,
        \`success\` TINYINT NOT NULL DEFAULT 1,
        \`ip\` VARCHAR(45) NULL,
        \`user_agent\` VARCHAR(255) NULL,
        \`cre_date\` DATETIME NULL,
        PRIMARY KEY (\`al_id\`),
        INDEX \`IDX_al_sc_date\` (\`sc_id\`, \`cre_date\`),
        INDEX \`IDX_al_admin_date\` (\`admin_id\`, \`cre_date\`),
        INDEX \`IDX_al_module_entity\` (\`module\`, \`entity_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  }

  public async down(qr: QueryRunner): Promise<void> {
    if (await this.exists(qr)) {
      await qr.query(`DROP TABLE \`activity_log\``);
    }
  }
}
