import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * ประเภทรายจ่าย (master) ของทะเบียนคุมหลักฐานขอเบิก — กำหนดเองรายโรงเรียน
 *  - ผูกกับ sc_id (แต่ละโรงเรียนมีรายการของตัวเอง)
 *  - ใช้เติม dropdown "ประเภทรายจ่าย" ในหน้า budget-request (รวมกับ 9 หมวดงบพรีเซ็ตที่ frontend)
 */
@Index(['scId', 'del'])
@Entity('budget_expense_type')
export class BudgetExpenseType {
  @PrimaryGeneratedColumn({ name: 'bet_id' }) betId: number;
  @Column({ name: 'sc_id', type: 'int', default: 0 }) scId: number;

  @Column({
    name: 'name',
    type: 'varchar',
    length: 200,
    comment: 'ชื่อประเภทรายจ่าย (เช่น ค่ารักษาพยาบาล, ค่าการศึกษาบุตร)',
  })
  name: string;

  @Column({
    name: 'sort_order',
    type: 'int',
    default: 0,
    comment: 'ลำดับการแสดง',
  })
  sortOrder: number;

  @Column({ name: 'up_by', type: 'int', default: 0 }) upBy: number;
  @Column({ type: 'int', default: 0 }) del: number;

  @CreateDateColumn({ name: 'create_date', type: 'datetime', nullable: true })
  createDate: Date | null;
  @UpdateDateColumn({ name: 'update_date', type: 'datetime', nullable: true })
  updateDate: Date | null;
}
