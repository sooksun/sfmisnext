import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * ตั้งค่าประเภทเงินที่ "ยืมได้" (budget_borrow_type = '1') ให้ตรงคู่มือ
 * เงินนอกงบประมาณที่ยืมไปจัดกิจกรรมได้ มี 3 ประเภทหลัก (อาจเพิ่มในอนาคต):
 *   1) เงินอุดหนุนทั่วไป (ค่าใช้จ่ายรายหัว)
 *   2) เงินอุดหนุนทั่วไป (เรียนฟรี 15 ปี)
 *   3) เงินอุดหนุนโครงการอาหารกลางวัน จาก อปท. (เงินรายได้สถานศึกษา)
 *
 * จับด้วยชื่อ (LIKE) เพื่อให้ทำงานได้แม้ bg_type_id ต่างกันในแต่ละ install
 *  - admin ปรับเพิ่ม/ลดได้ภายหลังที่หน้า ตั้งค่า > ประเภทเงิน (settings)
 *  - idempotent: รันซ้ำได้ (มี guard budget_borrow_type <> '1')
 */
export class SetBorrowableMoneyTypes1782000000000
  implements MigrationInterface
{
  // เงื่อนไขชื่อของ 3 ประเภทที่ยืมได้ (ครอบคลุมชื่อทั้งแบบเก่า/ใหม่)
  private readonly where = `
    del = 0
    AND budget_borrow_type <> '1'
    AND (
      budget_type LIKE '%รายหัว%'
      OR budget_type LIKE '%อาหารกลางวัน%'
      OR (
        budget_type LIKE '%เรียนฟรี 15 ปี%'
        AND budget_type NOT LIKE '%-%'
      )
    )
  `;

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE \`master_budget_income_type\`
       SET \`budget_borrow_type\` = '1', \`update_date\` = NOW()
       WHERE ${this.where}`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // คืนค่าเป็น "ยืมไม่ได้" (2) เฉพาะ 3 ประเภทข้างต้น
    await queryRunner.query(
      `UPDATE \`master_budget_income_type\`
       SET \`budget_borrow_type\` = '2', \`update_date\` = NOW()
       WHERE del = 0
         AND budget_borrow_type = '1'
         AND (
           budget_type LIKE '%รายหัว%'
           OR budget_type LIKE '%อาหารกลางวัน%'
           OR (
             budget_type LIKE '%เรียนฟรี 15 ปี%'
             AND budget_type NOT LIKE '%-%'
           )
         )`,
    );
  }
}
