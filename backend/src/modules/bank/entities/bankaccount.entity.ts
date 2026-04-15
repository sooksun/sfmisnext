import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('bankaccount')
export class BankAccount {
  @PrimaryGeneratedColumn({ name: 'ba_id' })
  baId: number;

  @Column({ name: 'b_id', type: 'int' })
  bId: number;

  @Column({ name: 'ba_name', type: 'varchar', length: 255 })
  baName: string;

  @Column({ name: 'ba_no', type: 'varchar', length: 20 })
  baNo: string;

  @Column({ name: 'sc_id', type: 'int' })
  scId: number;

  @Column({ name: 'up_by', type: 'int', nullable: true })
  upBy: number | null;

  @Column({ type: 'int', default: 0 })
  del: number;

  @CreateDateColumn({ name: 'create_date', type: 'datetime', nullable: true })
  createDate: Date | null;

  @UpdateDateColumn({ name: 'update_date', type: 'datetime', nullable: true })
  updateDate: Date | null;
}
