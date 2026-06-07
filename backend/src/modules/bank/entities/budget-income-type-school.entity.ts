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
  scId: number | null;

  @Column({ name: 'ba_id', type: 'int', nullable: true })
  baId: number | null;

  @Column({ name: 'bg_type_id', type: 'int', nullable: true })
  bgTypeId: number | null;

  @Column({
    name: 'perhead',
    type: 'tinyint',
    default: 1,
    comment: '1 = กำหนดเงินต่อหัวได้ | 0 = ห้ามกำหนดรายหัว',
  })
  perhead: number;

  @Column({ name: 'up_by', type: 'int', nullable: true })
  upBy: number | null;

  @Column({ type: 'int', default: 0 })
  del: number;

  @CreateDateColumn({ name: 'create_date', type: 'datetime', nullable: true })
  createDate: Date | null;

  @UpdateDateColumn({ name: 'update_date', type: 'datetime', nullable: true })
  updateDate: Date | null;
}
