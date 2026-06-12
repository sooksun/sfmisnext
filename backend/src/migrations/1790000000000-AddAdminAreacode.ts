import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * เพิ่มคอลัมน์ areacode ให้ตาราง admin — รองรับ user ระดับเขตพื้นที่ (type=9)
 * เก็บรหัสเขต (ตรงกับ school.areacode) เพื่อจำกัดขอบเขตข้อมูลที่เห็น
 */
export class AddAdminAreacode1790000000000 implements MigrationInterface {
  name = 'AddAdminAreacode1790000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('admin');
    if (table && !table.findColumnByName('areacode')) {
      await queryRunner.query(
        "ALTER TABLE `admin` ADD COLUMN `areacode` VARCHAR(10) NULL AFTER `sc_id`",
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('admin');
    if (table && table.findColumnByName('areacode')) {
      await queryRunner.query('ALTER TABLE `admin` DROP COLUMN `areacode`');
    }
  }
}
