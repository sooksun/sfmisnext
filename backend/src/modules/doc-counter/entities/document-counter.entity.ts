import {
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * ตาราง document_counter — เก็บเลขที่เอกสารล่าสุดต่อโรงเรียน/ปีงบประมาณ/ประเภท
 * doc_type:
 *   'BC' = ใบสำคัญรับเงิน  (บค.)
 *   'BJ' = ใบสำคัญจ่าย    (บจ.)
 *   'BY' = สัญญายืมเงิน   (บย.)
 *   'BG' = เบิก/จ่าย      (บง.)
 */
@Index(['scId', 'budgetYear', 'docType'], { unique: true })
@Entity('document_counter')
export class DocumentCounter {
  @PrimaryGeneratedColumn({ name: 'dc_id' }) dcId: number;

  @Column({ name: 'sc_id', type: 'int', default: 0 }) scId: number;
  @Column({ name: 'budget_year', type: 'varchar', length: 10, nullable: true })
  budgetYear: string | null;
  @Column({
    name: 'doc_type',
    type: 'varchar',
    length: 10,
    nullable: true,
    comment: 'BC|BJ|BY|BG',
  })
  docType: string | null;
  @Column({ name: 'last_no', type: 'int', default: 0 }) lastNo: number;

  @UpdateDateColumn({ name: 'update_date', type: 'datetime', nullable: true })
  updateDate: Date | null;
}
