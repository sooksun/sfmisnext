import {
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * ข้อมูลรับรองประจำปีที่ระบบไม่มีแหล่งข้อมูลโครงสร้างอื่น
 * ใช้เป็นแหล่งให้ Rule Engine ประเมินอัตโนมัติ (เช่น ความเห็นชอบ กก.สถานศึกษาต่อแผน — ข้อ 1.4)
 * 1 แถวต่อโรงเรียนต่อปีงบ
 */
@Entity('finance_annual_attestation')
@Index(['scId', 'budgetYear', 'del'], { unique: true })
export class FinanceAnnualAttestation {
  @PrimaryGeneratedColumn({ name: 'faa_id' }) faaId: number;

  @Column({ name: 'sc_id', type: 'int', default: 0 }) scId: number;
  @Column({ name: 'sy_id', type: 'int', default: 0 }) syId: number;
  @Column({ name: 'budget_year', type: 'varchar', length: 10, nullable: true })
  budgetYear: string | null;

  // ข้อ 1.4 — แผนปฏิบัติการประจำปีได้รับความเห็นชอบจาก กก.สถานศึกษา
  @Column({ name: 'plan_committee_date', type: 'date', nullable: true })
  planCommitteeDate: string | null;
  @Column({
    name: 'plan_committee_doc_no',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  planCommitteeDocNo: string | null;

  @Column({ type: 'text', nullable: true }) note: string | null;

  @Column({ name: 'up_by', type: 'int', default: 0 }) upBy: number;
  @Column({ type: 'int', default: 0 }) del: number;

  @CreateDateColumn({ name: 'cre_date', type: 'datetime', nullable: true })
  creDate: Date | null;
  @UpdateDateColumn({ name: 'up_date', type: 'datetime', nullable: true })
  upDate: Date | null;
}
