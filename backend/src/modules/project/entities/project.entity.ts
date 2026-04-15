import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('pln_project')
export class Project {
  @PrimaryGeneratedColumn({ name: 'proj_id' })
  projId: number;

  @Column({ name: 'proj_name', type: 'varchar', length: 255 })
  projName: string;

  @Column({ name: 'proj_detail', type: 'text', nullable: true })
  projDetail: string | null;

  @Column({
    name: 'proj_budget',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  projBudget: number;

  @Column({ name: 'pbc_id', type: 'int', nullable: true })
  pbcId: number | null;

  @Column({ name: 'sc_id', type: 'int', nullable: true })
  scId: number | null;

  @Column({ name: 'sy_id', type: 'int', nullable: true })
  syId: number | null;

  @Column({ name: 'up_by', type: 'int', nullable: true })
  upBy: number | null;

  @Column({ name: 'proj_status', type: 'int', default: 0 })
  projStatus: number;

  @Column({ type: 'int', default: 0 })
  del: number;

  @CreateDateColumn({ name: 'create_date', nullable: true })
  createDate: Date;

  @UpdateDateColumn({ name: 'update_date', nullable: true })
  updateDate: Date;
}
