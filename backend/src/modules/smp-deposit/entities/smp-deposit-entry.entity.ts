import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * สมุดคู่ฝากส่วนราชการผู้เบิก
 * บันทึกการรับ-จ่ายเงินงบประมาณผ่านสำนักงานเขตพื้นที่การศึกษา (สพป.)
 */
@Index(['scId', 'syId', 'del'])
@Entity('smp_deposit_entry')
export class SmpDepositEntry {
  @PrimaryGeneratedColumn({ name: 'sde_id' }) sdeId: number;
  @Column({ name: 'sc_id', type: 'int', default: 0 }) scId: number;
  @Column({ name: 'sy_id', type: 'int', default: 0 }) syId: number;
  @Column({ name: 'budget_year', type: 'varchar', length: 10, nullable: true })
  budgetYear: string | null;

  /**
   * ประเภทรายการ:
   * 1 = ฝาก (สพป. โอนเงินงบประมาณให้โรงเรียน)
   * 2 = ถอน (โรงเรียนคืนเงินงบประมาณให้ สพป.)
   */
  @Column({
    name: 'entry_type',
    type: 'int',
    default: 1,
    comment: '1=ฝาก(รับจากสพป.)|2=ถอน(คืนสพป.)',
  })
  entryType: number;

  @Column({
    name: 'doc_no',
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: 'เลขที่เอกสาร/เลขที่ใบนำฝาก',
  })
  docNo: string | null;
  @Column({ name: 'doc_date', type: 'date', nullable: true }) docDate:
    | string
    | null;
  @Column({ type: 'text', nullable: true, comment: 'รายการ' }) detail:
    | string
    | null;
  @Column({ type: 'float', default: 0 }) amount: number;
  @Column({
    name: 'money_type_id',
    type: 'int',
    nullable: true,
    comment: 'ประเภทเงิน (bg_type_id)',
  })
  moneyTypeId: number | null;
  @Column({
    name: 'money_type_name',
    type: 'varchar',
    length: 200,
    nullable: true,
    comment: 'snapshot ชื่อประเภทเงิน',
  })
  moneyTypeName: string | null;
  @Column({ type: 'text', nullable: true }) note: string | null;
  @Column({ name: 'up_by', type: 'int', default: 0 }) upBy: number;
  @Column({ type: 'int', default: 0 }) del: number;

  @CreateDateColumn({ name: 'create_date', type: 'datetime', nullable: true })
  createDate: Date | null;
  @UpdateDateColumn({ name: 'update_date', type: 'datetime', nullable: true })
  updateDate: Date | null;
}
