import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('tb_type_supplies')
export class TypeSupplies {
  @PrimaryGeneratedColumn({ name: 'ts_id' })
  tsId: number;

  @Column({ name: 'ts_name', type: 'varchar', length: 250 })
  tsName: string;

  @Column({ name: 'sc_id', type: 'int', nullable: true })
  scId: number;

  @Column({ type: 'int', default: 0 })
  del: number; // 0 = active, 1 = delete

  @Column({ name: 'up_by', type: 'int', nullable: true })
  upBy: number;

  @CreateDateColumn({ name: 'create_date', type: 'datetime', nullable: true })
  createDate: Date;

  @UpdateDateColumn({ name: 'update_date', type: 'datetime', nullable: true })
  updateDate: Date;
}
