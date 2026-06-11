import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * กรรมการเก็บรักษาเงิน / ผู้ตรวจสอบการรับ-จ่ายเงินประจำวัน (ตามคำสั่ง ตย.41/42)
 *  - role 'keeper'  = กรรมการเก็บรักษาเงิน (3 คน) — ลงนามรายงานเงินคงเหลือประจำวัน (ตย.19)
 *  - role 'auditor' = ผู้ตรวจสอบการรับ-จ่ายเงินประจำวัน (1 คน)
 *  - เก็บเลขที่/วันที่คำสั่งไว้พิมพ์คำสั่งแต่งตั้ง (ตย.41/42)
 */
@Index(['scId', 'del'])
@Entity('cash_keeping_committee')
export class CashKeepingCommittee {
  @PrimaryGeneratedColumn({ name: 'ckc_id' }) ckcId: number;
  @Column({ name: 'sc_id', type: 'int', default: 0 }) scId: number;

  @Column({
    name: 'role',
    type: 'varchar',
    length: 16,
    default: 'keeper',
    comment: 'keeper=กรรมการเก็บรักษาเงิน | auditor=ผู้ตรวจสอบประจำวัน',
  })
  role: string;

  @Column({ name: 'seq', type: 'int', default: 1, comment: 'ลำดับในชุด' })
  seq: number;

  @Column({ name: 'name', type: 'varchar', length: 200 }) name: string;
  @Column({ name: 'position', type: 'varchar', length: 200, nullable: true })
  position: string | null;

  @Column({
    name: 'order_no',
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: 'เลขที่คำสั่ง เช่น 35/2555',
  })
  orderNo: string | null;

  @Column({ name: 'order_date', type: 'date', nullable: true })
  orderDate: string | null;

  @Column({ name: 'up_by', type: 'int', default: 0 }) upBy: number;
  @Column({ type: 'int', default: 0 }) del: number;

  @CreateDateColumn({ name: 'create_date', type: 'datetime', nullable: true })
  createDate: Date | null;
  @UpdateDateColumn({ name: 'update_date', type: 'datetime', nullable: true })
  updateDate: Date | null;
}
