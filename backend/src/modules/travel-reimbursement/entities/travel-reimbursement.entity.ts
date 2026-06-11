import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * ใบเบิกค่าใช้จ่ายในการเดินทางไปราชการ (แบบ 8708 ส่วนที่ 1)
 * Workflow: ครูยื่นเอง → เจ้าหน้าที่การเงินตรวจสอบ → ผอ.อนุมัติ → จ่ายเงิน (ลงเป็น บค.)
 *   status: 10=รอตรวจสอบ | 11=รออนุมัติ | 12=รอจ่าย | 2=จ่ายแล้ว | 3=ยกเลิก
 */
@Index(['scId', 'syId', 'del'])
@Entity('travel_reimbursement')
export class TravelReimbursement {
  @PrimaryGeneratedColumn({ name: 'tr_id' }) trId: number;
  @Column({ name: 'sc_id', type: 'int', default: 0 }) scId: number;
  @Column({ name: 'sy_id', type: 'int', default: 0 }) syId: number;
  @Column({ name: 'budget_year', type: 'varchar', length: 10, nullable: true })
  budgetYear: string | null;

  // ── ผู้ขอเบิก / ผู้เดินทาง (หลัก) ─────────────────────────────────────────
  @Column({ name: 'requester_id', type: 'int', default: 0 })
  requesterId: number;
  @Column({
    name: 'requester_name',
    type: 'varchar',
    length: 200,
    nullable: true,
  })
  requesterName: string | null;
  @Column({
    name: 'requester_position',
    type: 'varchar',
    length: 200,
    nullable: true,
  })
  requesterPosition: string | null;
  @Column({ name: 'affiliation', type: 'varchar', length: 255, nullable: true })
  affiliation: string | null;
  @Column({ name: 'province', type: 'varchar', length: 100, nullable: true })
  province: string | null;
  @Column({
    name: 'at_office',
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'ที่ทำการ',
  })
  atOffice: string | null;

  // ── อ้างอิงคำสั่ง/บันทึกอนุมัติเดินทาง ────────────────────────────────────
  @Column({
    name: 'order_ref',
    type: 'varchar',
    length: 200,
    nullable: true,
    comment: 'ตามคำสั่ง/บันทึก ที่',
  })
  orderRef: string | null;
  @Column({ name: 'order_date', type: 'date', nullable: true })
  orderDate: string | null;

  // ── การเดินทาง ────────────────────────────────────────────────────────────
  @Column({
    type: 'text',
    nullable: true,
    comment: 'เดินทางไปปฏิบัติราชการ (วัตถุประสงค์/สถานที่)',
  })
  purpose: string | null;
  @Column({
    type: 'text',
    nullable: true,
    comment: 'พร้อมด้วย (ผู้ร่วมเดินทาง)',
  })
  companions: string | null;
  @Column({
    name: 'depart_from',
    type: 'int',
    default: 2,
    comment: '1=บ้านพัก|2=สำนักงาน|3=ประเทศไทย',
  })
  departFrom: number;
  @Column({ name: 'depart_date', type: 'date', nullable: true }) departDate:
    | string
    | null;
  @Column({ name: 'depart_time', type: 'varchar', length: 10, nullable: true })
  departTime: string | null;
  @Column({ name: 'return_date', type: 'date', nullable: true }) returnDate:
    | string
    | null;
  @Column({ name: 'return_time', type: 'varchar', length: 10, nullable: true })
  returnTime: string | null;
  @Column({ name: 'total_days', type: 'float', default: 0 }) totalDays: number;
  @Column({ name: 'total_hours', type: 'float', default: 0 })
  totalHours: number;

  // ── ประเภทเงิน + เชื่อมเงินยืม ────────────────────────────────────────────
  @Column({ name: 'money_type_id', type: 'int', default: 0 })
  moneyTypeId: number;
  @Column({
    name: 'money_type_name',
    type: 'varchar',
    length: 200,
    nullable: true,
  })
  moneyTypeName: string | null;
  @Column({
    name: 'la_id',
    type: 'int',
    nullable: true,
    comment: 'FK loan_agreement.la_id (เงินยืมค่าเดินทางที่จะส่งใช้)',
  })
  laId: number | null;

  // ── ยอดเบิก (สรุปจาก travelers) ───────────────────────────────────────────
  @Column({
    name: 'allowance_total',
    type: 'float',
    default: 0,
    comment: 'ค่าเบี้ยเลี้ยง',
  })
  allowanceTotal: number;
  @Column({
    name: 'lodging_total',
    type: 'float',
    default: 0,
    comment: 'ค่าเช่าที่พัก',
  })
  lodgingTotal: number;
  @Column({
    name: 'transport_total',
    type: 'float',
    default: 0,
    comment: 'ค่าพาหนะ',
  })
  transportTotal: number;
  @Column({
    name: 'other_total',
    type: 'float',
    default: 0,
    comment: 'ค่าใช้จ่ายอื่น',
  })
  otherTotal: number;
  @Column({ name: 'grand_total', type: 'float', default: 0 })
  grandTotal: number;
  @Column({
    name: 'evidence_count',
    type: 'int',
    default: 0,
    comment: 'จำนวนหลักฐานแนบ (ฉบับ)',
  })
  evidenceCount: number;

  // ── workflow อนุมัติ ──────────────────────────────────────────────────────
  @Column({ name: 'verify_by', type: 'int', nullable: true }) verifyBy:
    | number
    | null;
  @Column({ name: 'verify_name', type: 'varchar', length: 200, nullable: true })
  verifyName: string | null;
  @Column({ name: 'verify_date', type: 'date', nullable: true }) verifyDate:
    | string
    | null;
  @Column({ name: 'approve_by', type: 'int', nullable: true }) approveBy:
    | number
    | null;
  @Column({
    name: 'approve_name',
    type: 'varchar',
    length: 200,
    nullable: true,
  })
  approveName: string | null;
  @Column({ name: 'approve_date', type: 'date', nullable: true }) approveDate:
    | string
    | null;

  // ── การจ่ายเงิน (ใบสำคัญจ่าย บค.) ─────────────────────────────────────────
  @Column({
    name: 'receipt_date',
    type: 'date',
    nullable: true,
    comment: 'วันที่จ่าย/รับเงิน',
  })
  receiptDate: string | null;
  @Column({
    name: 'type_offer_check',
    type: 'int',
    default: 1,
    comment: 'ช่องทางจ่าย 1=เงินสด(บค.)|2=เช็ค/ธนาคาร(บจ.)',
  })
  typeOfferCheck: number;
  @Column({
    name: 'bc_no',
    type: 'varchar',
    length: 45,
    nullable: true,
    comment: 'เลขที่ใบสำคัญจ่าย บค./บจ.',
  })
  bcNo: string | null;
  @Column({
    name: 'ft_pay_id',
    type: 'int',
    nullable: true,
    comment: 'FT จ่ายเงิน (type=-1)',
  })
  ftPayId: number | null;
  @Column({
    name: 'ft_return_id',
    type: 'int',
    nullable: true,
    comment: 'FT คืนเงินสด (กรณีเชื่อมเงินยืมและจ่ายจริง<ยืม)',
  })
  ftReturnId: number | null;

  @Column({
    type: 'int',
    default: 10,
    comment: '10=รอตรวจสอบ|11=รออนุมัติ|12=รอจ่าย|2=จ่ายแล้ว|3=ยกเลิก',
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
