import {
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('monthly_submission')
@Index(['scId', 'syId'])
@Index(['scId', 'submitMonth'], { unique: true })
export class MonthlySubmission {
  @PrimaryGeneratedColumn({ name: 'ms_id' }) msId: number;

  @Column({ name: 'sc_id', type: 'int', default: 0 }) scId: number;
  @Column({ name: 'sy_id', type: 'int', default: 0 }) syId: number;

  @Column({
    name: 'submit_month',
    type: 'varchar',
    length: 7,
    nullable: true,
    comment: 'YYYY-MM Thai budget month e.g. 2568-10',
  })
  submitMonth: string | null;

  /**
   * สถานะ: 1=ร่าง | 2=ส่งแล้ว | 3=ยืนยัน
   */
  @Column({ type: 'int', default: 1, comment: '1=ร่าง|2=ส่งแล้ว|3=ยืนยัน' })
  status: number;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'JSON array of {id, label, checked}',
  })
  checklist: string | null;

  @Column({ name: 'submitted_at', type: 'datetime', nullable: true })
  submittedAt: Date | null;
  @Column({ name: 'submitted_by', type: 'int', nullable: true }) submittedBy:
    | number
    | null;
  @Column({
    name: 'submitted_by_name',
    type: 'varchar',
    length: 200,
    nullable: true,
  })
  submittedByName: string | null;

  @Column({ type: 'text', nullable: true }) note: string | null;

  @Column({ name: 'up_by', type: 'int', default: 0 }) upBy: number;
  @Column({ type: 'int', default: 0 }) del: number;

  @CreateDateColumn({ name: 'create_date', type: 'datetime', nullable: true })
  createDate: Date | null;
  @UpdateDateColumn({ name: 'update_date', type: 'datetime', nullable: true })
  updateDate: Date | null;
}
