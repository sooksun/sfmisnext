import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('master_budget_income_type')
export class BudgetIncomeType {
  @PrimaryGeneratedColumn({ name: 'bg_type_id' })
  bgTypeId: number;

  @Column({ name: 'budget_type', type: 'varchar', length: 250 })
  budgetType: string;

  @Column({ name: 'budget_type_calc', type: 'int', default: 0 })
  budgetTypeCalc: number; // 0 = ไม่คำนวน, 1 = คำนวน

  @Column({
    name: 'budget_borrow_type',
    type: 'varchar',
    length: 250,
    default: '2',
  })
  budgetBorrowType: string; // 1 = ยืมได้, 2 = ยืมไม่ได้, 3 = รายได้แผ่นดิน

  @Column({ name: 'spacial_type', type: 'int', default: 0 })
  spacialType: number;

  @Column({ name: 'up_by', type: 'int' })
  upBy: number;

  @Column({ type: 'int', default: 0 })
  del: number;

  @CreateDateColumn({ name: 'create_date', type: 'datetime', nullable: true })
  createDate: Date;

  @UpdateDateColumn({ name: 'update_date', type: 'datetime', nullable: true })
  updateDate: Date;
}
