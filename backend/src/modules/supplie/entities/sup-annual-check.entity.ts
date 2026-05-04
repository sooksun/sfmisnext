import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Index(['scId', 'acadYear', 'del'])
@Entity('sup_annual_check')
export class SupAnnualCheck {
  @PrimaryGeneratedColumn({ name: 'ac_id' })
  acId: number;

  @Column({ name: 'sc_id', type: 'int', nullable: true })
  scId: number | null;

  @Column({ name: 'acad_year', type: 'int', nullable: true })
  acadYear: number | null;

  @Column({ name: 'supp_id', type: 'int', nullable: true })
  suppId: number | null;

  @Column({ name: 'expected_qty', type: 'int', default: 0 })
  expectedQty: number;

  @Column({ name: 'actual_qty', type: 'int', default: 0 })
  actualQty: number;

  @Column({ name: 'diff_qty', type: 'int', default: 0 })
  diffQty: number;

  @Column({
    type: 'int',
    default: 1,
    comment: '1=ปกติ 2=ขาด 3=เกิน 4=ชำรุด',
  })
  status: number;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @Column({ name: 'checker_id', type: 'int', nullable: true })
  checkerId: number | null;

  @Column({ name: 'check_date', type: 'date', nullable: true })
  checkDate: Date | null;

  @Column({ name: 'up_by', type: 'int', default: 0 })
  upBy: number;

  @Column({ type: 'int', default: 0 })
  del: number;

  @CreateDateColumn({ name: 'create_date', type: 'datetime', nullable: true })
  createDate: Date | null;

  @UpdateDateColumn({ name: 'update_date', type: 'datetime', nullable: true })
  updateDate: Date | null;
}
