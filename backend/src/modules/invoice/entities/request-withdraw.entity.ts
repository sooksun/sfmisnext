import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('request_withdraw')
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
      '0 = กำลังทำ | 100 = ส่งหัวหน้าการเงิน | 101 = หัวหน้าไม่อนุมัติ | 102 = หัวหน้าอนุมัติ | 200 = ผอ. อนุมัติ | 201 = ยกเลิกเช็ค | 202 = ออกเช็ค',
  })
  status: number;

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

  @CreateDateColumn({ name: 'create_date', type: 'datetime', nullable: true })
  createDate: Date | null;

  @UpdateDateColumn({ name: 'update_date', type: 'datetime', nullable: true })
  updateDate: Date | null;
}
