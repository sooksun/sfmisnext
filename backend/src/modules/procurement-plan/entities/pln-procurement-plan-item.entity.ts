import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Index(['ppId', 'del'])
@Entity('pln_procurement_plan_item')
export class PlnProcurementPlanItem {
  @PrimaryGeneratedColumn({ name: 'ppi_id' })
  ppiId: number;

  @Column({ name: 'pp_id', type: 'int' })
  ppId: number;

  @Column({ name: 'project_id', type: 'int', nullable: true })
  projectId: number | null;

  @Column({ name: 'item_title', type: 'varchar', length: 255, nullable: true })
  itemTitle: string | null;

  @Column({ name: 'item_budget', type: 'float', default: 0 })
  itemBudget: number;

  @Column({ name: 'buy_month', type: 'int', nullable: true })
  buyMonth: number | null;

  @Column({
    name: 'method_type',
    type: 'int',
    default: 3,
    comment: '1=e-bidding 2=คัดเลือก 3=เฉพาะเจาะจง 4=ตลาด',
  })
  methodType: number;

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
