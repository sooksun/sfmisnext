import {
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('request_withdraw')
@Index(['scId', 'del'])
@Index(['scId', 'syId', 'del'])
// เลขที่เช็คห้ามซ้ำในโรงเรียน+ปีเดียวกัน (NULL ได้หลายแถว — ใบที่ยังไม่ออกเช็ค)
@Index('uidx_check_no', ['scId', 'syId', 'checkNoDoc'], { unique: true })
export class RequestWithdraw {
  @PrimaryGeneratedColumn({ name: 'rw_id' })
  rwId: number;

  @Column({ name: 'sc_id', type: 'int', default: 0 })
  scId: number;

  @Column({ name: 'no_doc', type: 'varchar', length: 45, nullable: true })
  noDoc: string | null;

  @Column({
    name: 'payment_type',
    type: 'int',
    default: 0,
    comment:
      'ประเภทเงินที่ได้จ่าย: 1. ค่าวัสดุ | 2. ค่าจ้างทำของ | 3. ค่าบริการ',
  })
  paymentType: number;

  @Column({ name: 'bg_type_id', type: 'int', default: 0 })
  bgTypeId: number;

  @Column({
    name: 'rw_type',
    type: 'int',
    default: 0,
    comment:
      '1 = เงินยืม | 2 = ค่าเดินทาง | 3 = ค่าพัสดุบริการ | 4 = หักภาษี ณ ที่จ่าย',
  })
  rwType: number;

  @Column({
    name: 'order_id',
    type: 'int',
    default: 0,
    comment:
      'key จาก parcel_order จะมีค่าเมื่อเลือกประเภทขอเบิกเป็น วัสดุ/อุปกรณ์',
  })
  orderId: number;

  @Column({
    name: 'tr_id',
    type: 'int',
    default: 0,
    comment:
      'FK travel_reimbursement.tr_id (เชื่อมใบขอเบิกค่าเดินทางที่อนุมัติแล้ว)',
  })
  trId: number;

  @Column({
    name: 'la_id',
    type: 'int',
    default: 0,
    comment: 'FK loan_agreement.la_id (เชื่อมใบยืมเงินที่อนุมัติแล้ว)',
  })
  laId: number;

  @Column({
    name: 'p_id',
    type: 'int',
    default: 0,
    comment:
      'p_id key จะมาจาก partner จะมีค่าเมื่อเลือกประเภทขอเบิกเป็น วัสดุ/อุปกรณ์',
  })
  pId: number;

  @Column({ type: 'text', nullable: true })
  detail: string | null;

  @Column({ type: 'float', default: 0 })
  amount: number;

  @Column({
    name: 'certificate_payment',
    type: 'int',
    default: 1,
    comment: '1 บค | 2 บจ',
  })
  certificatePayment: number;

  @Column({ name: 'date_request', type: 'date', nullable: true })
  dateRequest: Date | null;

  @Column({ name: 'user_request_head', type: 'int', default: 0 })
  userRequestHead: number;

  @Column({ name: 'user_request', type: 'int', default: 0 })
  userRequest: number;

  @Column({ name: 'user_offer_check', type: 'int', default: 0 })
  userOfferCheck: number;

  @Column({
    name: 'receipt_number',
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: 'เลขที่ใบสำคัญคู่จ่าย/เลขใบเสร็จ',
  })
  receiptNumber: string | null;

  @Column({
    name: 'receipt_picture',
    type: 'text',
    nullable: true,
    comment: 'รูปใบสำคัญคู่จ่าย/รูปใบเสร็จ',
  })
  receiptPicture: string | null;

  @Column({ name: 'offer_check_date', type: 'date', nullable: true })
  offerCheckDate: Date | null;

  @Column({ name: 'check_no_doc', type: 'varchar', length: 45, nullable: true })
  checkNoDoc: string | null;

  @Column({
    name: 'ba_id',
    type: 'int',
    nullable: true,
    comment: 'บัญชีธนาคารที่สั่งจ่าย (เช็ค/โอน) — auto-sync ทะเบียนคุมเงินฝากธนาคาร',
  })
  baId: number | null;

  @Column({
    name: 'type_offer_check',
    type: 'int',
    default: 0,
    comment: '1 = บค | 2 = บจ',
  })
  typeOfferCheck: number;

  @Column({
    type: 'int',
    default: 0,
    comment:
      '0 = ร่าง | 50 = รอเจ้าหน้าที่ตรวจฎีกา | 51 = ตรวจไม่ผ่าน (ส่งกลับแก้ไข) | 100 = ตรวจแล้ว รอหัวหน้าอนุมัติ | 101 = หัวหน้าไม่อนุมัติ | 102 = หัวหน้าอนุมัติ | 200 = ผอ. อนุมัติ | 201 = ยกเลิกเช็ค | 202 = ออกเช็ค',
  })
  status: number;

  @Column({
    name: 'precheck_by',
    type: 'int',
    nullable: true,
    comment: 'admin_id เจ้าหน้าที่ตรวจฎีกา (type=5)',
  })
  precheckBy: number | null;

  @Column({
    name: 'precheck_date',
    type: 'datetime',
    nullable: true,
    comment: 'วันที่ตรวจฎีกา',
  })
  precheckDate: Date | null;

  @Column({
    name: 'precheck_note',
    type: 'text',
    nullable: true,
    comment: 'หมายเหตุการตรวจฎีกา / เหตุผลตีกลับ',
  })
  precheckNote: string | null;

  @Column({ type: 'text', nullable: true })
  remark: string | null;

  @Column({ name: 'sy_id', type: 'int', default: 0 })
  syId: number;

  @Column({ type: 'varchar', length: 45, nullable: true })
  year: string | null;

  @Column({ name: 'up_by', type: 'int', default: 0 })
  upBy: number;

  @Column({ type: 'int', default: 0 })
  del: number;

  // ── ข้อมูลเงินยืม (rw_type = 1) ─────────────────────────────────────────

  @Column({
    name: 'loan_type',
    type: 'int',
    nullable: true,
    comment: '1=เงินสวัสดิการ | 2=โครงการ | 3=กิจกรรม',
  })
  loanType: number | null;

  @Column({
    name: 'loan_start_date',
    type: 'date',
    nullable: true,
    comment: 'วันที่ยืมเงิน',
  })
  loanStartDate: string | null;

  @Column({
    name: 'loan_return_due_date',
    type: 'date',
    nullable: true,
    comment: 'กำหนดส่งคืน (auto: loan_start_date + 30 วัน)',
  })
  loanReturnDueDate: string | null;

  @Column({
    name: 'loan_returned_date',
    type: 'date',
    nullable: true,
    comment: 'วันที่คืนจริง',
  })
  loanReturnedDate: string | null;

  @Column({
    name: 'loan_return_cash',
    type: 'float',
    nullable: true,
    default: 0,
    comment: 'เงินสดคืน',
  })
  loanReturnCash: number | null;

  @Column({
    name: 'loan_return_voucher_amount',
    type: 'float',
    nullable: true,
    default: 0,
    comment: 'ใบสำคัญคืน',
  })
  loanReturnVoucherAmount: number | null;

  // ── ข้อมูลบัญชีโรงเรียน (Finance module) ───────────────────────────────────

  /**
   * ประเภทรายจ่าย (expense_type):
   * 1=ลูกจ้างชั่วคราว 2=ค่าตอบแทน 3=ค่าใช้สอย 4=ค่าวัสดุ 5=สาธารณูปโภค
   * 6=ครุภัณฑ์ 7=ที่ดินสิ่งก่อสร้าง 8=เงินฝาก 9=ทุนการศึกษา
   */
  @Column({
    name: 'expense_type',
    type: 'int',
    nullable: true,
    comment:
      '1=ลูกจ้าง|2=ตอบแทน|3=ใช้สอย|4=วัสดุ|5=สาธารณูปโภค|6=ครุภัณฑ์|7=ที่ดิน|8=เงินฝาก|9=ทุน',
  })
  expenseType: number | null;

  @Column({
    name: 'is_check',
    type: 'tinyint',
    default: 0,
    comment: '1=จ่ายด้วยเช็ค',
  })
  isCheck: number;

  @Column({
    name: 'payee_name',
    type: 'varchar',
    length: 200,
    nullable: true,
    comment: 'ผู้รับเงิน/ผู้รับเช็ค',
  })
  payeeName: string | null;

  @Column({
    name: 'main_register_id',
    type: 'int',
    nullable: true,
    comment: 'FK main_register.mr_id',
  })
  mainRegisterId: number | null;

  @CreateDateColumn({ name: 'create_date', type: 'datetime', nullable: true })
  createDate: Date | null;

  @UpdateDateColumn({ name: 'update_date', type: 'datetime', nullable: true })
  updateDate: Date | null;
}
