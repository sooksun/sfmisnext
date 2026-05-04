import {
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * ทะเบียนคุมเงินฝากธนาคาร (แยกรายบัญชี)
 * running balance: ฝาก - ถอน = คงเหลือ
 */
@Entity('bank_ledger_entry')
@Index(['scId', 'syId', 'baId', 'del'])
export class BankLedgerEntry {
  @PrimaryGeneratedColumn({ name: 'ble_id' }) bleId: number;
  @Column({ name: 'sc_id', type: 'int', default: 0 }) scId: number;
  @Column({ name: 'sy_id', type: 'int', default: 0 }) syId: number;
  @Column({
    name: 'ba_id',
    type: 'int',
    default: 0,
    comment: 'FK bankaccount.ba_id',
  })
  baId: number;

  /**
   * ประเภทรายการ: 1 = ฝาก (deposit), 2 = ถอน (withdrawal)
   */
  @Column({
    name: 'entry_type',
    type: 'int',
    default: 1,
    comment: '1=ฝาก|2=ถอน',
  })
  entryType: number;

  @Column({
    name: 'doc_no',
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: 'เลขที่เอกสาร',
  })
  docNo: string | null;
  @Column({ name: 'entry_date', type: 'date', nullable: true }) entryDate:
    | string
    | null;
  @Column({ type: 'text', nullable: true, comment: 'รายการ' }) detail:
    | string
    | null;
  @Column({ type: 'float', default: 0 }) amount: number;

  /**
   * เชื่อมกับรายการต้นทาง (optional):
   * ref_type = 'receipt' | 'check' | 'manual'
   */
  @Column({ name: 'ref_type', type: 'varchar', length: 20, nullable: true })
  refType: string | null;
  @Column({ name: 'ref_id', type: 'int', nullable: true }) refId: number | null;

  @Column({
    name: 'signer_id',
    type: 'int',
    nullable: true,
    comment: 'admin_id ผู้ลงนาม',
  })
  signerId: number | null;
  @Column({
    name: 'signer_name',
    type: 'varchar',
    length: 200,
    nullable: true,
    comment: 'snapshot ชื่อผู้ลงนาม',
  })
  signerName: string | null;

  @Column({ type: 'text', nullable: true }) note: string | null;
  @Column({ name: 'up_by', type: 'int', default: 0 }) upBy: number;
  @Column({ type: 'int', default: 0 }) del: number;

  @CreateDateColumn({ name: 'create_date', type: 'datetime', nullable: true })
  createDate: Date | null;
  @UpdateDateColumn({ name: 'update_date', type: 'datetime', nullable: true })
  updateDate: Date | null;
}
