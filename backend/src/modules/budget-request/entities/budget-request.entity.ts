import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * ทะเบียนคุมหลักฐานขอเบิกเงินงบประมาณ (1.7)
 * รวบรวมหลักฐาน → ส่ง สพป. → สพป. จ่ายตรงให้เจ้าหนี้
 */
@Index(['scId', 'syId', 'del'])
@Entity('budget_request')
export class BudgetRequest {
  @PrimaryGeneratedColumn({ name: 'br_id' }) brId: number;
  @Column({ name: 'sc_id', type: 'int', default: 0 }) scId: number;
  @Column({ name: 'sy_id', type: 'int', default: 0 }) syId: number;
  @Column({ name: 'budget_year', type: 'varchar', length: 10, nullable: true })
  budgetYear: string | null;

  @Column({
    name: 'br_seq',
    type: 'int',
    default: 1,
    comment: 'ลำดับที่ในปีงบประมาณ',
  })
  brSeq: number;

  @Column({
    name: 'action_date',
    type: 'date',
    nullable: true,
    comment: 'วันที่ดำเนินการ',
  })
  actionDate: string | null;

  @Column({
    name: 'creditor_name',
    type: 'varchar',
    length: 200,
    nullable: true,
    comment: 'เจ้าหนี้/ผู้ขอเบิก',
  })
  creditorName: string | null;

  /**
   * ประเภทรายจ่าย:
   * 1=ลูกจ้างชั่วคราว 2=ค่าตอบแทน 3=ค่าใช้สอย 4=ค่าวัสดุ
   * 5=สาธารณูปโภค 6=ครุภัณฑ์ 7=ที่ดินสิ่งก่อสร้าง 8=เงินฝาก 9=ทุนการศึกษา
   */
  @Column({
    name: 'expense_type',
    type: 'int',
    default: 3,
    comment:
      '1=ลูกจ้าง|2=ตอบแทน|3=ใช้สอย|4=วัสดุ|5=สาธารณูปโภค|6=ครุภัณฑ์|7=ที่ดิน|8=เงินฝาก|9=ทุน',
  })
  expenseType: number;

  /**
   * ประเภทรายจ่ายแบบข้อความอิสระ (เช่น "ค่ารักษาพยาบาล(คู่สมรส)", "ค่าการศึกษาบุตร")
   * ใช้แสดง/พิมพ์แทน label หมวด expense_type ถ้ามีค่า — รองรับรายการขอเบิกที่ไม่เข้า 9 หมวดงบ
   */
  @Column({
    name: 'expense_type_text',
    type: 'varchar',
    length: 200,
    nullable: true,
    comment: 'ประเภทรายจ่ายแบบข้อความอิสระ (override label หมวด expense_type)',
  })
  expenseTypeText: string | null;

  @Column({ type: 'float', default: 0 }) amount: number;

  @Column({
    name: 'send_date',
    type: 'date',
    nullable: true,
    comment: 'วันที่ส่ง สพป.',
  })
  sendDate: string | null;

  @Column({ type: 'text', nullable: true }) remark: string | null;
  @Column({ name: 'up_by', type: 'int', default: 0 }) upBy: number;
  @Column({ type: 'int', default: 0 }) del: number;

  @CreateDateColumn({ name: 'create_date', type: 'datetime', nullable: true })
  createDate: Date | null;
  @UpdateDateColumn({ name: 'update_date', type: 'datetime', nullable: true })
  updateDate: Date | null;
}
