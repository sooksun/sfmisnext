import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Index(['scId', 'budgetYear', 'del'])
@Entity('pln_budget_transfer')
export class BudgetTransfer {
  @PrimaryGeneratedColumn({ name: 'bt_id' })
  btId: number;

  @Column({ name: 'bt_no', type: 'varchar', length: 50 })
  btNo: string;

  @Column({ name: 'bt_date', type: 'date' })
  btDate: string;

  @Column({ name: 'sc_id', type: 'int' })
  scId: number;

  @Column({ name: 'sy_id', type: 'int' })
  syId: number;

  @Column({ name: 'budget_year', type: 'int' })
  budgetYear: number;

  @Column({
    name: 'from_category_id',
    type: 'int',
    comment: 'pln_budget_category.pbc_id',
  })
  fromCategoryId: number;

  @Column({ name: 'from_project_id', type: 'int', nullable: true })
  fromProjectId: number | null;

  @Column({ name: 'to_category_id', type: 'int' })
  toCategoryId: number;

  @Column({ name: 'to_project_id', type: 'int', nullable: true })
  toProjectId: number | null;

  @Column({
    name: 'amount',
    type: 'decimal',
    precision: 15,
    scale: 2,
    default: 0,
  })
  amount: number;

  @Column({ name: 'reason', type: 'text' })
  reason: string;

  @Column({ name: 'requested_by', type: 'int', nullable: true })
  requestedBy: number | null;

  @Column({ name: 'approved_by', type: 'int', nullable: true })
  approvedBy: number | null;

  @Column({ name: 'approved_date', type: 'date', nullable: true })
  approvedDate: string | null;

  @Column({
    name: 'status',
    type: 'tinyint',
    default: 0,
    comment: '0=ร่าง 1=รออนุมัติ 2=อนุมัติ 3=ไม่อนุมัติ 9=ยกเลิก',
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
