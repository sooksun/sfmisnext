import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('master_cb_level')
export class MasterCbLevel {
  @PrimaryGeneratedColumn({ name: 'cb_id' })
  cbId: number;

  @Column({ name: 'level_name', type: 'varchar', length: 100 })
  levelName: string;

  @Column({ name: 'budget_amount', type: 'decimal', precision: 15, scale: 2, default: 0 })
  budgetAmount: number;

  @Column({ type: 'int', default: 0 })
  del: number;

  @Column({ name: 'up_by', type: 'int', nullable: true })
  upBy: number | null;

  @CreateDateColumn({ name: 'create_date', type: 'datetime', nullable: true })
  createDate: Date;

  @UpdateDateColumn({ name: 'update_date', type: 'datetime', nullable: true })
  updateDate: Date;
}
