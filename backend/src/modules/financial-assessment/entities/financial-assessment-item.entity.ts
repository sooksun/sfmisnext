import {
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { FinancialAssessment } from './financial-assessment.entity';

/**
 * รายข้อประเมิน (✓/✗/N-A) ของแบบ 2544-2 — 52 ข้อต่อชุดประเมิน
 */
@Entity('financial_assessment_item')
@Index(['assessmentId'])
@Index(['assessmentId', 'itemCode'], { unique: true })
export class FinancialAssessmentItem {
  @PrimaryGeneratedColumn({ name: 'fai_id' }) faiId: number;

  @Column({ name: 'assessment_id', type: 'int' }) assessmentId: number;

  @Column({ name: 'item_code', type: 'varchar', length: 10 })
  itemCode: string;
  @Column({ name: 'topic_no', type: 'tinyint', default: 0 })
  topicNo: number;

  /** คำตอบ: yes | no | na */
  @Column({ type: 'varchar', length: 4, default: 'no' })
  answer: string;

  @Column({ type: 'float', default: 0 }) weight: number;
  @Column({ type: 'float', default: 0 }) score: number;

  /** auto | prefill | manual (จาก catalog) */
  @Column({ name: 'eval_mode', type: 'varchar', length: 10, default: 'manual' })
  evalMode: string;

  /** ผลที่ Rule Engine คำนวณ: yes | no | na | unknown (เฟส 1) */
  @Column({ name: 'auto_result', type: 'varchar', length: 8, nullable: true })
  autoResult: string | null;
  @Column({ name: 'auto_detail', type: 'text', nullable: true })
  autoDetail: string | null;

  @Column({ name: 'attachment_id', type: 'int', nullable: true })
  attachmentId: number | null;

  @Column({ type: 'text', nullable: true }) note: string | null;

  @ManyToOne(() => FinancialAssessment, (a) => a.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'assessment_id' })
  assessment: FinancialAssessment;
}
