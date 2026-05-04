import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Index(['scId', 'del'])
@Index(['fromBankId', 'toBankId'])
@Entity('tb_intra_bank_transfer')
export class IntraBankTransfer {
  @PrimaryGeneratedColumn({ name: 'ibt_id' })
  ibtId: number;

  @Column({ name: 'ibt_no', type: 'varchar', length: 50 })
  ibtNo: string;

  @Column({ name: 'sc_id', type: 'int' })
  scId: number;

  @Column({ name: 'transfer_date', type: 'date' })
  transferDate: string;

  @Column({
    name: 'from_bank_id',
    type: 'int',
    comment: 'tb_bankaccount.bank_id',
  })
  fromBankId: number;

  @Column({ name: 'to_bank_id', type: 'int' })
  toBankId: number;

  @Column({
    name: 'amount',
    type: 'decimal',
    precision: 15,
    scale: 2,
    default: 0,
  })
  amount: number;

  @Column({ name: 'fee', type: 'decimal', precision: 10, scale: 2, default: 0 })
  fee: number;

  @Column({
    name: 'transfer_method',
    type: 'tinyint',
    default: 1,
    comment: '1=โอนเงินออนไลน์ 2=เช็ค 3=เงินสด',
  })
  transferMethod: number;

  @Column({
    name: 'ref_no',
    type: 'varchar',
    length: 80,
    nullable: true,
    comment: 'เลขที่อ้างอิงธนาคาร',
  })
  refNo: string | null;

  @Column({ name: 'purpose', type: 'text', nullable: true })
  purpose: string | null;

  @Column({
    name: 'from_ledger_id',
    type: 'int',
    nullable: true,
    comment: 'bank_ledger.bl_id ฝั่งถอน',
  })
  fromLedgerId: number | null;

  @Column({
    name: 'to_ledger_id',
    type: 'int',
    nullable: true,
    comment: 'bank_ledger.bl_id ฝั่งฝาก',
  })
  toLedgerId: number | null;

  @Column({
    name: 'status',
    type: 'tinyint',
    default: 0,
    comment: '0=ร่าง 1=ดำเนินการ 2=สำเร็จ 3=ยกเลิก',
  })
  status: number;

  @Column({ name: 'completed_date', type: 'date', nullable: true })
  completedDate: string | null;

  @Column({ name: 'note', type: 'text', nullable: true })
  note: string | null;

  @Column({ name: 'up_by', type: 'int', nullable: true })
  upBy: number | null;

  @Column({ type: 'int', default: 0 })
  del: number;

  @CreateDateColumn({ name: 'create_date', type: 'datetime', nullable: true })
  createDate: Date | null;

  @UpdateDateColumn({ name: 'update_date', type: 'datetime', nullable: true })
  updateDate: Date | null;
}
