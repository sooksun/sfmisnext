import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('tb_estimate_acadyear')
export class TbEstimateAcadyear {
  @PrimaryGeneratedColumn({ name: 'ea_id' })
  eaId: number;

  @Column({ name: 'sc_id', type: 'int', nullable: true })
  scId: number | null;

  @Column({ name: 'sy_id', type: 'int', nullable: true })
  syId: number | null;

  @Column({ name: 'budget_year', type: 'varchar', length: 45, nullable: true })
  budgetYear: string | null;

  @Column({ name: 'ea_budget', type: 'float', default: 0 })
  eaBudget: number;

  @Column({ name: 'real_budget', type: 'float', default: 0 })
  realBudget: number;

  @Column({
    name: 'ea_status',
    type: 'int',
    default: 0,
    comment: '0 = Not Confirm | 1 = confirm',
  })
  eaStatus: number;

  @Column({ type: 'int', default: 0 })
  del: number;

  @Column({ name: 'up_by', type: 'int', nullable: true })
  upBy: number | null;

  @CreateDateColumn({ name: 'create_date', type: 'datetime', nullable: true })
  createDate: Date;

  @UpdateDateColumn({ name: 'update_date', type: 'datetime', nullable: true })
  updateDate: Date;
}
