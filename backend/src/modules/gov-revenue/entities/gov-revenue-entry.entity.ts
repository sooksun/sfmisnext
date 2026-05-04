import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * ทะเบียนคุมการรับและนำส่งเงินรายได้แผ่นดิน
 * ระเบียบกระทรวงการคลัง พ.ศ. 2562
 */
@Index(['scId', 'syId', 'del'])
@Entity('gov_revenue_entry')
export class GovRevenueEntry {
  @PrimaryGeneratedColumn({ name: 'gre_id' }) greId: number;
  @Column({ name: 'sc_id', type: 'int', default: 0 }) scId: number;
  @Column({ name: 'sy_id', type: 'int', default: 0 }) syId: number;
  @Column({ name: 'budget_year', type: 'varchar', length: 10, nullable: true })
  budgetYear: string | null;

  /**
   * ประเภทเงินรายได้แผ่นดิน:
   * 1 = ดอกเบี้ยเงินฝาก (เงินอุดหนุน)
   * 2 = ดอกเบี้ยเงินฝาก (เงินอาหารกลางวัน)
   * 3 = เงินอุดหนุนเหลือจ่ายเกิน 2 ปีงบประมาณ
   * 4 = ค่าขายพัสดุชำรุด/ค่าธรรมเนียม/รายได้อื่น
   */
  @Column({
    name: 'revenue_type',
    type: 'int',
    default: 1,
    comment:
      '1=ดอกเบี้ยอุดหนุน|2=ดอกเบี้ยอาหาร|3=เหลือจ่าย2ปี|4=ค่าธรรมเนียม/อื่น',
  })
  revenueType: number;

  /**
   * ประเภทรายการ: 1 = รับเข้า, 2 = นำส่ง (remit to treasury)
   */
  @Column({
    name: 'entry_type',
    type: 'int',
    default: 1,
    comment: '1=รับเข้า|2=นำส่งคลัง',
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
  @Column({ name: 'doc_date', type: 'date', nullable: true }) docDate:
    | string
    | null;
  @Column({ type: 'text', nullable: true, comment: 'รายการ' }) detail:
    | string
    | null;
  @Column({ type: 'float', default: 0, comment: 'จำนวนเงิน' }) amount: number;
  @Column({ type: 'text', nullable: true }) note: string | null;

  @Column({ name: 'up_by', type: 'int', default: 0 }) upBy: number;
  @Column({ type: 'int', default: 0 }) del: number;

  @CreateDateColumn({ name: 'create_date', type: 'datetime', nullable: true })
  createDate: Date | null;
  @UpdateDateColumn({ name: 'update_date', type: 'datetime', nullable: true })
  updateDate: Date | null;
}
