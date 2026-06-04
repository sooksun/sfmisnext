import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterFinancialTransactionsDelToTinyint1777595245280
  implements MigrationInterface
{
  name = 'AlterFinancialTransactionsDelToTinyint1777595245280';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX \`IDX_52dc08f02d2f2457bb7e7ed3c3\` ON \`financial_transactions\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_73e6c096b8f1892c68515da263\` ON \`financial_transactions\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_af29f93ebf692c2f3e008d3fcf\` ON \`financial_transactions\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`financial_transactions\` DROP COLUMN \`del\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`financial_transactions\` ADD \`del\` tinyint NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `CREATE INDEX \`IDX_52dc08f02d2f2457bb7e7ed3c3\` ON \`financial_transactions\` (\`sc_id\`, \`budget_year\`, \`del\`)`,
    );
    await queryRunner.query(
      `CREATE INDEX \`IDX_af29f93ebf692c2f3e008d3fcf\` ON \`financial_transactions\` (\`sc_id\`, \`sy_id\`, \`del\`)`,
    );
    await queryRunner.query(
      `CREATE INDEX \`IDX_73e6c096b8f1892c68515da263\` ON \`financial_transactions\` (\`sc_id\`, \`del\`)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX \`IDX_73e6c096b8f1892c68515da263\` ON \`financial_transactions\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_af29f93ebf692c2f3e008d3fcf\` ON \`financial_transactions\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_52dc08f02d2f2457bb7e7ed3c3\` ON \`financial_transactions\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`financial_transactions\` DROP COLUMN \`del\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`financial_transactions\` ADD \`del\` varchar(45) NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `CREATE INDEX \`IDX_af29f93ebf692c2f3e008d3fcf\` ON \`financial_transactions\` (\`sc_id\`, \`sy_id\`, \`del\`)`,
    );
    await queryRunner.query(
      `CREATE INDEX \`IDX_73e6c096b8f1892c68515da263\` ON \`financial_transactions\` (\`sc_id\`, \`del\`)`,
    );
    await queryRunner.query(
      `CREATE INDEX \`IDX_52dc08f02d2f2457bb7e7ed3c3\` ON \`financial_transactions\` (\`sc_id\`, \`budget_year\`, \`del\`)`,
    );
  }
}
