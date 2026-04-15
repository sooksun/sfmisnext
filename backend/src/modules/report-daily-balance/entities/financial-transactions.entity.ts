import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('financial_transactions')
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

  @Column({ name: 'up_by', type: 'int', default: 0 })
  upBy: number;

  @Column({ name: 'sc_id', type: 'int', default: 0 })
  scId: number;

  @Column({ type: 'varchar', length: 45, default: '0' })
  del: string;

  @CreateDateColumn({ name: 'create_date', type: 'datetime', nullable: true })
  createDate: Date | null;

  @UpdateDateColumn({ name: 'update_date', type: 'datetime', nullable: true })
  updateDate: Date | null;
}
