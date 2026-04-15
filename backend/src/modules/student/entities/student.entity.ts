import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('tb_student')
export class Student {
  @PrimaryGeneratedColumn({ name: 'st_id' })
  stId: number;

  @Column({ name: 'sc_id', type: 'int' })
  scId: number;

  @Column({ name: 'sy_id', type: 'int', nullable: true })
  syId: number | null;

  @Column({ name: 'budget_year', type: 'varchar', length: 45, nullable: true })
  budgetYear: string | null;

  @Column({ name: 'class_id', type: 'int', nullable: true })
  classId: number | null;

  @Column({ name: 'st_count', type: 'int', default: 0 })
  stCount: number;

  @Column({ name: 'up_by', type: 'int', nullable: true })
  upBy: number | null;

  @Column({ type: 'int', default: 0 })
  del: number;

  @CreateDateColumn({ name: 'create_date', type: 'datetime', nullable: true })
  createDate: Date;

  @UpdateDateColumn({ name: 'update_date', type: 'datetime', nullable: true })
  updateDate: Date;
}
