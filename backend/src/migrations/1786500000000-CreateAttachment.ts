import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * สร้างตาราง tb_attachment — ไฟล์แนบหลักฐาน (ใบเสนอราคา/รูปตรวจรับ/สัญญา/ใบเสร็จ)
 * ผูกกับเอกสารต้นทางผ่าน (ref_type, ref_id) เช่น parcel_order / sup_inspection / sup_contract
 */
export class CreateAttachment1786500000000 implements MigrationInterface {
  private async exists(queryRunner: QueryRunner): Promise<boolean> {
    const rows = (await queryRunner.query(`
      SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tb_attachment'
    `)) as Array<{ TABLE_NAME: string }>;
    return rows.length > 0;
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (await this.exists(queryRunner)) return;
    await queryRunner.query(`
      CREATE TABLE \`tb_attachment\` (
        \`att_id\` INT NOT NULL AUTO_INCREMENT,
        \`sc_id\` INT NOT NULL,
        \`ref_type\` VARCHAR(40) NOT NULL,
        \`ref_id\` INT NOT NULL,
        \`file_name\` VARCHAR(255) NOT NULL,
        \`stored_name\` VARCHAR(255) NOT NULL,
        \`mime\` VARCHAR(100) NOT NULL,
        \`size_bytes\` INT NOT NULL,
        \`category\` VARCHAR(40) NULL,
        \`note\` TEXT NULL,
        \`up_by\` INT NOT NULL DEFAULT 0,
        \`del\` INT NOT NULL DEFAULT 0,
        \`create_date\` DATETIME NULL,
        \`update_date\` DATETIME NULL,
        PRIMARY KEY (\`att_id\`),
        INDEX \`IDX_attachment_ref\` (\`sc_id\`, \`ref_type\`, \`ref_id\`, \`del\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (!(await this.exists(queryRunner))) return;
    await queryRunner.query(`DROP TABLE \`tb_attachment\``);
  }
}
