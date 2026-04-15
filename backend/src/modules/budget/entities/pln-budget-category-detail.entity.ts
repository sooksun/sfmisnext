import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('pln_budget_category_detail')
export class PlnBudgetCategoryDetail {
  @PrimaryGeneratedColumn({ name: 'pbcd_id' })
  pbcdId: number;

  @Column({ name: 'bg_type_id', type: 'int', nullable: true })
  bgTypeId: number | null;

  @Column({ name: 'pbc_id', type: 'int', nullable: true })
  pbcId: number | null;

  @Column({ type: 'int', default: 0 })
  budget: number;

  @Column({ name: 'budget_year', type: 'int', nullable: true })
  budgetYear: number | null;

  @Column({ type: 'int', default: 0 })
  del: number;

  @Column({ name: 'up_by', type: 'int', nullable: true })
  upBy: number | null;

  @CreateDateColumn({ name: 'create_date', type: 'datetime', nullable: true })
  createDate: Date;

  @UpdateDateColumn({ name: 'update_date', type: 'datetime', nullable: true })
  updateDate: Date;
}
