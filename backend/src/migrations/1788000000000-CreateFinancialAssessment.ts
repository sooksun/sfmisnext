import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * สร้างตาราง financial_assessment + financial_assessment_item
 * — โมดูลประเมินตนเองด้านการเงิน การบัญชี (แบบ 2544) อ้างอิง docs/finance5.pdf
 */
export class CreateFinancialAssessment1788000000000
  implements MigrationInterface
{
  private async tableExists(
    queryRunner: QueryRunner,
    name: string,
  ): Promise<boolean> {
    const rows = (await queryRunner.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
      [name],
    )) as Array<{ TABLE_NAME: string }>;
    return rows.length > 0;
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await this.tableExists(queryRunner, 'financial_assessment'))) {
      await queryRunner.query(`
        CREATE TABLE \`financial_assessment\` (
          \`fa_id\` INT NOT NULL AUTO_INCREMENT,
          \`sc_id\` INT NOT NULL DEFAULT 0,
          \`sy_id\` INT NOT NULL DEFAULT 0,
          \`budget_year\` VARCHAR(10) NULL,
          \`as_of_date\` DATE NULL,
          \`student_count\` INT NOT NULL DEFAULT 0,
          \`total_score\` FLOAT NOT NULL DEFAULT 0,
          \`max_score\` FLOAT NOT NULL DEFAULT 100,
          \`percent\` FLOAT NOT NULL DEFAULT 0,
          \`level\` TINYINT NOT NULL DEFAULT 1,
          \`status\` TINYINT NOT NULL DEFAULT 1,
          \`confirmed_by\` INT NULL,
          \`confirmed_at\` DATETIME NULL,
          \`note\` TEXT NULL,
          \`up_by\` INT NOT NULL DEFAULT 0,
          \`del\` INT NOT NULL DEFAULT 0,
          \`cre_date\` DATETIME NULL,
          \`up_date\` DATETIME NULL,
          PRIMARY KEY (\`fa_id\`),
          INDEX \`IDX_fa_sc_sy\` (\`sc_id\`, \`sy_id\`),
          UNIQUE INDEX \`UQ_fa_sc_year_del\` (\`sc_id\`, \`budget_year\`, \`del\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    }

    if (!(await this.tableExists(queryRunner, 'financial_assessment_item'))) {
      await queryRunner.query(`
        CREATE TABLE \`financial_assessment_item\` (
          \`fai_id\` INT NOT NULL AUTO_INCREMENT,
          \`assessment_id\` INT NOT NULL,
          \`item_code\` VARCHAR(10) NOT NULL,
          \`topic_no\` TINYINT NOT NULL DEFAULT 0,
          \`answer\` VARCHAR(4) NOT NULL DEFAULT 'no',
          \`weight\` FLOAT NOT NULL DEFAULT 0,
          \`score\` FLOAT NOT NULL DEFAULT 0,
          \`eval_mode\` VARCHAR(10) NOT NULL DEFAULT 'manual',
          \`auto_result\` VARCHAR(8) NULL,
          \`auto_detail\` TEXT NULL,
          \`attachment_id\` INT NULL,
          \`note\` TEXT NULL,
          PRIMARY KEY (\`fai_id\`),
          INDEX \`IDX_fai_assessment\` (\`assessment_id\`),
          UNIQUE INDEX \`UQ_fai_assessment_code\` (\`assessment_id\`, \`item_code\`),
          CONSTRAINT \`FK_fai_assessment\` FOREIGN KEY (\`assessment_id\`)
            REFERENCES \`financial_assessment\` (\`fa_id\`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await this.tableExists(queryRunner, 'financial_assessment_item')) {
      await queryRunner.query(`DROP TABLE \`financial_assessment_item\``);
    }
    if (await this.tableExists(queryRunner, 'financial_assessment')) {
      await queryRunner.query(`DROP TABLE \`financial_assessment\``);
    }
  }
}
