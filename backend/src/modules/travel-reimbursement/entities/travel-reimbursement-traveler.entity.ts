import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * รายการค่าใช้จ่ายรายคน (แบบ 8708 ส่วนที่ 2)
 * 1 ใบเบิก (tr_id) มีผู้เดินทางได้หลายคน (กรณีเดินทางเป็นหมู่คณะ)
 */
@Index(['trId', 'del'])
@Entity('travel_reimbursement_traveler')
export class TravelReimbursementTraveler {
  @PrimaryGeneratedColumn({ name: 'trt_id' }) trtId: number;
  @Column({ name: 'tr_id', type: 'int', default: 0 }) trId: number;
  @Column({ type: 'int', default: 1, comment: 'ลำดับที่' }) seq: number;

  @Column({ type: 'varchar', length: 200, nullable: true }) name: string | null;
  @Column({ type: 'varchar', length: 200, nullable: true }) position: string | null;

  @Column({ type: 'float', default: 0, comment: 'ค่าเบี้ยเลี้ยง' }) allowance: number;
  @Column({ type: 'float', default: 0, comment: 'ค่าเช่าที่พัก' }) lodging: number;
  @Column({ type: 'float', default: 0, comment: 'ค่าพาหนะ' }) transport: number;
  @Column({ type: 'float', default: 0, comment: 'ค่าใช้จ่ายอื่น' }) other: number;
  @Column({ type: 'float', default: 0, comment: 'รวม' }) total: number;

  @Column({ type: 'text', nullable: true }) note: string | null;
  @Column({ type: 'int', default: 0 }) del: number;

  @CreateDateColumn({ name: 'create_date', type: 'datetime', nullable: true })
  createDate: Date | null;
}
