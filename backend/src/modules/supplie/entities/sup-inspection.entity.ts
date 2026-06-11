import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Index(['orderId', 'del'])
@Entity('sup_inspection')
export class SupInspection {
  @PrimaryGeneratedColumn({ name: 'insp_id' })
  inspId: number;

  @Column({ name: 'order_id', type: 'int', nullable: true })
  orderId: number | null;

  @Column({ name: 'ct_id', type: 'int', nullable: true })
  ctId: number | null;

  @Column({ name: 'sc_id', type: 'int', nullable: true })
  scId: number | null;

  @Column({ name: 'insp_date', type: 'date', nullable: true })
  inspDate: Date | null;

  @Column({
    name: 'insp_result',
    type: 'int',
    default: 1,
    comment: '1=ผ่าน 2=ไม่ผ่าน 3=ผ่านบางส่วน',
  })
  inspResult: number;

  @Column({ name: 'insp_note', type: 'text', nullable: true })
  inspNote: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  committee1: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  committee2: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  committee3: string | null;

  @Column({ name: 'report_no', type: 'varchar', length: 50, nullable: true })
  reportNo: string | null;

  @Column({ name: 'report_date', type: 'date', nullable: true })
  reportDate: Date | null;

  @Column({
    name: 'stock_posted',
    type: 'int',
    default: 0,
    comment: '0=ยังไม่ลงสต็อก 1=ลงสต็อกแล้ว',
  })
  stockPosted: number;

  @Column({ name: 'up_by', type: 'int', default: 0 })
  upBy: number;

  @Column({ type: 'int', default: 0 })
  del: number;

  @CreateDateColumn({ name: 'create_date', type: 'datetime', nullable: true })
  createDate: Date | null;

  @UpdateDateColumn({ name: 'update_date', type: 'datetime', nullable: true })
  updateDate: Date | null;
}
