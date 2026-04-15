import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('master_moe_policy')
export class MasterMoePolicy {
  @PrimaryGeneratedColumn({ name: 'moe_policy_id' })
  moePolicyId: number;

  @Column({ name: 'policy_name', type: 'varchar', length: 255 })
  policyName: string;

  @Column({ name: 'policy_detail', type: 'text', nullable: true })
  policyDetail: string | null;

  @Column({ type: 'int', default: 0 })
  del: number;

  @Column({ name: 'up_by', type: 'int', nullable: true })
  upBy: number | null;

  @CreateDateColumn({ name: 'create_date', type: 'datetime', nullable: true })
  createDate: Date;

  @UpdateDateColumn({ name: 'update_date', type: 'datetime', nullable: true })
  updateDate: Date;
}
