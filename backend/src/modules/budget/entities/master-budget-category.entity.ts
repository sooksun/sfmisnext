import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('master_budget_category')
export class MasterBudgetCategory {
  @PrimaryGeneratedColumn({ name: 'bg_cate_id' })
  bgCateId: number;

  @Column({ name: 'budget_cate', type: 'varchar', length: 100 })
  budgetCate: string;

  @Column({ type: 'float', precision: 10, scale: 2 })
  percents: number;
}
