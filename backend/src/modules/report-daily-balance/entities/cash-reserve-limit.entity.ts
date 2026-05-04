import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * ตารางกำหนดวงเงินสำรองจ่าย (เงินในมือ)
 * ตามระเบียบกระทรวงการคลัง: เงินในมือห้ามเกิน 15,000 บาท
 * (ปรับได้ตามขนาดโรงเรียน)
 */
@Entity('cash_reserve_limit')
export class CashReserveLimit {
  @PrimaryGeneratedColumn({ name: 'crl_id' })
  crlId: number;

  @Column({ name: 'sc_id', type: 'int', unique: true })
  scId: number;

  @Column({
    name: 'limit_amount',
    type: 'float',
    default: 15000,
    comment: 'วงเงินสำรองจ่ายสูงสุด (บาท)',
  })
  limitAmount: number;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'หมายเหตุ / อ้างอิงระเบียบ',
  })
  note: string | null;

  @Column({ name: 'up_by', type: 'int', default: 0 })
  upBy: number;

  @CreateDateColumn({ name: 'create_date', type: 'datetime', nullable: true })
  createDate: Date | null;

  @UpdateDateColumn({ name: 'update_date', type: 'datetime', nullable: true })
  updateDate: Date | null;
}
