import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('master_quick_win')
export class MasterQuickWin {
  @PrimaryGeneratedColumn({ name: 'qw_id' })
  qwId: number;

  @Column({ name: 'qw_name', type: 'varchar', length: 255 })
  qwName: string;

  @Column({ name: 'qw_detail', type: 'text', nullable: true })
  qwDetail: string | null;

  @Column({ type: 'int', default: 0 })
  del: number;

  @Column({ name: 'up_by', type: 'int', nullable: true })
  upBy: number | null;

  @CreateDateColumn({ name: 'create_date', type: 'datetime', nullable: true })
  createDate: Date;

  @UpdateDateColumn({ name: 'update_date', type: 'datetime', nullable: true })
  updateDate: Date;
}
