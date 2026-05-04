import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * ทะเบียนคุมสัญญายืมเงิน (บย.)
 * ระเบียบกระทรวงการคลัง: เดินทาง = ส่งคืนใน 15 วัน, อื่นๆ = 30 วัน
 * เลขที่ บย. = {la_seq}/{budget_year} เช่น "1/2568"
 */
@Index(['scId', 'syId', 'del'])
@Entity('loan_agreement')
export class LoanAgreement {
  @PrimaryGeneratedColumn({ name: 'la_id' }) laId: number;
  @Column({ name: 'sc_id', type: 'int', default: 0 }) scId: number;
  @Column({ name: 'sy_id', type: 'int', default: 0 }) syId: number;
  @Column({ name: 'budget_year', type: 'varchar', length: 10, nullable: true })
  budgetYear: string | null;

  @Column({
    name: 'la_seq',
    type: 'int',
    default: 1,
    comment: 'running number per sc_id+budget_year',
  })
  laSeq: number;
  @Column({
    name: 'la_no',
    type: 'varchar',
    length: 20,
    nullable: true,
    comment: 'เลขที่สัญญา เช่น 1/2568',
  })
  laNo: string | null;

  // ผู้ยืม
  @Column({ name: 'borrower_id', type: 'int', default: 0 }) borrowerId: number;
  @Column({
    name: 'borrower_name',
    type: 'varchar',
    length: 200,
    nullable: true,
    comment: 'snapshot ชื่อ-สกุล',
  })
  borrowerName: string | null;
  @Column({
    name: 'borrower_position',
    type: 'varchar',
    length: 200,
    nullable: true,
    comment: 'snapshot ตำแหน่ง',
  })
  borrowerPosition: string | null;

  // ประเภทเงิน (budget_income_type.bg_type_id)
  @Column({ name: 'money_type_id', type: 'int', default: 0 })
  moneyTypeId: number;
  @Column({
    name: 'money_type_name',
    type: 'varchar',
    length: 200,
    nullable: true,
    comment: 'snapshot ชื่อประเภทเงิน',
  })
  moneyTypeName: string | null;

  @Column({ type: 'text', nullable: true, comment: 'วัตถุประสงค์การยืม' })
  purpose: string | null;
  @Column({ type: 'float', default: 0 }) amount: number;
  @Column({ name: 'borrow_date', type: 'date', nullable: true }) borrowDate:
    | string
    | null;

  /**
   * ประเภทการยืม (ส่งผลต่อกำหนดส่งคืน):
   * 1 = ค่าเดินทาง (15 วัน)
   * 2 = โครงการ (30 วัน)
   * 3 = กิจกรรม (30 วัน)
   * 4 = อื่นๆ (30 วัน)
   */
  @Column({
    name: 'loan_category',
    type: 'int',
    default: 2,
    comment: '1=เดินทาง(15วัน)|2=โครงการ(30วัน)|3=กิจกรรม(30วัน)|4=อื่น(30วัน)',
  })
  loanCategory: number;

  @Column({
    name: 'due_date',
    type: 'date',
    nullable: true,
    comment: 'กำหนดส่งคืน (auto-calculated)',
  })
  dueDate: string | null;

  // การส่งคืน
  @Column({ name: 'returned_date', type: 'date', nullable: true })
  returnedDate: string | null;
  @Column({ name: 'return_cash', type: 'float', nullable: true, default: 0 })
  returnCash: number | null;
  @Column({
    name: 'return_voucher_amount',
    type: 'float',
    nullable: true,
    default: 0,
    comment: 'ใบสำคัญ',
  })
  returnVoucherAmount: number | null;

  // link กับ request_withdraw (ถ้าสร้างจาก invoice workflow)
  @Column({
    name: 'rw_id',
    type: 'int',
    nullable: true,
    comment: 'FK request_withdraw.rw_id (optional)',
  })
  rwId: number | null;

  /**
   * สถานะ: 1=ยังค้างชำระ 2=คืนแล้ว 3=ยกเลิก
   */
  @Column({ type: 'int', default: 1, comment: '1=ค้างชำระ|2=คืนแล้ว|3=ยกเลิก' })
  status: number;

  @Column({ type: 'text', nullable: true }) note: string | null;
  @Column({ name: 'up_by', type: 'int', default: 0 }) upBy: number;
  @Column({ type: 'int', default: 0 }) del: number;

  @CreateDateColumn({ name: 'create_date', type: 'datetime', nullable: true })
  createDate: Date | null;
  @UpdateDateColumn({ name: 'update_date', type: 'datetime', nullable: true })
  updateDate: Date | null;
}
