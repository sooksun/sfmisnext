import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Index(['scId', 'del'])
@Entity('supplie_request')
export class SupplieRequest {
  @PrimaryGeneratedColumn({ name: 'req_id' })
  reqId: number;

  @Column({ name: 'sc_id', type: 'int' })
  scId: number;

  @Column({
    name: 'req_no',
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: 'เลขที่ใบเบิก',
  })
  reqNo: string | null;

  @Column({ name: 'req_date', type: 'date', nullable: true })
  reqDate: Date | null;

  @Column({
    name: 'requester_id',
    type: 'int',
    nullable: true,
    comment: 'admin_id ผู้เบิก',
  })
  requesterId: number | null;

  @Column({
    name: 'requester_name',
    type: 'varchar',
    length: 200,
    nullable: true,
  })
  requesterName: string | null;

  @Column({
    name: 'department',
    type: 'varchar',
    length: 200,
    nullable: true,
    comment: 'หน่วยงาน/ฝ่าย',
  })
  department: string | null;

  @Column({
    name: 'purpose',
    type: 'text',
    nullable: true,
    comment: 'วัตถุประสงค์การเบิก',
  })
  purpose: string | null;

  @Column({
    name: 'status',
    type: 'int',
    default: 0,
    comment: '0=ร่าง 1=ส่งคำขอ 2=อนุมัติ 3=เบิกจ่ายแล้ว 9=ยกเลิก',
  })
  status: number;

  @Column({ name: 'approved_by', type: 'int', nullable: true })
  approvedBy: number | null;

  @Column({ name: 'approved_date', type: 'datetime', nullable: true })
  approvedDate: Date | null;

  @Column({
    name: 'issued_by',
    type: 'int',
    nullable: true,
    comment: 'admin_id ผู้จ่าย',
  })
  issuedBy: number | null;

  @Column({ name: 'issued_date', type: 'datetime', nullable: true })
  issuedDate: Date | null;

  @Column({ name: 'reject_reason', type: 'text', nullable: true })
  rejectReason: string | null;

  @Column({ name: 'up_by', type: 'int', default: 0 })
  upBy: number;

  @Column({ type: 'int', default: 0 })
  del: number;

  @CreateDateColumn({ name: 'create_date', type: 'datetime', nullable: true })
  createDate: Date | null;

  @UpdateDateColumn({ name: 'update_date', type: 'datetime', nullable: true })
  updateDate: Date | null;
}
