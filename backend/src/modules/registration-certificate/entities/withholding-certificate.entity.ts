import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('withholding_certificate')
export class WithholdingCertificate {
  @PrimaryGeneratedColumn({ name: 'wc_id' })
  wcId: number;

  @Column({ name: 'wc_no', type: 'varchar', length: 45, nullable: true })
  wcNo: string | null;

  @Column({ name: 'of_id', type: 'int', default: 0 })
  ofId: number;

  @Column({ name: 'sc_id', type: 'int', default: 0 })
  scId: number;

  @Column({ name: 'wc_rank', type: 'int', nullable: true })
  wcRank: number | null;

  @Column({ name: 'cer_date', type: 'date', nullable: true })
  cerDate: Date | null;

  @Column({ name: 'sy_id', type: 'int', default: 0 })
  syId: number;

  @Column({ type: 'varchar', length: 45, nullable: true })
  year: string | null;

  @Column({ type: 'int', default: 100 })
  status: number; // 100 = กำลังทำ, 101 = ออกหนังสือรับรอง

  @Column({ type: 'int', default: 0 })
  del: number;

  @Column({ name: 'up_by', type: 'int', default: 0 })
  upBy: number;

  @CreateDateColumn({ name: 'create_date', type: 'datetime', nullable: true })
  createDate: Date | null;

  @UpdateDateColumn({ name: 'update_date', type: 'datetime', nullable: true })
  updateDate: Date | null;
}
