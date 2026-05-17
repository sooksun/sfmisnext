import {
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('financial_transactions')
@Index(['scId', 'del'])
@Index(['scId', 'createDate'])
@Index(['scId', 'syId', 'del'])
@Index(['scId', 'budgetYear', 'del'])
@Index(['scId', 'budgetYear', 'createDate', 'del'])
export class FinancialTransactions {
  @PrimaryGeneratedColumn({ name: 'ft_id' })
  ftId: number;

  @Column({
    type: 'int',
    default: 0,
    comment: '0 = unknow | 1 = get | -1 = pay',
  })
  type: number;

  @Column({
    name: 'bg_type_id',
    type: 'int',
    default: 0,
    comment: 'ประเภทเงิน',
  })
  bgTypeId: number;

  @Column({ type: 'float', default: 0 })
  amount: number;

  @Column({
    name: 'rw_id',
    type: 'int',
    default: 0,
    comment: 'rw_id มีค่าเมื่อมีการทำรายการจ่าย',
  })
  rwId: number;

  @Column({
    name: 'pr_id',
    type: 'int',
    default: 0,
    comment: 'ถ้าเป็นรายรับ pr_id จะมีค่า',
  })
  prId: number;

  @Column({
    name: 'prd_id',
    type: 'int',
    default: 0,
    comment: 'ถ้าเป็นรายรับ prd_id จะมีค่า',
  })
  prdId: number;

  @Column({ name: 'prb_id', type: 'int', default: 0 })
  prbId: number;

  /**
   * ช่องทางเงิน — ใช้แยก cash vs bank สำหรับ cashLimitCheck
   * 1 = cash (เงินสด/เช็คในมือ)
   * 2 = bank (เงินฝากธนาคาร)
   * 0 = unspecified (legacy data)
   */
  @Column({
    name: 'money_channel',
    type: 'int',
    default: 0,
    comment: '0=unspecified, 1=cash, 2=bank',
  })
  moneyChannel: number;

  /** FK → tb_bankaccount.ba_id (เฉพาะเมื่อ money_channel=2) */
  @Column({ name: 'ba_id', type: 'int', nullable: true })
  baId: number | null;

  @Column({ name: 'up_by', type: 'int', default: 0 })
  upBy: number;

  @Column({ name: 'sc_id', type: 'int', default: 0 })
  scId: number;

  // ── traceability ─────────────────────────────────────────────────────────
  @Column({
    name: 'sy_id',
    type: 'int',
    nullable: true,
    comment: 'FK → school_year.sy_id (ปีการศึกษา)',
  })
  syId: number | null;

  @Column({
    name: 'budget_year',
    type: 'int',
    nullable: true,
    comment: 'ปีงบประมาณ (เช่น 2568, 2569)',
  })
  budgetYear: number | null;

  @Column({
    type: 'int',
    nullable: true,
    comment: 'ภาคเรียน (1 = ต้น, 2 = ปลาย, 3 = ฤดูร้อน)',
  })
  semester: number | null;

  @Column({ type: 'tinyint', default: 0 })
  del: number;

  @CreateDateColumn({ name: 'create_date', type: 'datetime', nullable: true })
  createDate: Date | null;

  @UpdateDateColumn({ name: 'update_date', type: 'datetime', nullable: true })
  updateDate: Date | null;
}
