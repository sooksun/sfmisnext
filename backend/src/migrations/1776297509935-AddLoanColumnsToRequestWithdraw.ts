import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLoanColumnsToRequestWithdraw1776297509935
  implements MigrationInterface
{
  name = 'AddLoanColumnsToRequestWithdraw1776297509935';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`request_withdraw\` ADD \`loan_type\` int NULL COMMENT '1=เงินสวัสดิการ | 2=โครงการ | 3=กิจกรรม'`,
    );
    await queryRunner.query(
      `ALTER TABLE \`request_withdraw\` ADD \`loan_start_date\` date NULL COMMENT 'วันที่ยืมเงิน'`,
    );
    await queryRunner.query(
      `ALTER TABLE \`request_withdraw\` ADD \`loan_return_due_date\` date NULL COMMENT 'กำหนดส่งคืน (auto: loan_start_date + 30 วัน)'`,
    );
    await queryRunner.query(
      `ALTER TABLE \`request_withdraw\` ADD \`loan_returned_date\` date NULL COMMENT 'วันที่คืนจริง'`,
    );
    await queryRunner.query(
      `ALTER TABLE \`request_withdraw\` ADD \`loan_return_cash\` float NULL COMMENT 'เงินสดคืน' DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE \`request_withdraw\` ADD \`loan_return_voucher_amount\` float NULL COMMENT 'ใบสำคัญคืน' DEFAULT '0'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`request_withdraw\` DROP COLUMN \`loan_return_voucher_amount\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`request_withdraw\` DROP COLUMN \`loan_return_cash\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`request_withdraw\` DROP COLUMN \`loan_returned_date\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`request_withdraw\` DROP COLUMN \`loan_return_due_date\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`request_withdraw\` DROP COLUMN \`loan_start_date\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`request_withdraw\` DROP COLUMN \`loan_type\``,
    );
  }
}
