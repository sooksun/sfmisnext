import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * งบเทียบยอดเงินฝากธนาคาร (Bank Reconciliation)
 * จัดทำทุกสิ้นเดือน ส่ง สพป. ภายในวันที่ 5 ของเดือนถัดไป
 */
@Index(['scId', 'baId', 'del'])
@Entity('bank_reconciliation')
export class BankReconciliation {
  @PrimaryGeneratedColumn({ name: 'br_id' }) brId: number;
  @Column({ name: 'sc_id', type: 'int', default: 0 }) scId: number;
  @Column({
    name: 'ba_id',
    type: 'int',
    default: 0,
    comment: 'FK bankaccount.ba_id',
  })
  baId: number;
  @Column({
    name: 'recon_month',
    type: 'varchar',
    length: 7,
    nullable: true,
    comment: 'YYYY-MM',
  })
  reconMonth: string | null;

  /** ยอดตามสมุดบัญชีโรงเรียน (คำนวณจาก bank_ledger_entry หรือป้อนเอง) */
  @Column({ name: 'book_balance', type: 'float', default: 0 })
  bookBalance: number;
  /** ยอดตาม bank statement (ป้อนเอง) */
  @Column({ name: 'bank_statement_balance', type: 'float', default: 0 })
  bankStatementBalance: number;
  /** ยอดปรับปรุงสุทธิฝั่งธนาคาร = (+เงินฝากระหว่างทาง) − (เช็คค้างขึ้น) */
  @Column({ name: 'adjustment_total', type: 'float', default: 0 })
  adjustmentTotal: number;
  /**
   * ยอดเงินฝากธนาคารหลังปรับปรุง = bank_statement_balance + adjustment_total
   * (เก็บในคอลัมน์ชื่อเดิม adjusted_book_balance เพื่อความเข้ากันได้ — ความหมายคือ "ยอดธนาคารหลังปรับ")
   */
  @Column({ name: 'adjusted_book_balance', type: 'float', default: 0 })
  adjustedBookBalance: number;
  /** ผลต่าง = adjusted_book_balance (ยอดธนาคารหลังปรับ) − book_balance (ควร = 0) */
  @Column({ name: 'difference', type: 'float', default: 0 }) difference: number;
  /** ตรงกันแล้วหรือยัง */
  @Column({ name: 'is_balanced', type: 'tinyint', default: 0 })
  isBalanced: number;

  @Column({ type: 'text', nullable: true }) note: string | null;
  @Column({ name: 'signed_by', type: 'int', nullable: true }) signedBy:
    | number
    | null;
  @Column({ name: 'signed_name', type: 'varchar', length: 200, nullable: true })
  signedName: string | null;
  @Column({ name: 'signed_at', type: 'datetime', nullable: true })
  signedAt: Date | null;

  @Column({ name: 'up_by', type: 'int', default: 0 }) upBy: number;
  @Column({ type: 'int', default: 0 }) del: number;

  @CreateDateColumn({ name: 'create_date', type: 'datetime', nullable: true })
  createDate: Date | null;
  @UpdateDateColumn({ name: 'update_date', type: 'datetime', nullable: true })
  updateDate: Date | null;
}
