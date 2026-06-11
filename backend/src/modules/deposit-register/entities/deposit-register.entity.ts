import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * ทะเบียนคุมเงินฝาก (ตย.14) — คุมเงินที่รับไว้แล้วนำฝากส่วนราชการผู้เบิก (สพป.)
 * เช่น เงินประกันสัญญา: รับ → นำฝาก สพป. → ครบกำหนด → เบิกถอนคืนผู้มีสิทธิ
 */
@Index(['scId', 'syId', 'del'])
@Entity('deposit_register')
export class DepositRegister {
  @PrimaryGeneratedColumn({ name: 'dr_id' }) drId: number;
  @Column({ name: 'sc_id', type: 'int', default: 0 }) scId: number;
  @Column({ name: 'sy_id', type: 'int', default: 0 }) syId: number;
  @Column({ name: 'budget_year', type: 'varchar', length: 10, nullable: true })
  budgetYear: string | null;

  @Column({ name: 'seq', type: 'int', default: 1, comment: 'ลำดับที่' })
  seq: number;

  @Column({
    name: 'item_name',
    type: 'varchar',
    length: 200,
    nullable: true,
    comment: 'รายการ เช่น ปรับปรุงซ่อมแซมส้วม',
  })
  itemName: string | null;

  @Column({
    name: 'deposit_kind',
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'ประเภท เช่น เงินประกันสัญญา',
  })
  depositKind: string | null;

  // ── การรับ ──
  @Column({ name: 'receive_date', type: 'date', nullable: true })
  receiveDate: string | null;
  @Column({
    name: 'receive_doc_no',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  receiveDocNo: string | null;
  @Column({ name: 'receive_amount', type: 'float', default: 0 })
  receiveAmount: number;

  // ── การนำฝาก สพป. ──
  @Column({ name: 'deposit_date', type: 'date', nullable: true })
  depositDate: string | null;
  @Column({
    name: 'deposit_doc_no',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  depositDocNo: string | null;
  @Column({ name: 'deposit_amount', type: 'float', default: 0 })
  depositAmount: number;

  @Column({
    name: 'due_date',
    type: 'date',
    nullable: true,
    comment: 'วันครบกำหนด',
  })
  dueDate: string | null;
  @Column({
    name: 'return_date',
    type: 'date',
    nullable: true,
    comment: 'วันที่เบิกจ่ายเงินคืนผู้มีสิทธิ',
  })
  returnDate: string | null;

  @Column({ type: 'text', nullable: true }) note: string | null;
  @Column({ name: 'up_by', type: 'int', default: 0 }) upBy: number;
  @Column({ type: 'int', default: 0 }) del: number;

  @CreateDateColumn({ name: 'create_date', type: 'datetime', nullable: true })
  createDate: Date | null;
  @UpdateDateColumn({ name: 'update_date', type: 'datetime', nullable: true })
  updateDate: Date | null;
}
