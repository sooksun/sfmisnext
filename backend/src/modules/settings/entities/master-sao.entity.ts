import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('master_sao')
export class MasterSao {
  @PrimaryGeneratedColumn({ name: 'sao_id' })
  saoId: number;

  @Column({ name: 'sao_name', type: 'varchar', length: 255 })
  saoName: string;

  @Column({ name: 'sao_group', type: 'varchar', length: 255, default: '' })
  saoGroup: string;

  @Column({ type: 'int', default: 0 })
  del: number;

  @Column({ name: 'up_by', type: 'int', nullable: true })
  upBy: number | null;

  @CreateDateColumn({ name: 'create_date', type: 'datetime', nullable: true })
  createDate: Date;

  @UpdateDateColumn({ name: 'update_date', type: 'datetime', nullable: true })
  updateDate: Date;
}
