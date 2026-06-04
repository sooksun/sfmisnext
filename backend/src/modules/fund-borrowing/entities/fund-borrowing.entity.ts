import {
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * fund_borrowing — การยืมเงินข้ามประเภทเงิน (ภายในโรงเรียน)
 * เช่น ยืมเงินอุดหนุนรายหัว ไปจ่ายแทนเงินเรียนฟรี/กิจกรรม แล้วคืนเมื่อได้รับจัดสรร
 * (ต่างจาก loan_agreement ที่เป็นลูกหนี้บุคคล)
 *
 * ระเบียบ: อนุญาตเฉพาะประเภทเงินที่กำหนด + ต้องมียอดคงเหลือพอ + คืนภายในปีงบ
 */
@Index(['scId', 'syId', 'del'])
@Entity('fund_borrowing')
export class FundBorrowing {
  @PrimaryGeneratedColumn({ name: 'fb_id' }) fbId: number;

  @Column({ name: 'sc_id', type: 'int', default: 0 }) scId: number;
  @Column({ name: 'sy_id', type: 'int', default: 0 }) syId: number;
  @Column({ name: 'budget_year', type: 'varchar', length: 10, nullable: true })
  budgetYear: string | null;

  @Column({
    name: 'from_money_type_id',
    type: 'int',
    comment: 'ประเภทเงินต้นทาง (ผู้ให้ยืม)',
  })
  fromMoneyTypeId: number;
  @Column({
    name: 'from_money_type_name',
    type: 'varchar',
    length: 200,
    nullable: true,
  })
  fromMoneyTypeName: string | null;

  @Column({
    name: 'to_money_type_id',
    type: 'int',
    comment: 'ประเภทเงินปลายทาง (ผู้ยืม)',
  })
  toMoneyTypeId: number;
  @Column({
    name: 'to_money_type_name',
    type: 'varchar',
    length: 200,
    nullable: true,
  })
  toMoneyTypeName: string | null;

  @Column({ type: 'float', default: 0 }) amount: number;

  @Column({ name: 'borrow_date', type: 'date', nullable: true })
  borrowDate: string | null;
  @Column({ name: 'repay_date', type: 'date', nullable: true })
  repayDate: string | null;

  @Column({ type: 'text', nullable: true, comment: 'วัตถุประสงค์' })
  purpose: string | null;

  @Column({
    type: 'int',
    default: 1,
    comment: '1=ค้างคืน|2=คืนแล้ว|3=ยกเลิก',
  })
  status: number;

  /** FT ที่สร้างคู่กัน (โอนออกจากต้นทาง / โอนเข้าปลายทาง) สำหรับ reversal */
  @Column({ name: 'ft_out_id', type: 'int', nullable: true }) ftOutId:
    | number
    | null;
  @Column({ name: 'ft_in_id', type: 'int', nullable: true }) ftInId:
    | number
    | null;

  @Column({ type: 'text', nullable: true }) note: string | null;
  @Column({ name: 'up_by', type: 'int', default: 0 }) upBy: number;
  @Column({ type: 'int', default: 0 }) del: number;

  @CreateDateColumn({ name: 'create_date', type: 'datetime', nullable: true })
  createDate: Date | null;
  @UpdateDateColumn({ name: 'update_date', type: 'datetime', nullable: true })
  updateDate: Date | null;
}
