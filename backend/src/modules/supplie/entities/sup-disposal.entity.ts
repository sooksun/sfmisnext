import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Index(['scId', 'del'])
@Entity('sup_disposal')
export class SupDisposal {
  @PrimaryGeneratedColumn({ name: 'dp_id' })
  dpId: number;

  @Column({ name: 'sc_id', type: 'int', nullable: true })
  scId: number | null;

  @Column({ name: 'supp_id', type: 'int', nullable: true })
  suppId: number | null;

  @Column({ type: 'int', default: 0 })
  qty: number;

  @Column({
    type: 'int',
    default: 1,
    comment: '1=ขาย 2=แลกเปลี่ยน 3=โอน 4=บริจาค 5=ทำลาย 6=ตัดจำหน่าย',
  })
  method: number;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ name: 'sold_amount', type: 'float', default: 0 })
  soldAmount: number;

  @Column({ name: 'approved_by', type: 'int', nullable: true })
  approvedBy: number | null;

  @Column({ name: 'approve_date', type: 'date', nullable: true })
  approveDate: Date | null;

  @Column({
    name: 'dp_status',
    type: 'int',
    default: 0,
    comment: '0=รอ 1=อนุมัติ 2=ดำเนินการแล้ว 9=ยกเลิก',
  })
  dpStatus: number;

  @Column({ name: 'up_by', type: 'int', default: 0 })
  upBy: number;

  @Column({ type: 'int', default: 0 })
  del: number;

  @CreateDateColumn({ name: 'create_date', type: 'datetime', nullable: true })
  createDate: Date | null;

  @UpdateDateColumn({ name: 'update_date', type: 'datetime', nullable: true })
  updateDate: Date | null;
}
