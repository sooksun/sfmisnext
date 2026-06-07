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
    comment: 'ตำแหน่งผู้ยืม (ตามสัญญา ตัวอย่างที่ 34)',
  })
  borrowerPosition: string | null;

  @Column({
    name: 'affiliation',
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'สังกัด (โรงเรียน/สพป./เขต) ตามสัญญา',
  })
  affiliation: string | null;

  @Column({
    name: 'province',
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'จังหวัด ตามสัญญา',
  })
  province: string | null;

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

  @Column({ type: 'text', nullable: true, comment: 'วัตถุประสงค์การยืม (เพื่อเป็นค่าใช้จ่ายในการ...)' })
  purpose: string | null;
  @Column({
    name: 'expense_detail',
    type: 'text',
    nullable: true,
    comment: 'รายละเอียดการใช้เงิน (ดังรายละเอียดต่อไปนี้)',
  })
  expenseDetail: string | null;
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
    name: 'due_days',
    type: 'int',
    default: 0,
    comment: 'จำนวนวันส่งใช้ (นับแต่วันรับเงิน) 0=ใช้ค่าตาม loan_category',
  })
  dueDays: number;

  @Column({
    name: 'due_date',
    type: 'date',
    nullable: true,
    comment: 'กำหนดส่งใช้ (คำนวณจากวันรับเงิน + due_days)',
  })
  dueDate: string | null;

  // ── workflow อนุมัติ (ตามสัญญายืมเงิน ตัวอย่างที่ 34) ─────────────────────
  // ผู้ยืม → ผู้ตรวจสอบ (เจ้าหน้าที่การเงิน) → ผู้อนุมัติ (ผอ.) → รับเงิน
  @Column({ name: 'verify_by', type: 'int', nullable: true, comment: 'ผู้ตรวจสอบ admin_id' })
  verifyBy: number | null;
  @Column({ name: 'verify_name', type: 'varchar', length: 200, nullable: true, comment: 'snapshot ชื่อผู้ตรวจสอบ' })
  verifyName: string | null;
  @Column({ name: 'verify_date', type: 'date', nullable: true, comment: 'วันที่ตรวจสอบ' })
  verifyDate: string | null;

  @Column({ name: 'approve_by', type: 'int', nullable: true, comment: 'ผู้อนุมัติ admin_id' })
  approveBy: number | null;
  @Column({ name: 'approve_name', type: 'varchar', length: 200, nullable: true, comment: 'snapshot ชื่อผู้อนุมัติ (ผอ.)' })
  approveName: string | null;
  @Column({ name: 'approve_date', type: 'date', nullable: true, comment: 'วันที่อนุมัติ' })
  approveDate: string | null;
  @Column({ name: 'approve_amount', type: 'float', nullable: true, comment: 'จำนวนเงินที่อนุมัติให้ยืม' })
  approveAmount: number | null;

  @Column({ name: 'receipt_date', type: 'date', nullable: true, comment: 'วันที่ผู้ยืมรับเงิน' })
  receiptDate: string | null;

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

  // ── ผูกกับทะเบียนคุมเงิน (financial_transactions) ─────────────────────────
  // ตอนยืม → ตัดยอดประเภทเงิน (type=-1) ; ตอนคืนเงินสด → คืนยอด (type=+1)
  @Column({
    name: 'ft_borrow_id',
    type: 'int',
    nullable: true,
    comment: 'FK financial_transactions.ft_id (รายการตัดยอดตอนยืม)',
  })
  ftBorrowId: number | null;

  @Column({
    name: 'ft_return_id',
    type: 'int',
    nullable: true,
    comment: 'FK financial_transactions.ft_id (รายการคืนเงินสดตอนส่งใช้)',
  })
  ftReturnId: number | null;

  /**
   * สถานะ (workflow สัญญายืมเงิน ตัวอย่างที่ 34):
   *  10 = รอตรวจสอบ (สร้างสัญญาแล้ว ยังไม่ตัดยอดเงิน)
   *  11 = รออนุมัติ (ตรวจสอบแล้ว)
   *  12 = รอรับเงิน (อนุมัติแล้ว)
   *   1 = ค้างชำระ (รับเงินแล้ว ตัดยอดเงินจากประเภท)
   *   2 = คืนแล้ว (ส่งใช้ครบ)
   *   3 = ยกเลิก
   */
  @Column({
    type: 'int',
    default: 10,
    comment: '10=รอตรวจสอบ|11=รออนุมัติ|12=รอรับเงิน|1=ค้างชำระ|2=คืนแล้ว|3=ยกเลิก',
  })
  status: number;

  @Column({ type: 'text', nullable: true }) note: string | null;
  @Column({ name: 'up_by', type: 'int', default: 0 }) upBy: number;
  @Column({ type: 'int', default: 0 }) del: number;

  @CreateDateColumn({ name: 'create_date', type: 'datetime', nullable: true })
  createDate: Date | null;
  @UpdateDateColumn({ name: 'update_date', type: 'datetime', nullable: true })
  updateDate: Date | null;
}
