import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Index(['ctId', 'del'])
@Index(['scId', 'status'])
@Entity('sup_contract_security')
export class ContractSecurity {
  @PrimaryGeneratedColumn({ name: 'cs_id' })
  csId: number;

  @Column({ name: 'ct_id', type: 'int' })
  ctId: number;

  @Column({ name: 'sc_id', type: 'int' })
  scId: number;

  @Column({
    name: 'security_type',
    type: 'tinyint',
    comment: '1=หลักประกันซอง 2=หลักประกันสัญญา 3=หลักประกันผลงาน 4=มัดจำ',
  })
  securityType: number;

  @Column({
    name: 'security_form',
    type: 'tinyint',
    default: 1,
    comment: '1=เงินสด 2=แคชเชียร์เช็ค 3=หนังสือค้ำประกัน 4=พันธบัตร',
  })
  securityForm: number;

  @Column({
    name: 'amount',
    type: 'decimal',
    precision: 15,
    scale: 2,
    default: 0,
  })
  amount: number;

  @Column({
    name: 'percent_of_contract',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
    comment: '% ของมูลค่าสัญญา (เช่น 5.00)',
  })
  percentOfContract: number;

  @Column({ name: 'bank_name', type: 'varchar', length: 120, nullable: true })
  bankName: string | null;

  @Column({ name: 'document_no', type: 'varchar', length: 80, nullable: true })
  documentNo: string | null;

  @Column({ name: 'received_date', type: 'date', nullable: true })
  receivedDate: string | null;

  @Column({ name: 'expiry_date', type: 'date', nullable: true })
  expiryDate: string | null;

  @Column({ name: 'return_date', type: 'date', nullable: true })
  returnDate: string | null;

  @Column({
    name: 'return_evidence_no',
    type: 'varchar',
    length: 80,
    nullable: true,
  })
  returnEvidenceNo: string | null;

  @Column({
    name: 'status',
    type: 'tinyint',
    default: 1,
    comment: '1=ถือครอง 2=คืนแล้ว 3=ยึด 9=ยกเลิก',
  })
  status: number;

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
