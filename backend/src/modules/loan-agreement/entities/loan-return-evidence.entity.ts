import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * ใบรับใบสำคัญ — หลักฐานการชดใช้เงินยืม
 */
@Entity('loan_return_evidence')
export class LoanReturnEvidence {
  @PrimaryGeneratedColumn({ name: 'lre_id' }) lreId: number;
  @Column({
    name: 'la_id',
    type: 'int',
    default: 0,
    comment: 'FK loan_agreement.la_id',
  })
  laId: number;
  @Column({
    name: 'evidence_no',
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: 'เลขที่ใบรับใบสำคัญ',
  })
  evidenceNo: string | null;
  @Column({ name: 'evidence_date', type: 'date', nullable: true })
  evidenceDate: string | null;
  @Column({
    name: 'cash_amount',
    type: 'float',
    default: 0,
    comment: 'เงินสดคืน',
  })
  cashAmount: number;
  @Column({
    name: 'voucher_amount',
    type: 'float',
    default: 0,
    comment: 'ใบสำคัญคืน',
  })
  voucherAmount: number;
  @Column({ type: 'text', nullable: true }) note: string | null;
  @Column({ name: 'up_by', type: 'int', default: 0 }) upBy: number;
  @Column({ type: 'int', default: 0 }) del: number;

  @CreateDateColumn({ name: 'create_date', type: 'datetime', nullable: true })
  createDate: Date | null;
  @UpdateDateColumn({ name: 'update_date', type: 'datetime', nullable: true })
  updateDate: Date | null;
}
