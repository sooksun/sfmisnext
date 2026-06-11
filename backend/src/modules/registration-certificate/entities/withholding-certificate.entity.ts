import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Index(['scId', 'syId', 'del'])
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

  // การนำส่งภาษีหัก ณ ที่จ่าย ให้สรรพากร (แบบ 2544 ข้อ 3.5)
  @Column({ name: 'remit_date', type: 'date', nullable: true })
  remitDate: Date | null;
  // ช่องทางนำส่ง: 1 = ยื่นในท้องที่ (ภายใน 7 วัน) | 2 = ออนไลน์ (ภายใน 15 วัน)
  @Column({ name: 'remit_channel', type: 'int', nullable: true })
  remitChannel: number | null;

  @Column({ type: 'int', default: 0 })
  del: number;

  @Column({ name: 'up_by', type: 'int', default: 0 })
  upBy: number;

  @CreateDateColumn({ name: 'create_date', type: 'datetime', nullable: true })
  createDate: Date | null;

  @UpdateDateColumn({ name: 'update_date', type: 'datetime', nullable: true })
  updateDate: Date | null;
}
