import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * รายการปรับปรุงงบเทียบยอด
 */
@Entity('bank_reconciliation_item')
export class BankReconciliationItem {
  @PrimaryGeneratedColumn({ name: 'bri_id' }) briId: number;
  @Column({
    name: 'br_id',
    type: 'int',
    default: 0,
    comment: 'FK bank_reconciliation.br_id',
  })
  brId: number;

  /**
   * ประเภทรายการปรับปรุง:
   * 1 = เช็คค้างขึ้น (outstanding check) — หักจากยอดสมุด
   * 2 = เงินฝากระหว่างทาง (deposit-in-transit) — บวกยอดสมุด
   * 3 = รายการอื่น
   */
  @Column({
    name: 'item_type',
    type: 'int',
    default: 1,
    comment: '1=เช็คค้างขึ้น|2=เงินฝากระหว่างทาง|3=อื่น',
  })
  itemType: number;
  @Column({
    name: 'doc_ref',
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: 'เลขที่เช็ค/เอกสาร',
  })
  docRef: string | null;
  @Column({ type: 'text', nullable: true }) detail: string | null;
  /** จำนวนเงิน — ค่าบวก = บวกเพิ่ม, ค่าลบ = หักออก */
  @Column({ type: 'float', default: 0 }) amount: number;

  @Column({ name: 'up_by', type: 'int', default: 0 }) upBy: number;
  @Column({ type: 'int', default: 0 }) del: number;

  @CreateDateColumn({ name: 'create_date', type: 'datetime', nullable: true })
  createDate: Date | null;
  @UpdateDateColumn({ name: 'update_date', type: 'datetime', nullable: true })
  updateDate: Date | null;
}
