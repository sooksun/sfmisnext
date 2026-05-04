import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Index(['ctId', 'del'])
@Entity('sup_contract_penalty')
export class ContractPenalty {
  @PrimaryGeneratedColumn({ name: 'cp_id' })
  cpId: number;

  @Column({ name: 'ct_id', type: 'int' })
  ctId: number;

  @Column({ name: 'sc_id', type: 'int' })
  scId: number;

  @Column({ name: 'due_date', type: 'date', comment: 'วันครบกำหนดส่งมอบ' })
  dueDate: string;

  @Column({ name: 'actual_delivery_date', type: 'date' })
  actualDeliveryDate: string;

  @Column({ name: 'days_late', type: 'int', default: 0 })
  daysLate: number;

  @Column({
    name: 'contract_amount',
    type: 'decimal',
    precision: 15,
    scale: 2,
    default: 0,
  })
  contractAmount: number;

  @Column({
    name: 'daily_rate_percent',
    type: 'decimal',
    precision: 5,
    scale: 4,
    default: 0.1,
    comment: '% ต่อวัน ตามระเบียบ = 0.1 (อย่างต่ำ 100 บาท/วัน)',
  })
  dailyRatePercent: number;

  @Column({
    name: 'penalty_amount',
    type: 'decimal',
    precision: 15,
    scale: 2,
    default: 0,
  })
  penaltyAmount: number;

  @Column({
    name: 'status',
    type: 'tinyint',
    default: 1,
    comment: '1=คำนวณ 2=เรียกเก็บ 3=รับชำระ 4=ยกเว้น 9=ยกเลิก',
  })
  status: number;

  @Column({ name: 'collected_date', type: 'date', nullable: true })
  collectedDate: string | null;

  @Column({ name: 'waived_reason', type: 'text', nullable: true })
  waivedReason: string | null;

  @Column({ name: 'note', type: 'text', nullable: true })
  note: string | null;

  @Column({ name: 'up_by', type: 'int', nullable: true })
  upBy: number | null;

  @Column({ type: 'int', default: 0 })
  del: number;

  @CreateDateColumn({ name: 'create_date', type: 'datetime', nullable: true })
  createDate: Date | null;
}
