import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('master_classroombudget')
export class MasterClassroomBudget {
  @PrimaryGeneratedColumn({ name: 'crb_id' })
  crbId: number;

  @Column({ name: 'class_id', type: 'int' })
  classId: number;

  @Column({ name: 'bg_type_id', type: 'int' })
  bgTypeId: number;

  @Column({ type: 'float', precision: 10, scale: 2 })
  amount: number;

  @Column({ name: 'up_by', type: 'int', nullable: true })
  upBy: number | null;

  @Column({ type: 'int', default: 0 })
  del: number;

  @CreateDateColumn({ name: 'create_date', type: 'datetime', nullable: true })
  createDate: Date;

  @UpdateDateColumn({ name: 'update_date', type: 'datetime', nullable: true })
  updateDate: Date;
}
