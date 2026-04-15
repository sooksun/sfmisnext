import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('tb_transaction_supplies')
export class TransactionSupplies {
  @PrimaryGeneratedColumn({ name: 'trans_id' })
  transId: number;

  @Column({ name: 'supp_id', type: 'int', nullable: true })
  suppId: number | null;

  @Column({ name: 'trans_in', type: 'int', default: 0 })
  transIn: number;

  @Column({ name: 'trans_out', type: 'int', default: 0 })
  transOut: number;

  @Column({ name: 'trans_balance', type: 'int', default: 0 })
  transBalance: number;

  @Column({
    name: 'trans_comment',
    type: 'varchar',
    length: 45,
    nullable: true,
  })
  transComment: string | null;

  @Column({ name: 'up_by', type: 'int', nullable: true })
  upBy: number | null;

  @Column({ type: 'int', default: 0 })
  del: number;

  @CreateDateColumn({ name: 'create_date', type: 'datetime', nullable: true })
  createDate: Date | null;

  @UpdateDateColumn({ name: 'update_date', type: 'datetime', nullable: true })
  updateDate: Date | null;
}
