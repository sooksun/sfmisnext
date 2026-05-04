import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFinancialAuditLog1776298530315 implements MigrationInterface {
  name = 'AddFinancialAuditLog1776298530315';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`cash_reserve_limit\` (\`crl_id\` int NOT NULL AUTO_INCREMENT, \`sc_id\` int NOT NULL, \`limit_amount\` float NOT NULL COMMENT 'วงเงินสำรองจ่ายสูงสุด (บาท)' DEFAULT '15000', \`note\` text NULL COMMENT 'หมายเหตุ / อ้างอิงระเบียบ', \`up_by\` int NOT NULL DEFAULT '0', \`create_date\` datetime(6) NULL DEFAULT CURRENT_TIMESTAMP(6), \`update_date\` datetime(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_a92f4ec45b56099ce5c03b0f28\` (\`sc_id\`), PRIMARY KEY (\`crl_id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`financial_audit_log\` (\`fal_id\` int NOT NULL AUTO_INCREMENT, \`sc_id\` int NOT NULL DEFAULT '0', \`sy_id\` int NOT NULL DEFAULT '0', \`audit_type\` int NOT NULL COMMENT '1 = รายวัน | 2 = รายเดือน' DEFAULT '1', \`audit_date\` date NULL COMMENT 'วันที่รับรอง (สำหรับ audit_type=1)', \`audit_month\` varchar(7) NULL COMMENT 'เดือนที่รับรอง YYYY-MM (สำหรับ audit_type=2)', \`signed_by\` int NOT NULL COMMENT 'admin_id ของผู้ลงนาม' DEFAULT '0', \`signed_name\` varchar(200) NULL COMMENT 'snapshot ชื่อ-สกุลผู้ลงนาม ณ เวลาลงนาม', \`signed_position\` varchar(200) NULL COMMENT 'snapshot ตำแหน่งผู้ลงนาม', \`note\` text NULL, \`create_date\` datetime(6) NULL DEFAULT CURRENT_TIMESTAMP(6), \`update_date\` datetime(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (\`fal_id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`check_receive_committee\` (\`crc_id\` int NOT NULL AUTO_INCREMENT, \`rw_id\` int NOT NULL COMMENT 'FK → request_withdraw.rw_id', \`sc_id\` int NOT NULL DEFAULT '0', \`member1_name\` varchar(200) NULL, \`member1_position\` varchar(200) NULL, \`member2_name\` varchar(200) NULL, \`member2_position\` varchar(200) NULL, \`member3_name\` varchar(200) NULL, \`member3_position\` varchar(200) NULL, \`up_by\` int NOT NULL DEFAULT '0', \`del\` int NOT NULL DEFAULT '0', \`create_date\` datetime(6) NULL DEFAULT CURRENT_TIMESTAMP(6), \`update_date\` datetime(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_b4826d42597df3c74215cadf15\` (\`rw_id\`), PRIMARY KEY (\`crc_id\`)) ENGINE=InnoDB`,
    );
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
    await queryRunner.query(
      `DROP INDEX \`IDX_b4826d42597df3c74215cadf15\` ON \`check_receive_committee\``,
    );
    await queryRunner.query(`DROP TABLE \`check_receive_committee\``);
    await queryRunner.query(`DROP TABLE \`financial_audit_log\``);
    await queryRunner.query(
      `DROP INDEX \`IDX_a92f4ec45b56099ce5c03b0f28\` ON \`cash_reserve_limit\``,
    );
    await queryRunner.query(`DROP TABLE \`cash_reserve_limit\``);
  }
}
