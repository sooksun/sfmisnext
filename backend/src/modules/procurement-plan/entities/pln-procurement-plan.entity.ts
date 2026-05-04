import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Index(['scId', 'acadYear', 'del'])
@Entity('pln_procurement_plan')
export class PlnProcurementPlan {
  @PrimaryGeneratedColumn({ name: 'pp_id' })
  ppId: number;

  @Column({ name: 'sc_id', type: 'int', nullable: true })
  scId: number | null;

  @Column({ name: 'acad_year', type: 'int', nullable: true })
  acadYear: number | null;

  @Column({ name: 'pp_no', type: 'varchar', length: 50, nullable: true })
  ppNo: string | null;

  @Column({ name: 'pp_title', type: 'varchar', length: 255, nullable: true })
  ppTitle: string | null;

  @Column({ name: 'pp_total_budget', type: 'float', default: 0 })
  ppTotalBudget: number;

  @Column({ name: 'pp_source', type: 'int', nullable: true })
  ppSource: number | null;

  @Column({ name: 'announce_date', type: 'date', nullable: true })
  announceDate: Date | null;

  @Column({
    name: 'announce_url',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  announceUrl: string | null;

  @Column({
    name: 'pp_status',
    type: 'int',
    default: 0,
    comment: '0=ร่าง 1=ประกาศแล้ว 2=ปรับปรุง 9=ยกเลิก',
  })
  ppStatus: number;

  @Column({ type: 'text', nullable: true })
  remark: string | null;

  @Column({ name: 'up_by', type: 'int', default: 0 })
  upBy: number;

  @Column({ type: 'int', default: 0 })
  del: number;

  @CreateDateColumn({ name: 'create_date', type: 'datetime', nullable: true })
  createDate: Date | null;

  @UpdateDateColumn({ name: 'update_date', type: 'datetime', nullable: true })
  updateDate: Date | null;
}
