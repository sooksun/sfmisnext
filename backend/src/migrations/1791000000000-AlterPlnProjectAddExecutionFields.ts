import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * เพิ่มฟิลด์การดำเนินงานใน pln_project (Phase 1 — Project Workspace)
 * แยกสถานะดำเนินงาน (execution_status) ออกจากสถานะอนุมัติ (proj_status)
 * คง proj_owner เดิมไว้เป็นชื่อ snapshot
 */
export class AlterPlnProjectAddExecutionFields1791000000000
  implements MigrationInterface
{
  private async hasColumn(
    queryRunner: QueryRunner,
    column: string,
  ): Promise<boolean> {
    const rows = (await queryRunner.query(
      `
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pln_project'
        AND COLUMN_NAME = ?
    `,
      [column],
    )) as Array<{ COLUMN_NAME: string }>;
    return rows.length > 0;
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    const cols: Array<{ name: string; ddl: string }> = [
      { name: 'owner_admin_id', ddl: '`owner_admin_id` INT NULL' },
      { name: 'start_date', ddl: '`start_date` DATE NULL' },
      { name: 'end_date', ddl: '`end_date` DATE NULL' },
      {
        name: 'execution_status',
        ddl: "`execution_status` TINYINT NOT NULL DEFAULT 1 COMMENT '1=ร่าง 2=พร้อม 3=กำลังทำ 4=รอตรวจสรุป 5=ปิด 6=ติดขัด 9=ยกเลิก'",
      },
      {
        name: 'progress_percent',
        ddl: '`progress_percent` DECIMAL(5,2) NOT NULL DEFAULT 0',
      },
      { name: 'expected_output', ddl: '`expected_output` TEXT NULL' },
      { name: 'success_indicator', ddl: '`success_indicator` TEXT NULL' },
      { name: 'closed_date', ddl: '`closed_date` DATE NULL' },
      { name: 'closed_by', ddl: '`closed_by` INT NULL' },
      { name: 'cancel_reason', ddl: '`cancel_reason` TEXT NULL' },
    ];
    for (const c of cols) {
      if (!(await this.hasColumn(queryRunner, c.name))) {
        await queryRunner.query(
          `ALTER TABLE \`pln_project\` ADD COLUMN ${c.ddl}`,
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const cols = [
      'owner_admin_id',
      'start_date',
      'end_date',
      'execution_status',
      'progress_percent',
      'expected_output',
      'success_indicator',
      'closed_date',
      'closed_by',
      'cancel_reason',
    ];
    for (const c of cols) {
      if (await this.hasColumn(queryRunner, c)) {
        await queryRunner.query(
          `ALTER TABLE \`pln_project\` DROP COLUMN \`${c}\``,
        );
      }
    }
  }
}
