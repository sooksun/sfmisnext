import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * ตารางเชื่อม โครงการ ↔ นโยบายโรงเรียน (master_sc_policy)
 * 1 โครงการสอดคล้องกับนโยบายโรงเรียนได้หลายข้อ
 */
@Index(['projectId', 'del'])
@Index(['scId', 'scpId', 'del'])
@Entity('pln_project_policy')
export class ProjectPolicy {
  @PrimaryGeneratedColumn({ name: 'pp_id' })
  ppId: number;

  @Column({ name: 'project_id', type: 'int' })
  projectId: number;

  /** master_sc_policy.scp_id */
  @Column({ name: 'scp_id', type: 'int' })
  scpId: number;

  /** snapshot ชื่อนโยบาย (master_sc_policy.sc_policy) */
  @Column({ name: 'policy_name', type: 'varchar', length: 255, nullable: true })
  policyName: string | null;

  @Column({ name: 'sc_id', type: 'int' })
  scId: number;

  @Column({ type: 'int', default: 0 })
  del: number;

  @CreateDateColumn({ name: 'create_date', type: 'datetime', nullable: true })
  createDate: Date | null;

  @UpdateDateColumn({ name: 'update_date', type: 'datetime', nullable: true })
  updateDate: Date | null;
}
