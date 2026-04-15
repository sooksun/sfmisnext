import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('budget_income_type_school')
export class BudgetIncomeTypeSchool {
  @PrimaryGeneratedColumn({ name: 'bg_type_school_id' })
  bgTypeSchoolId: number;

  @Column({ name: 'sc_id', type: 'int', nullable: true })
  scId: number;

  @Column({ name: 'ba_id', type: 'int', nullable: true })
  baId: number;

  @Column({ name: 'bg_type_id', type: 'int', nullable: true })
  bgTypeId: number;

  @Column({ name: 'up_by', type: 'int', nullable: true })
  upBy: number;

  @Column({ type: 'int', default: 0 })
  del: number;

  @CreateDateColumn({ name: 'create_date', nullable: true })
  createDate: Date;

  @UpdateDateColumn({ name: 'update_date', nullable: true })
  updateDate: Date;
}
