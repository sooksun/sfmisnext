import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * สัญญายืมเงินตาม "สัญญาการยืมเงิน (ตัวอย่างที่ 34)"
 *  - เพิ่มฟิลด์ตามแบบฟอร์ม: affiliation, province, expense_detail, due_days
 *  - เพิ่ม workflow อนุมัติ: ตรวจสอบ → อนุมัติ → รับเงิน
 *      verify_by/name/date, approve_by/name/date/amount, receipt_date
 *  - สถานะใหม่ 10=รอตรวจสอบ, 11=รออนุมัติ, 12=รอรับเงิน (เดิม 1/2/3 คงเดิม)
 *    การตัดยอดเงิน (ft_borrow) เลื่อนไปเกิดตอน "รับเงิน" แทนตอนสร้างสัญญา
 */
export class AddLoanAgreementWorkflowColumns1780000000000
  implements MigrationInterface
{
  private readonly columns: Array<{ name: string; ddl: string }> = [
    {
      name: 'affiliation',
      ddl: "ADD COLUMN `affiliation` VARCHAR(255) NULL COMMENT 'สังกัด (โรงเรียน/สพป./เขต)'",
    },
    {
      name: 'province',
      ddl: "ADD COLUMN `province` VARCHAR(100) NULL COMMENT 'จังหวัด'",
    },
    {
      name: 'expense_detail',
      ddl: "ADD COLUMN `expense_detail` TEXT NULL COMMENT 'รายละเอียดการใช้เงิน'",
    },
    {
      name: 'due_days',
      ddl: "ADD COLUMN `due_days` INT NOT NULL DEFAULT 0 COMMENT 'จำนวนวันส่งใช้ (0=ตาม loan_category)'",
    },
    {
      name: 'verify_by',
      ddl: "ADD COLUMN `verify_by` INT NULL COMMENT 'ผู้ตรวจสอบ admin_id'",
    },
    {
      name: 'verify_name',
      ddl: "ADD COLUMN `verify_name` VARCHAR(200) NULL COMMENT 'ชื่อผู้ตรวจสอบ'",
    },
    {
      name: 'verify_date',
      ddl: 'ADD COLUMN `verify_date` DATE NULL',
    },
    {
      name: 'approve_by',
      ddl: "ADD COLUMN `approve_by` INT NULL COMMENT 'ผู้อนุมัติ admin_id'",
    },
    {
      name: 'approve_name',
      ddl: "ADD COLUMN `approve_name` VARCHAR(200) NULL COMMENT 'ชื่อผู้อนุมัติ (ผอ.)'",
    },
    {
      name: 'approve_date',
      ddl: 'ADD COLUMN `approve_date` DATE NULL',
    },
    {
      name: 'approve_amount',
      ddl: "ADD COLUMN `approve_amount` FLOAT NULL COMMENT 'จำนวนเงินที่อนุมัติ'",
    },
    {
      name: 'receipt_date',
      ddl: "ADD COLUMN `receipt_date` DATE NULL COMMENT 'วันที่ผู้ยืมรับเงิน'",
    },
  ];

  private async existing(queryRunner: QueryRunner): Promise<Set<string>> {
    const names = this.columns.map((c) => `'${c.name}'`).join(',');
    const cols = await queryRunner.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'loan_agreement'
        AND COLUMN_NAME IN (${names})
    `);
    return new Set(
      (cols as Array<{ COLUMN_NAME: string }>).map((c) => c.COLUMN_NAME),
    );
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    const have = await this.existing(queryRunner);
    for (const col of this.columns) {
      if (!have.has(col.name)) {
        await queryRunner.query(`ALTER TABLE \`loan_agreement\` ${col.ddl}`);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const have = await this.existing(queryRunner);
    // drop ในลำดับย้อนกลับ
    for (const col of [...this.columns].reverse()) {
      if (have.has(col.name)) {
        await queryRunner.query(
          `ALTER TABLE \`loan_agreement\` DROP COLUMN \`${col.name}\``,
        );
      }
    }
  }
}
