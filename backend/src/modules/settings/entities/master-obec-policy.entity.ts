import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('master_obec_policy')
export class MasterObecPolicy {
  @PrimaryGeneratedColumn({ name: 'id' })
  id: number;

  @Column({ name: 'obec_policy', type: 'varchar', length: 255 })
  obecPolicy: string;

  @Column({ type: 'text', nullable: true })
  detail: string | null;

  @Column({ name: 'up_by', type: 'int', nullable: true })
  upBy: number | null;

  @Column({ type: 'int', default: 0 })
  del: number;

  @CreateDateColumn({ name: 'create_date', type: 'datetime', nullable: true })
  createDate: Date;

  @UpdateDateColumn({ name: 'update_date', type: 'datetime', nullable: true })
  updateDate: Date;
}
