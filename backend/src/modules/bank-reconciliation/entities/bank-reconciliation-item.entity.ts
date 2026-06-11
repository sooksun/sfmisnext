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
   * ประเภทรายการปรับปรุง (ปรับ "ฝั่งธนาคาร" ตามแบบงบพิสูจน์ยอดเงินฝากธนาคาร):
   * 1 = เช็คค้างขึ้น (outstanding check) — หักจากยอดธนาคาร
   * 2 = เงินฝากระหว่างทาง (deposit-in-transit) — บวกยอดธนาคาร
   * 3 = รายการอื่น — บวกยอดธนาคาร
   */
  @Column({
    name: 'item_type',
    type: 'int',
    default: 1,
    comment:
      '1=เช็คค้างขึ้น(หักธนาคาร)|2=เงินฝากระหว่างทาง(บวกธนาคาร)|3=อื่น(บวกธนาคาร)',
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
  /** จำนวนเงิน (เก็บเป็นค่าบวกเสมอ) — ทิศทางหัก/บวกกำหนดโดย item_type */
  @Column({ type: 'float', default: 0 }) amount: number;

  @Column({ name: 'up_by', type: 'int', default: 0 }) upBy: number;
  @Column({ type: 'int', default: 0 }) del: number;

  @CreateDateColumn({ name: 'create_date', type: 'datetime', nullable: true })
  createDate: Date | null;
  @UpdateDateColumn({ name: 'update_date', type: 'datetime', nullable: true })
  updateDate: Date | null;
}
