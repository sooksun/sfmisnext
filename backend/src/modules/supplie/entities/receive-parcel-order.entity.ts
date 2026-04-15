import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('receive_parcel_order')
export class ReceiveParcelOrder {
  @PrimaryGeneratedColumn({ name: 'receive_id' })
  receiveId: number;

  @Column({ name: 'admin_id', type: 'int', nullable: true })
  adminId: number | null;

  @Column({ name: 'agent_admin_id', type: 'int', default: 0 })
  agentAdminId: number;

  @Column({
    name: 'user_pacel_id',
    type: 'int',
    default: 0,
    comment: 'เจ้าหน้าที่พัสดุ',
  })
  userPacelId: number;

  @Column({ name: 'sc_id', type: 'int', nullable: true })
  scId: number | null;

  @Column({ name: 'order_id', type: 'int', default: 0 })
  orderId: number;

  @Column({ name: 'sy_year', type: 'int', default: 0 })
  syYear: number;

  @Column({ name: 'title', type: 'varchar', length: 255, nullable: true })
  title: string | null;

  @Column({ type: 'int', default: 0 })
  del: number;

  @Column({ name: 'receive_date', type: 'date', nullable: true })
  receiveDate: Date | null;

  @Column({ name: 'receive_status', type: 'int', nullable: true })
  receiveStatus: number | null;

  @CreateDateColumn({ name: 'create_date', type: 'datetime', nullable: true })
  createDate: Date | null;

  @UpdateDateColumn({ name: 'update_date', type: 'datetime', nullable: true })
  updateDate: Date | null;
}
