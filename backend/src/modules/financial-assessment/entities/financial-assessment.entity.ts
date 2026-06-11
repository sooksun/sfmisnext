import {
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { FinancialAssessmentItem } from './financial-assessment-item.entity';

/**
 * หัวการประเมินตนเองด้านการเงิน การบัญชี (แบบ 2544) — 1 แถวต่อโรงเรียนต่อปีงบ
 * อ้างอิงคู่มือ: docs/finance5.pdf
 */
@Entity('financial_assessment')
@Index(['scId', 'syId'])
@Index(['scId', 'budgetYear', 'del'], { unique: true })
export class FinancialAssessment {
  @PrimaryGeneratedColumn({ name: 'fa_id' }) faId: number;

  @Column({ name: 'sc_id', type: 'int', default: 0 }) scId: number;
  @Column({ name: 'sy_id', type: 'int', default: 0 }) syId: number;
  @Column({ name: 'budget_year', type: 'varchar', length: 10, nullable: true })
  budgetYear: string | null;

  @Column({ name: 'as_of_date', type: 'date', nullable: true })
  asOfDate: string | null;

  @Column({ name: 'student_count', type: 'int', default: 0 })
  studentCount: number;

  @Column({ name: 'total_score', type: 'float', default: 0 })
  totalScore: number;
  @Column({ name: 'max_score', type: 'float', default: 100 })
  maxScore: number;
  @Column({ type: 'float', default: 0 }) percent: number;

  /** ระดับ: 1=ปรับปรุง, 2=พอใช้, 3=ดี, 4=ดีมาก */
  @Column({ type: 'tinyint', default: 1, comment: '1=ปรับปรุง|2=พอใช้|3=ดี|4=ดีมาก' })
  level: number;

  /** สถานะ: 1=ร่าง, 2=ยืนยันแล้ว, 3=ส่งเขตแล้ว */
  @Column({ type: 'tinyint', default: 1, comment: '1=ร่าง|2=ยืนยัน|3=ส่งเขต' })
  status: number;

  @Column({ name: 'confirmed_by', type: 'int', nullable: true })
  confirmedBy: number | null;
  @Column({ name: 'confirmed_at', type: 'datetime', nullable: true })
  confirmedAt: Date | null;

  @Column({ type: 'text', nullable: true }) note: string | null;

  @Column({ name: 'up_by', type: 'int', default: 0 }) upBy: number;
  @Column({ type: 'int', default: 0 }) del: number;

  @CreateDateColumn({ name: 'cre_date', type: 'datetime', nullable: true })
  creDate: Date | null;
  @UpdateDateColumn({ name: 'up_date', type: 'datetime', nullable: true })
  upDate: Date | null;

  @OneToMany(() => FinancialAssessmentItem, (item) => item.assessment)
  items: FinancialAssessmentItem[];
}
