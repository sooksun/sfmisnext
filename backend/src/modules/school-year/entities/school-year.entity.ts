import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('school_year')
export class SchoolYear {
  @PrimaryGeneratedColumn({ name: 'sy_id' })
  syId: number;

  @Column({ name: 'sy_year', type: 'int' })
  syYear: number;

  @Column({ type: 'int', default: 1 })
  semester: number;

  @Column({ name: 'sy_date_s', type: 'date', nullable: true })
  syDateS: Date | null;

  @Column({ name: 'sy_date_e', type: 'date', nullable: true })
  syDateE: Date | null;

  @Column({ name: 'up_by', type: 'int', nullable: true })
  upBy: number | null;

  @Column({ type: 'int', default: 0 })
  del: number;

  @CreateDateColumn({ name: 'cre_date', nullable: true })
  creDate: Date;

  @UpdateDateColumn({ name: 'up_date', nullable: true })
  upDate: Date;

  @Column({ name: 'sc_id', type: 'int', nullable: true })
  scId: number | null;

  @Column({ name: 'budget_year', type: 'int', nullable: true })
  budgetYear: number | null;

  @Column({ name: 'budget_date_s', type: 'date', nullable: true })
  budgetDateS: Date | null;

  @Column({ name: 'budget_date_e', type: 'date', nullable: true })
  budgetDateE: Date | null;
}
