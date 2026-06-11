import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * สร้างตาราง deposit_register — ทะเบียนคุมเงินฝาก (ตย.14)
 *  เงินที่รับไว้แล้วนำฝากส่วนราชการผู้เบิก (เช่น เงินประกันสัญญา) + วันครบกำหนด/วันคืนผู้มีสิทธิ
 */
export class CreateDepositRegister1784500000000 implements MigrationInterface {
  private async exists(queryRunner: QueryRunner): Promise<boolean> {
    const rows = (await queryRunner.query(`
      SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'deposit_register'
    `)) as Array<{ TABLE_NAME: string }>;
    return rows.length > 0;
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (await this.exists(queryRunner)) return;
    await queryRunner.query(`
      CREATE TABLE \`deposit_register\` (
        \`dr_id\` INT NOT NULL AUTO_INCREMENT,
        \`sc_id\` INT NOT NULL DEFAULT 0,
        \`sy_id\` INT NOT NULL DEFAULT 0,
        \`budget_year\` VARCHAR(10) NULL,
        \`seq\` INT NOT NULL DEFAULT 1,
        \`item_name\` VARCHAR(200) NULL,
        \`deposit_kind\` VARCHAR(100) NULL,
        \`receive_date\` DATE NULL,
        \`receive_doc_no\` VARCHAR(50) NULL,
        \`receive_amount\` FLOAT NOT NULL DEFAULT 0,
        \`deposit_date\` DATE NULL,
        \`deposit_doc_no\` VARCHAR(50) NULL,
        \`deposit_amount\` FLOAT NOT NULL DEFAULT 0,
        \`due_date\` DATE NULL,
        \`return_date\` DATE NULL,
        \`note\` TEXT NULL,
        \`up_by\` INT NOT NULL DEFAULT 0,
        \`del\` INT NOT NULL DEFAULT 0,
        \`create_date\` DATETIME NULL,
        \`update_date\` DATETIME NULL,
        PRIMARY KEY (\`dr_id\`),
        INDEX \`IDX_deposit_register_sc_sy_del\` (\`sc_id\`, \`sy_id\`, \`del\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await this.exists(queryRunner)) {
      await queryRunner.query(`DROP TABLE \`deposit_register\``);
    }
  }
}
