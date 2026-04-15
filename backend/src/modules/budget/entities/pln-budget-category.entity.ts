import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('pln_budget_category')
export class PlnBudgetCategory {
  @PrimaryGeneratedColumn({ name: 'pbc_id' })
  pbcId: number;

  @Column({ name: 'sc_id', type: 'int' })
  scId: number;

  @Column({ name: 'acad_year', type: 'int' })
  acadYear: number;

  @Column({ name: 'budget_year', type: 'varchar', length: 45, nullable: true })
  budgetYear: string | null;

  @Column({ name: 'bg_cate_id', type: 'int' })
  bgCateId: number;

  @Column({ type: 'float', precision: 10, scale: 2, default: 0 })
  percents: number;

  @Column({ type: 'float', precision: 10, scale: 2, default: 0 })
  total: number;

  @Column({ type: 'int', default: 0 })
  del: number;

  @Column({ name: 'up_by', type: 'int', nullable: true })
  upBy: number | null;

  @CreateDateColumn({ name: 'create_date', type: 'datetime', nullable: true })
  createDate: Date;

  @UpdateDateColumn({ name: 'update_date', type: 'datetime', nullable: true })
  updateDate: Date;
}
