import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * ยอดยกมาต้นปีงบประมาณ (3.5)
 * ตั้งต้นยอดเงินแต่ละประเภทเงิน ณ วันเริ่มต้นปีงบประมาณ
 * money_type: 1=เงินสด 2=ธนาคาร 3=เงินฝาก สพป.
 */
@Index(['scId', 'syId', 'del'])
@Entity('opening_balance')
export class OpeningBalance {
  @PrimaryGeneratedColumn({ name: 'ob_id' }) obId: number;
  @Column({ name: 'sc_id', type: 'int', default: 0 }) scId: number;
  @Column({ name: 'sy_id', type: 'int', default: 0 }) syId: number;
  @Column({ name: 'budget_year', type: 'varchar', length: 10, nullable: true })
  budgetYear: string | null;

  @Column({
    name: 'balance_date',
    type: 'date',
    nullable: true,
    comment: 'วันที่ตั้งต้น',
  })
  balanceDate: string | null;

  /**
   * ประเภทเงิน (money_type_id = bg_type_id ของ budget_income_type)
   * ชื่อ snapshot ไว้แสดงผล
   */
  @Column({ name: 'money_type_id', type: 'int', default: 0 })
  moneyTypeId: number;
  @Column({
    name: 'money_type_name',
    type: 'varchar',
    length: 200,
    nullable: true,
  })
  moneyTypeName: string | null;

  /**
   * แหล่งเก็บเงิน: 1=เงินสด 2=ธนาคาร 3=เงินฝาก สพป.
   */
  @Column({
    name: 'storage_type',
    type: 'int',
    default: 1,
    comment: '1=เงินสด|2=ธนาคาร|3=เงินฝากสพป.',
  })
  storageType: number;

  @Column({
    name: 'bank_account_id',
    type: 'int',
    nullable: true,
    comment: 'FK bank_account.ba_id (ถ้า storageType=2)',
  })
  bankAccountId: number | null;

  @Column({ type: 'float', default: 0 }) amount: number;

  @Column({ type: 'text', nullable: true }) remark: string | null;
  @Column({ name: 'up_by', type: 'int', default: 0 }) upBy: number;
  @Column({ type: 'int', default: 0 }) del: number;

  @CreateDateColumn({ name: 'create_date', type: 'datetime', nullable: true })
  createDate: Date | null;
  @UpdateDateColumn({ name: 'update_date', type: 'datetime', nullable: true })
  updateDate: Date | null;
}
