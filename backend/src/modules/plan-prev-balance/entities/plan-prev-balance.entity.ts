import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * เงินเหลือจ่ายปีเก่า (ฝั่งงานนโยบายและแผน — Pool 1)
 * นำยอดคงเหลือ ณ 30 ก.ย. ของปีงบก่อน (อ้างอิงจาก fiscal_year_balance ฝั่งการเงิน)
 * เข้ามารวมในก้อนวงเงินวางแผนของปีนี้ แยกตามประเภทเงิน
 * เก็บแยกเป็นข้อมูลของแผนเอง (แก้ไข/ยืนยันได้) ไม่แตะข้อมูลฝั่งการเงิน
 *
 * ระเบียบ: เงินอุดหนุนต้องใช้ภายใน 2 ปีงบประมาณ
 *   usable_until_year = source_budget_year + 1 (คำนวณใน service)
 */
@Index(['scId', 'syId', 'del'])
@Entity('pln_prev_balance')
export class PlanPrevBalance {
  @PrimaryGeneratedColumn({ name: 'ppb_id' }) ppbId: number;
  @Column({ name: 'sc_id', type: 'int', default: 0 }) scId: number;
  @Column({ name: 'sy_id', type: 'int', default: 0 }) syId: number;

  /** ปีงบที่นำเงินเข้ามาวางแผน เช่น '2569' */
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

  /** ปีที่มาของเงิน (default = budget_year - 1) ใช้คำนวณอายุตามกฎ 2 ปีงบ */
  @Column({
    name: 'source_budget_year',
    type: 'varchar',
    length: 10,
    nullable: true,
  })
  sourceBudgetYear: string | null;

  /** ยอดที่นำมาวางแผน (แก้ไขได้) */
  @Column({ name: 'amount', type: 'float', default: 0 }) amount: number;

  /** snapshot ยอดที่การเงินรายงาน (fiscal_year_balance.total_balance) ไว้เทียบ diff */
  @Column({ name: 'finance_amount', type: 'float', nullable: true })
  financeAmount: number | null;

  /** แผนยืนยันนำเข้าแล้ว */
  @Column({ name: 'is_confirmed', type: 'tinyint', default: 0 })
  isConfirmed: number;

  @Column({ type: 'text', nullable: true }) remark: string | null;
  @Column({ name: 'up_by', type: 'int', default: 0 }) upBy: number;
  @Column({ type: 'int', default: 0 }) del: number;

  @CreateDateColumn({ name: 'create_date', type: 'datetime', nullable: true })
  createDate: Date | null;
  @UpdateDateColumn({ name: 'update_date', type: 'datetime', nullable: true })
  updateDate: Date | null;
}
