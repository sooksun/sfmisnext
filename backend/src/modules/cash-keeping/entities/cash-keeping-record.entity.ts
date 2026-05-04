import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * บันทึกการรับเงินเพื่อเก็บรักษา
 * ใช้เมื่อสถานศึกษาไม่มีตู้นิรภัย
 * ระเบียบ: หัวหน้าสถานศึกษา (ผอ.) รับเงินเก็บรักษา → ลงนาม "บันทึกการรับเงินเพื่อเก็บรักษา"
 */
@Index(['scId', 'syId', 'del'])
@Entity('cash_keeping_record')
export class CashKeepingRecord {
  @PrimaryGeneratedColumn({ name: 'ckr_id' }) ckrId: number;
  @Column({ name: 'sc_id', type: 'int', default: 0 }) scId: number;
  @Column({ name: 'sy_id', type: 'int', default: 0 }) syId: number;
  @Column({
    name: 'record_date',
    type: 'date',
    nullable: true,
    comment: 'วันที่รับเก็บรักษา',
  })
  recordDate: string | null;
  @Column({ type: 'float', default: 0 }) amount: number;

  // รายละเอียดเงินที่นำมาเก็บรักษา (ประเภทเงิน + จำนวน)
  @Column({
    name: 'money_detail',
    type: 'text',
    nullable: true,
    comment: 'รายการเงินที่รับเก็บ',
  })
  moneyDetail: string | null;

  // ผู้ส่ง (เจ้าหน้าที่การเงิน)
  @Column({ name: 'sender_id', type: 'int', default: 0 }) senderId: number;
  @Column({
    name: 'sender_name',
    type: 'varchar',
    length: 200,
    nullable: true,
    comment: 'snapshot ชื่อผู้ส่ง',
  })
  senderName: string | null;
  @Column({
    name: 'sender_position',
    type: 'varchar',
    length: 200,
    nullable: true,
  })
  senderPosition: string | null;

  // ผู้รับ (ผู้อำนวยการ)
  @Column({ name: 'receiver_id', type: 'int', default: 0 }) receiverId: number;
  @Column({
    name: 'receiver_name',
    type: 'varchar',
    length: 200,
    nullable: true,
    comment: 'snapshot ชื่อผอ.',
  })
  receiverName: string | null;
  @Column({
    name: 'receiver_position',
    type: 'varchar',
    length: 200,
    nullable: true,
  })
  receiverPosition: string | null;

  @Column({ type: 'text', nullable: true }) note: string | null;

  /**
   * สถานะ: 1 = ผอ.รับเก็บรักษาอยู่, 2 = ส่งคืนเจ้าหน้าที่แล้ว
   */
  @Column({ type: 'int', default: 1, comment: '1=รับเก็บรักษา|2=ส่งคืนแล้ว' })
  status: number;

  @Column({
    name: 'returned_date',
    type: 'date',
    nullable: true,
    comment: 'วันที่ส่งคืน',
  })
  returnedDate: string | null;
  @Column({ name: 'returned_amount', type: 'float', nullable: true })
  returnedAmount: number | null;
  @Column({ name: 'return_note', type: 'text', nullable: true }) returnNote:
    | string
    | null;

  @Column({ name: 'up_by', type: 'int', default: 0 }) upBy: number;
  @Column({ type: 'int', default: 0 }) del: number;

  @CreateDateColumn({ name: 'create_date', type: 'datetime', nullable: true })
  createDate: Date | null;
  @UpdateDateColumn({ name: 'update_date', type: 'datetime', nullable: true })
  updateDate: Date | null;
}
