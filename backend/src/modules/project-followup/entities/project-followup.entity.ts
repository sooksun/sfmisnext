import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Index(['projectId', 'del'])
@Index(['scId', 'budgetYear'])
@Entity('pln_project_followup')
export class ProjectFollowup {
  @PrimaryGeneratedColumn({ name: 'pf_id' })
  pfId: number;

  @Column({
    name: 'project_id',
    type: 'int',
    comment: 'pln_project.project_id',
  })
  projectId: number;

  @Column({ name: 'sc_id', type: 'int' })
  scId: number;

  @Column({ name: 'sy_id', type: 'int', nullable: true })
  syId: number | null;

  @Column({ name: 'budget_year', type: 'int' })
  budgetYear: number;

  @Column({
    name: 'report_period',
    type: 'tinyint',
    default: 1,
    comment: '1=ไตรมาส1 2=ไตรมาส2 3=ไตรมาส3 4=ไตรมาส4 5=สรุปปลายปี',
  })
  reportPeriod: number;

  @Column({ name: 'report_date', type: 'date' })
  reportDate: string;

  @Column({
    name: 'percent_complete',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
  })
  percentComplete: number;

  @Column({
    name: 'actual_amount',
    type: 'decimal',
    precision: 15,
    scale: 2,
    default: 0,
    comment: 'ค่าใช้จ่ายจริงสะสม',
  })
  actualAmount: number;

  @Column({
    name: 'output_qty',
    type: 'varchar',
    length: 250,
    nullable: true,
    comment: 'ผลผลิตเชิงปริมาณ',
  })
  outputQty: string | null;

  @Column({ name: 'output_quality', type: 'text', nullable: true })
  outputQuality: string | null;

  @Column({ name: 'outcome', type: 'text', nullable: true, comment: 'ผลลัพธ์' })
  outcome: string | null;

  @Column({ name: 'target_group_qty', type: 'int', default: 0 })
  targetGroupQty: number;

  @Column({
    name: 'satisfaction_percent',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
  })
  satisfactionPercent: number;

  @Column({ name: 'problems', type: 'text', nullable: true })
  problems: string | null;

  @Column({ name: 'solutions', type: 'text', nullable: true })
  solutions: string | null;

  @Column({ name: 'next_plan', type: 'text', nullable: true })
  nextPlan: string | null;

  @Column({
    name: 'photo_urls',
    type: 'text',
    nullable: true,
    comment: 'JSON array',
  })
  photoUrls: string | null;

  @Column({ name: 'reported_by', type: 'int', nullable: true })
  reportedBy: number | null;

  @Column({
    name: 'status',
    type: 'tinyint',
    default: 1,
    comment: '1=ร่าง 2=ส่งแล้ว 3=ผอ.รับทราบ 9=ยกเลิก',
  })
  status: number;

  @Column({ name: 'acknowledged_by', type: 'int', nullable: true })
  acknowledgedBy: number | null;

  @Column({ name: 'acknowledged_date', type: 'date', nullable: true })
  acknowledgedDate: string | null;

  @Column({ name: 'up_by', type: 'int', nullable: true })
  upBy: number | null;

  @Column({ type: 'int', default: 0 })
  del: number;

  @CreateDateColumn({ name: 'create_date', type: 'datetime', nullable: true })
  createDate: Date | null;

  @UpdateDateColumn({ name: 'update_date', type: 'datetime', nullable: true })
  updateDate: Date | null;
}
