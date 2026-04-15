import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('pln_real_budget')
export class PlnRealBudget {
  @PrimaryGeneratedColumn({ name: 'prb_id' })
  prbId: number;

  @Column({ name: 'sc_id', type: 'int' })
  scId: number;

  @Column({ name: 'acad_year', type: 'int' })
  acadYear: number;

  @Column({ name: 'auto_numbers', type: 'int', default: 0 })
  autoNumbers: number;

  @Column({ name: 'bg_type_id', type: 'int' })
  bgTypeId: number;

  @Column({ type: 'int', default: 0 })
  receivetype: number;

  @Column({ name: 'recieve_acadyear', type: 'int' })
  recieveAcadyear: number;

  @Column({ type: 'varchar', length: 255, default: '' })
  detail: string;

  @Column({ type: 'float', default: 0 })
  amount: number;

  @Column({ name: 'up_by', type: 'int', nullable: true })
  upBy: number | null;

  @Column({ type: 'int', default: 0 })
  del: number;

  @CreateDateColumn({ name: 'create_date', type: 'datetime', nullable: true })
  createDate: Date | null;

  @UpdateDateColumn({ name: 'update_date', type: 'datetime', nullable: true })
  updateDate: Date | null;
}
