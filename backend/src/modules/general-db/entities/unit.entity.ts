import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('tb_unit')
export class Unit {
  @PrimaryGeneratedColumn({ name: 'un_id' })
  unId: number;

  @Column({ name: 'un_name', type: 'varchar', length: 250, nullable: true })
  unName: string;

  @Column({ name: 'sc_id', type: 'int', nullable: true })
  scId: number;

  @Column({ name: 'u_status', type: 'int', default: 1 })
  uStatus: number; // 0 = delete, 1 = active

  @Column({ name: 'up_by', type: 'int', default: 0 })
  upBy: number;

  @CreateDateColumn({ name: 'create_date', type: 'datetime', nullable: true })
  createDate: Date;

  @UpdateDateColumn({ name: 'update_date', type: 'datetime', nullable: true })
  updateDate: Date;
}
