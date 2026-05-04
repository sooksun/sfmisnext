import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * ยอดยกมาต้นปีงบประมาณ (Fiscal Year Carry Forward)
 * snapshot ณ วันที่ 30 กันยายน ของปีงบประมาณที่สิ้นสุด
 * เพื่อใช้เป็น "ยอดยกมา" ของทะเบียนคุมในปีถัดไป
 */
@Index(['scId', 'del'])
@Entity('fiscal_year_balance')
export class FiscalYearBalance {
  @PrimaryGeneratedColumn({ name: 'fyb_id' }) fybId: number;
  @Column({ name: 'sc_id', type: 'int', default: 0 }) scId: number;

  /** ปีงบประมาณที่ปิด เช่น '2568' */
  @Column({ name: 'budget_year', type: 'varchar', length: 10, nullable: true })
  budgetYear: string | null;

  @Column({ name: 'money_type_id', type: 'int', default: 0 })
  moneyTypeId: number;
  @Column({
    name: 'money_type_name',
    type: 'varchar',
    length: 200,
    nullable: true,
    comment: 'snapshot ชื่อประเภทเงิน',
  })
  moneyTypeName: string | null;

  /** ยอดเงินสด ณ สิ้นปี */
  @Column({ name: 'cash_balance', type: 'float', default: 0 })
  cashBalance: number;
  /** ยอดเงินฝากธนาคาร ณ สิ้นปี */
  @Column({ name: 'bank_balance', type: 'float', default: 0 })
  bankBalance: number;
  /** ยอดเงินฝากส่วนราชการผู้เบิก (สมุดคู่ฝาก) ณ สิ้นปี */
  @Column({ name: 'smp_balance', type: 'float', default: 0 })
  smpBalance: number;
  /** รวมทั้งหมด */
  @Column({ name: 'total_balance', type: 'float', default: 0 })
  totalBalance: number;

  @Column({
    name: 'closing_date',
    type: 'date',
    nullable: true,
    comment: 'วันที่ปิดปีงบประมาณ',
  })
  closingDate: string | null;
  @Column({ name: 'closed_by', type: 'int', nullable: true }) closedBy:
    | number
    | null;
  @Column({
    name: 'closed_by_name',
    type: 'varchar',
    length: 200,
    nullable: true,
  })
  closedByName: string | null;

  /** ผอ. ยืนยันและลงนามแล้ว */
  @Column({ name: 'is_final', type: 'tinyint', default: 0 }) isFinal: number;

  @Column({ type: 'text', nullable: true }) note: string | null;
  @Column({ name: 'up_by', type: 'int', default: 0 }) upBy: number;
  @Column({ type: 'int', default: 0 }) del: number;

  @CreateDateColumn({ name: 'create_date', type: 'datetime', nullable: true })
  createDate: Date | null;
  @UpdateDateColumn({ name: 'update_date', type: 'datetime', nullable: true })
  updateDate: Date | null;
}
