import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('pln_receive')
export class PlnReceive {
  @PrimaryGeneratedColumn({ name: 'pr_id' })
  prId: number;

  @Column({ name: 'pr_no', type: 'varchar', length: 45, nullable: true })
  prNo: string | null;

  @Column({ name: 'sc_id', type: 'int', nullable: true })
  scId: number | null;

  @Column({
    name: 'receive_form',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  receiveForm: string | null;

  @Column({ name: 'sy_id', type: 'int', nullable: true })
  syId: number | null;

  @Column({ name: 'budget_year', type: 'varchar', length: 45, nullable: true })
  budgetYear: string | null;

  @Column({ name: 'user_receive', type: 'int', nullable: true })
  userReceive: number | null;

  @Column({
    name: 'receive_money_type',
    type: 'int',
    default: 3,
    comment: 'ประเภทการรับเงิน: 1 เช็ค | 2 เงินสด | 3 เงินฝากธนาคาร',
  })
  receiveMoneyType: number;

  @Column({ name: 'receive_date', type: 'date', nullable: true })
  receiveDate: Date | null;

  @Column({
    name: 'cf_transaction',
    type: 'int',
    default: 0,
    comment: '0 = กำลังแก้ไข | 1 = สร้าง Transaction รับเงินและปิดการแก้ไข',
  })
  cfTransaction: number;

  @Column({ name: 'up_by', type: 'int', nullable: true })
  upBy: number | null;

  @Column({ type: 'int', default: 0 })
  del: number;

  @CreateDateColumn({ name: 'create_date', type: 'datetime', nullable: true })
  createDate: Date | null;

  @UpdateDateColumn({ name: 'update_date', type: 'datetime', nullable: true })
  updateDate: Date | null;
}
