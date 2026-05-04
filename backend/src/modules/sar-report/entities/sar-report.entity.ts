import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Index(['scId', 'budgetYear'])
@Entity('tb_sar_report')
export class SarReport {
  @PrimaryGeneratedColumn({ name: 'sar_id' })
  sarId: number;

  @Column({ name: 'sc_id', type: 'int' })
  scId: number;

  @Column({ name: 'budget_year', type: 'int' })
  budgetYear: number;

  @Column({ name: 'academic_year', type: 'int' })
  academicYear: number;

  @Column({ name: 'title', type: 'varchar', length: 500, nullable: true })
  title: string | null;

  @Column({
    name: 'sections',
    type: 'longtext',
    nullable: true,
    comment:
      'JSON: [{section_no, section_title, content, score, evidence_urls}]',
  })
  sections: string | null;

  @Column({
    name: 'overall_score',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
  })
  overallScore: number;

  @Column({
    name: 'overall_level',
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: 'ดีเยี่ยม/ดีมาก/ดี/พอใช้/ปรับปรุง',
  })
  overallLevel: string | null;

  @Column({ name: 'summary', type: 'text', nullable: true })
  summary: string | null;

  @Column({ name: 'strengths', type: 'text', nullable: true })
  strengths: string | null;

  @Column({ name: 'improvements', type: 'text', nullable: true })
  improvements: string | null;

  @Column({ name: 'next_targets', type: 'text', nullable: true })
  nextTargets: string | null;

  @Column({ name: 'file_url', type: 'varchar', length: 500, nullable: true })
  fileUrl: string | null;

  @Column({
    name: 'status',
    type: 'tinyint',
    default: 0,
    comment:
      '0=ร่าง 1=กำลังจัดทำ 2=ส่งคณะกรรมการสถานศึกษา 3=อนุมัติ 4=ส่งต้นสังกัด 9=ยกเลิก',
  })
  status: number;

  @Column({ name: 'approved_by', type: 'int', nullable: true })
  approvedBy: number | null;

  @Column({ name: 'approved_date', type: 'date', nullable: true })
  approvedDate: string | null;

  @Column({ name: 'submitted_date', type: 'date', nullable: true })
  submittedDate: string | null;

  @Column({ name: 'up_by', type: 'int', nullable: true })
  upBy: number | null;

  @Column({ type: 'int', default: 0 })
  del: number;

  @CreateDateColumn({ name: 'create_date', type: 'datetime', nullable: true })
  createDate: Date | null;

  @UpdateDateColumn({ name: 'update_date', type: 'datetime', nullable: true })
  updateDate: Date | null;
}
