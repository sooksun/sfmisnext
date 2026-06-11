import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * เฟส 2 — เติมช่องว่างข้อมูลให้ Rule Engine ประเมินอัตโนมัติได้:
 *  - receipt_book.retired_date/retired_by      → ข้อ 10.4 (เลิกใช้เล่มใบเสร็จปีก่อน)
 *  - withholding_certificate.remit_date/channel → ข้อ 3.5 (นำส่งภาษีหัก ณ ที่จ่าย)
 *  - ตาราง finance_annual_attestation           → ข้อ 1.4 (ความเห็นชอบ กก.สถานศึกษาต่อแผน)
 */
export class PhaseTwoAssessmentGaps1788500000000
  implements MigrationInterface
{
  private async hasColumn(
    qr: QueryRunner,
    table: string,
    column: string,
  ): Promise<boolean> {
    const rows = (await qr.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [table, column],
    )) as unknown[];
    return rows.length > 0;
  }

  private async hasTable(qr: QueryRunner, table: string): Promise<boolean> {
    const rows = (await qr.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
      [table],
    )) as unknown[];
    return rows.length > 0;
  }

  public async up(qr: QueryRunner): Promise<void> {
    // receipt_book
    if (!(await this.hasColumn(qr, 'receipt_book', 'retired_date'))) {
      await qr.query(
        `ALTER TABLE \`receipt_book\` ADD COLUMN \`retired_date\` DATE NULL`,
      );
    }
    if (!(await this.hasColumn(qr, 'receipt_book', 'retired_by'))) {
      await qr.query(
        `ALTER TABLE \`receipt_book\` ADD COLUMN \`retired_by\` INT NULL`,
      );
    }

    // withholding_certificate
    if (!(await this.hasColumn(qr, 'withholding_certificate', 'remit_date'))) {
      await qr.query(
        `ALTER TABLE \`withholding_certificate\` ADD COLUMN \`remit_date\` DATE NULL`,
      );
    }
    if (
      !(await this.hasColumn(qr, 'withholding_certificate', 'remit_channel'))
    ) {
      await qr.query(
        `ALTER TABLE \`withholding_certificate\` ADD COLUMN \`remit_channel\` INT NULL`,
      );
    }

    // finance_annual_attestation
    if (!(await this.hasTable(qr, 'finance_annual_attestation'))) {
      await qr.query(`
        CREATE TABLE \`finance_annual_attestation\` (
          \`faa_id\` INT NOT NULL AUTO_INCREMENT,
          \`sc_id\` INT NOT NULL DEFAULT 0,
          \`sy_id\` INT NOT NULL DEFAULT 0,
          \`budget_year\` VARCHAR(10) NULL,
          \`plan_committee_date\` DATE NULL,
          \`plan_committee_doc_no\` VARCHAR(100) NULL,
          \`note\` TEXT NULL,
          \`up_by\` INT NOT NULL DEFAULT 0,
          \`del\` INT NOT NULL DEFAULT 0,
          \`cre_date\` DATETIME NULL,
          \`up_date\` DATETIME NULL,
          PRIMARY KEY (\`faa_id\`),
          UNIQUE INDEX \`UQ_faa_sc_year_del\` (\`sc_id\`, \`budget_year\`, \`del\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    }
  }

  public async down(qr: QueryRunner): Promise<void> {
    if (await this.hasTable(qr, 'finance_annual_attestation')) {
      await qr.query(`DROP TABLE \`finance_annual_attestation\``);
    }
    for (const col of ['retired_date', 'retired_by']) {
      if (await this.hasColumn(qr, 'receipt_book', col)) {
        await qr.query(`ALTER TABLE \`receipt_book\` DROP COLUMN \`${col}\``);
      }
    }
    for (const col of ['remit_date', 'remit_channel']) {
      if (await this.hasColumn(qr, 'withholding_certificate', col)) {
        await qr.query(
          `ALTER TABLE \`withholding_certificate\` DROP COLUMN \`${col}\``,
        );
      }
    }
  }
}
