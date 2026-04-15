import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('receipt')
export class Receipt {
  @PrimaryGeneratedColumn({ name: 'r_id' })
  rId: number;

  @Column({ name: 'r_no', type: 'varchar', length: 45, nullable: true })
  rNo: string | null;

  @Column({ type: 'text', nullable: true })
  detail: string | null;

  @Column({ name: 'pr_id', type: 'varchar', length: 45, default: '0' })
  prId: string;

  @Column({ name: 'date_generate', type: 'date', nullable: true })
  dateGenerate: Date | null;

  @Column({
    type: 'varchar',
    length: 45,
    default: '1',
    comment: '0 = cancel | 1 = active',
  })
  status: string;

  @Column({ name: 'sy_id', type: 'int', default: 0 })
  syId: number;

  @Column({ type: 'varchar', length: 45, nullable: true })
  year: string | null;

  @Column({ name: 'sc_id', type: 'int', default: 0 })
  scId: number;

  @Column({ name: 'up_by', type: 'int', default: 0 })
  upBy: number;

  @CreateDateColumn({ name: 'create_date', type: 'datetime', nullable: true })
  createDate: Date | null;

  @UpdateDateColumn({ name: 'update_date', type: 'datetime', nullable: true })
  updateDate: Date | null;
}
