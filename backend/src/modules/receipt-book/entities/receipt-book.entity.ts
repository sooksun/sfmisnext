import {
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * ทะเบียนเล่มใบเสร็จรับเงิน
 * status: 1=กำลังใช้ | 2=หมดอายุ | 3=เลิกใช้(void)
 * กฎ: มีได้แค่ 1 เล่มที่ status=1 ต่อ (sc_id, budget_year)
 */
@Entity('receipt_book')
@Index('idx_receipt_book_sc_sy_year', ['scId', 'syId', 'budgetYear'])
export class ReceiptBook {
  @PrimaryGeneratedColumn({ name: 'rb_id' }) rbId: number;

  @Column({ name: 'sc_id', type: 'int', default: 0 }) scId: number;
  @Column({ name: 'sy_id', type: 'int', default: 0 }) syId: number;
  @Column({ name: 'budget_year', type: 'varchar', length: 10, nullable: true })
  budgetYear: string | null;

  @Column({
    name: 'book_code',
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: 'รหัสเล่ม เช่น เล่ม 1',
  })
  bookCode: string | null;

  @Column({
    name: 'from_no',
    type: 'int',
    default: 1,
    comment: 'เลขที่เริ่มต้น',
  })
  fromNo: number;
  @Column({ name: 'to_no', type: 'int', default: 50, comment: 'เลขที่สิ้นสุด' })
  toNo: number;
  @Column({
    name: 'current_no',
    type: 'int',
    default: 1,
    comment: 'เลขที่ปัจจุบัน (ใช้ไปถึง)',
  })
  currentNo: number;

  /**
   * 1 = กำลังใช้
   * 2 = หมดอายุ (ใช้ครบแล้ว / ปิดด้วยตนเอง)
   * 3 = เลิกใช้ (void)
   */
  @Column({
    type: 'int',
    default: 1,
    comment: '1=กำลังใช้|2=หมดอายุ|3=เลิกใช้',
  })
  status: number;

  @Column({
    name: 'opened_date',
    type: 'date',
    nullable: true,
    comment: 'วันเริ่มใช้',
  })
  openedDate: string | null;
  @Column({
    name: 'closed_date',
    type: 'date',
    nullable: true,
    comment: 'วันปิดเล่ม (ใช้ครบ)',
  })
  closedDate: string | null;
  @Column({
    name: 'voided_date',
    type: 'date',
    nullable: true,
    comment: 'วันยกเลิก',
  })
  voidedDate: string | null;

  @Column({ name: 'voided_by', type: 'int', nullable: true }) voidedBy:
    | number
    | null;
  @Column({
    name: 'voided_by_name',
    type: 'varchar',
    length: 200,
    nullable: true,
  })
  voidedByName: string | null;
  @Column({ name: 'void_reason', type: 'text', nullable: true }) voidReason:
    | string
    | null;

  // เลิกใช้เล่ม (ปรุ/เจาะรู/ประทับตราเลิกใช้) — สำหรับเล่มปีก่อนที่ใช้ไม่หมด (แบบ 2544 ข้อ 10.4)
  @Column({ name: 'retired_date', type: 'date', nullable: true })
  retiredDate: string | null;
  @Column({ name: 'retired_by', type: 'int', nullable: true })
  retiredBy: number | null;

  @Column({ type: 'text', nullable: true }) note: string | null;

  @Column({ name: 'up_by', type: 'int', default: 0 }) upBy: number;
  @Column({ type: 'int', default: 0 }) del: number;

  @CreateDateColumn({ name: 'create_date', type: 'datetime', nullable: true })
  createDate: Date | null;
  @UpdateDateColumn({ name: 'update_date', type: 'datetime', nullable: true })
  updateDate: Date | null;
}
