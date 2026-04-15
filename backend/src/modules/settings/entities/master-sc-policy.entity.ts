import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('master_sc_policy')
export class MasterScPolicy {
  @PrimaryGeneratedColumn({ name: 'scp_id' })
  scpId: number;

  @Column({ name: 'sc_id', type: 'int', default: 0 })
  scId: number;

  @Column({ name: 'sc_policy', type: 'varchar', length: 255 })
  scPolicy: string;

  @Column({ type: 'int', default: 0 })
  del: number;

  @Column({ name: 'up_by', type: 'int', nullable: true })
  upBy: number | null;

  @CreateDateColumn({ name: 'create_date', type: 'datetime', nullable: true })
  createDate: Date;

  @UpdateDateColumn({ name: 'update_date', type: 'datetime', nullable: true })
  updateDate: Date;
}
