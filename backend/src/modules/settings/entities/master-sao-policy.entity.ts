import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('master_sao_policy')
export class MasterSaoPolicy {
  @PrimaryGeneratedColumn({ name: 'sao_policy_id' })
  saoPolicyId: number;

  @Column({ name: 'sao_policy_name', type: 'varchar', length: 255 })
  saoPolicyName: string;

  @Column({ type: 'int', default: 0 })
  del: number;

  @Column({ name: 'up_by', type: 'int', nullable: true })
  upBy: number | null;

  @CreateDateColumn({ name: 'create_date', type: 'datetime', nullable: true })
  createDate: Date;

  @UpdateDateColumn({ name: 'update_date', type: 'datetime', nullable: true })
  updateDate: Date;
}
