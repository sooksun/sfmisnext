import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Index(['scId', 'del'])
@Index(['orderId', 'announceType'])
@Entity('pln_egp_announcement')
export class EgpAnnouncement {
  @PrimaryGeneratedColumn({ name: 'ea_id' })
  eaId: number;

  @Column({ name: 'sc_id', type: 'int' })
  scId: number;

  @Column({ name: 'budget_year', type: 'int' })
  budgetYear: number;

  @Column({
    name: 'plan_id',
    type: 'int',
    nullable: true,
    comment: 'procurement_plan.plan_id',
  })
  planId: number | null;

  @Column({
    name: 'order_id',
    type: 'int',
    nullable: true,
    comment: 'parcel_order.order_id',
  })
  orderId: number | null;

  @Column({
    name: 'announce_type',
    type: 'tinyint',
    comment: '1=ประกาศแผน 2=ราคากลาง 3=เชิญชวน 4=ผู้ชนะ 5=ยกเลิก 6=ร่าง TOR',
  })
  announceType: number;

  @Column({
    name: 'ref_no',
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'เลขที่ประกาศ',
  })
  refNo: string | null;

  @Column({
    name: 'egp_ref',
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'เลขที่อ้างอิงในระบบ e-GP',
  })
  egpRef: string | null;

  @Column({ name: 'announce_date', type: 'date' })
  announceDate: string;

  @Column({ name: 'title', type: 'varchar', length: 500 })
  title: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description: string | null;

  @Column({
    name: 'estimated_price',
    type: 'decimal',
    precision: 15,
    scale: 2,
    default: 0,
  })
  estimatedPrice: number;

  @Column({
    name: 'winner_name',
    type: 'varchar',
    length: 250,
    nullable: true,
    comment: 'ใช้กับ announce_type=4',
  })
  winnerName: string | null;

  @Column({
    name: 'winning_price',
    type: 'decimal',
    precision: 15,
    scale: 2,
    default: 0,
  })
  winningPrice: number;

  @Column({ name: 'file_url', type: 'varchar', length: 500, nullable: true })
  fileUrl: string | null;

  @Column({
    name: 'egp_url',
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: 'ลิงก์ที่ publish บน process.gprocurement.go.th',
  })
  egpUrl: string | null;

  @Column({
    name: 'status',
    type: 'tinyint',
    default: 0,
    comment: '0=ร่าง 1=เผยแพร่ 2=ปิดประกาศ 9=ยกเลิก',
  })
  status: number;

  @Column({ name: 'note', type: 'text', nullable: true })
  note: string | null;

  @Column({ name: 'up_by', type: 'int', nullable: true })
  upBy: number | null;

  @Column({ type: 'int', default: 0 })
  del: number;

  @CreateDateColumn({ name: 'create_date', type: 'datetime', nullable: true })
  createDate: Date | null;

  @UpdateDateColumn({ name: 'update_date', type: 'datetime', nullable: true })
  updateDate: Date | null;
}
