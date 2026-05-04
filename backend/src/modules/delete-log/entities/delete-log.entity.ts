import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('tb_delete_log')
@Index(['table_name', 'row_id'])
export class DeleteLog {
  @PrimaryGeneratedColumn()
  log_id: number;

  @Column({ length: 100 })
  table_name: string;

  @Column()
  row_id: number;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ type: 'longtext', nullable: true })
  snapshot: string | null;

  @Column({ nullable: true, type: 'int' })
  sc_id: number | null;

  @Column({ length: 100, nullable: true })
  deleted_by: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  deleted_at: Date;
}
